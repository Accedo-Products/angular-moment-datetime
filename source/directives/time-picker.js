/* global angular, moment */

"use strict";

angular
    .module("vokal.timePicker", [])
    .directive("timePicker", timePicker);

timePicker.$inject = [
    '$log',
    '$compile',
    '$filter',
    '$document',
    '$timeout'
];

function timePicker($log, $compile, $filter, $document, $timeout) {

    var directive = {
        restrict: "A",
        scope: {
            model: "=ngModel",
            timezone: "="
        },
        require: "ngModel",
        link: linkFn
    };

    var defaultFormat = "h:mm a";
    var defaultDateStr = "1/1/1990" + " ";
    var hasWarnedTz = false;

    function warnTz() {

        if (!hasWarnedTz) {
            $log.warn("Trying to use timezones without including moment-timezone.");
            hasWarnedTz = true;
        }
    }

    function linkFn(scope, element, attrs, ngModelController) {

        init();

        function init() {

            if (attrs.timezone && !moment.tz) {
                warnTz();
            }

            createLocalMoment();
            watchAttrs();
            createTimes();
        }

        /**
         * Needed to not make other directives
         * bound to ngModel to interfere with the date
         * presented via this directive.
         */
        var localMoment;
        function createLocalMoment() {
            localMoment = moment.isMoment(scope.model) ?
                          scope.model.clone().startOf('minute') :
                          createNow().startOf('minute');
        }

        function createNow() {

            var timezone = getTimezone();

            return timezone ? moment().tz(timezone) : moment();
        }

        function getTimezone() {

            return scope.timezone || moment.tz.guess();
        }

        function getDateFormat() {

            return attrs.timePicker || defaultFormat;
        }

        function watchAttrs() {

            if (attrs.timezone) {

                var unWatcher = scope.$watch("timezone", function (newVal, oldVal) {

                    if (angular.equals(newVal, oldVal)) {
                        return;
                    }

                    localMoment = localMoment.clone().tz(newVal);
                    scope.model = localMoment.clone();
                });

                scope.$on('$destroy', function () {
                    unWatcher();
                });
            }
        }

        // Convert data from view to model format and validate
        ngModelController.$parsers.unshift(function timeStringParser(str) {

            var parsedMoment = moment(str, getDateFormat(), true);
            var isValid = parsedMoment.isValid();

            ngModelController.$setValidity("time", !str || isValid);

            // checkpoint & return the valid value
            if (isValid) {

                localMoment = localMoment.set({
                    'hours': parsedMoment.hours(),
                    'minutes': parsedMoment.minutes(),
                    'seconds': parsedMoment.seconds()
                }).clone();
            }

            return localMoment;
        });

        // Convert data from model to view format and validate
        ngModelController.$formatters.push(function timeMomentFormatter(modelMoment) {

            var isValid = moment.isMoment(modelMoment);

            ngModelController.$setValidity("time", !modelMoment || isValid);

            if (isValid) {

                localMoment = localMoment.set({
                    'date': modelMoment.date(),
                    'year': modelMoment.year(),
                    'month': modelMoment.month()
                }).clone();
            }

            return localMoment.format(getDateFormat());
        });

        function createTimes() {

            scope.times = [];
            scope.showTimepicker = false;

            var interval = attrs.pickerInterval ? parseInt(attrs.pickerInterval, 10) : 60;

            var workingTime, minute, formattedTime;

            // Build array of time objects by interval
            for (var i = 0; i < 24; i++) {
                for (var k = 0; k < 60; k += interval) {

                    minute = k < 10 ? "0" + k : k;
                    workingTime = new Date(defaultDateStr + i + ":" + minute);

                    scope.times.push({
                        display: moment(workingTime).format(getDateFormat()),
                        hours: i,
                        minutes: k
                    });
                }
            }
        }

        // Function to put selected time in the scope
        scope.applyTime = function (time) {

            // This assignment will trigger the formatter function
            scope.model = localMoment.set({
                'hours': time.hours,
                'minutes': time.minutes
            }).clone();

            ngModelController.$setDirty();
            hidePicker();
        };

        // Build picker template and register with the directive scope
        var template = angular.element('<ol class="v-time-picker" data-ng-show="showTimepicker">' + '<li data-ng-repeat="time in times" data-ng-click="applyTime( time )">' + "{{ time.display }}" + "</li>" + "</ol>");

        // TODO why compile all the time (in linkFn)?
        $compile(template)(scope);
        element.after(template);

        // Show the picker when clicking in the input
        element.on("click", showPicker);

        // Hide the picker when typing in the field
        element.on("keydown paste", hidePicker);
        scope.$on("$destroy", hidePicker);

        // Hide the picker when clicking away
        var handler = function handler(event) {

            if (!template[0].contains(event.target)) {
                scope.$apply(hidePicker);
            }
        };

        function showPicker() {

            if (scope.showTimepicker) {
                return;
            }

            scope.showTimepicker = true;
            $timeout(function () {
                $document.on("click touchstart", handler);
            }, 100);
        }

        function hidePicker() {

            $document.off("click touchstart", handler);
            scope.showTimepicker = false;
        }
    }

    return directive;
}