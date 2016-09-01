/* global angular, moment */

"use strict";

angular.module('vokal.datePicker', []).directive('datePicker', datePicker);

datePicker.$inject = ['$log', '$compile', '$document', '$timeout'];

/**
 * *indata*
 * The model value assigned to this directive must be a moment.
 * The timezone value is a timezone string. These are all defined in
 * 'moment.tz().names()'.
 *
 * *timezone*
 * The timezone parameters is not mandatory.
 * If it is not passed the moment is considered to be at a "guessed"
 * timezone. This means the browsers timezone is used.
 */
function datePicker($log, $compile, $document, $timeout) {

    var directive = {
        restrict: "A",
        scope: {
            model: "=ngModel",
            timezone: "=",
            minDate: "=",
            maxDate: "=",
            onChangeCallback: '&?'
        },
        require: "ngModel",
        link: linkFn
    };

    var firstDayOfWeek = moment().startOf('isoWeek').day();
    var defaultFormat = 'M/D/YYYY';
    var dayFormat = 'ddd';
    var monthNameFormat = "MMMM";
    var dateFormat = defaultFormat;

    var warnings = {
        'timezone': {
            message: 'Trying to use timezones without including moment-timezone.',
            validate: hasTz
        },
        'minDate': {
            message: 'The minDate must be a moment object.',
            validate: isMoment
        },
        'maxDate': {
            message: 'The maxDate must be a moment object.',
            validate: isMoment
        }
    };

    function makeDayNames() {

        var dayNames = [];
        var weekDay = moment().startOf('isoWeek');

        for (var i = 0; i < 7; i++) {
            dayNames.push(weekDay.format(dayFormat));
            weekDay.add(1, 'days');
        }

        return dayNames;
    }

    function isMoment(attr) {
        return !attr || attr && moment.isMoment(attr);
    }

    function hasTz(attr) {
        return !attr || attr && moment.tz;
    }

    function warn(attrName, attr) {

        var warning = warnings[attrName];

        if (!warning.warned) {
            warning.warned = true;

            if (!warning.validate(attr)) {
                $log.warn(warning.message);
            }
        }
    }

    function linkFn(scope, element, attrs, ngModelController) {

        init();

        function init() {

            validateAttrs();
            createLocalMoment();
            scope.showDatepicker = false;
            scope.dayNames = makeDayNames();
            defineNow();
            watchAttrs();
            dateFormat = attrs.datePicker ? attrs.datePicker : defaultFormat;
        }

        /**
         * Needed to not make other directives
         * bound to ngModel to interfere with the date
         * presented via this directive.
         */
        var localMoment;
        function createLocalMoment() {
            localMoment = moment.isMoment(scope.model) ? scope.model.clone().startOf('day') : createNow().startOf('day');
        }

        function defineNow() {

            var now = createNow();

            scope.dayNow = now.date();
            scope.monthNow = now.month();
            scope.yearNow = now.year();
        }

        function createNow() {

            var timezone = getTimezone();

            return timezone ? moment().tz(timezone) : moment();
        }

        function isToday(year, month, day) {

            return scope.dayNow === day && scope.monthNow === month && scope.yearNow === year;
        }

        function validateAttrs() {

            ['timezone', 'minDate', 'maxDate'].forEach(function (attrName) {
                warn(attrName, scope[attrName]);
            });
        }

        function updateMinMaxTimezone(tz) {

            if (scope.minDate && tz) {
                scope.minDate = scope.minDate.clone().tz(tz);
            }

            if (scope.maxDate && tz) {
                scope.maxDate = scope.maxDate.clone().tz(tz);
            }

            return {
                min: scope.minDate,
                max: scope.maxDate
            };
        }

        function getTimezone() {

            return scope.timezone || moment.tz.guess();
        }

        function updateModal(value) {

            scope.model = value.clone();
            ngModelController.$setDirty();

            $timeout(function () {
                scope.onChangeCallback({
                    'model': scope.model
                });
            }, 0, false);
        }

        function watchAttrs() {

            var unwatchers = [];

            if (attrs.timezone) {
                unwatchers.push(scope.$watch("timezone", function (newVal, oldVal) {

                    if (angular.equals(newVal, oldVal)) {
                        return;
                    }

                    // tz dependent stuff needs to update!
                    updateMinMaxTimezone(newVal);
                    defineNow();

                    localMoment = localMoment.clone().tz(newVal);
                    if (scope.model) {
                        updateModal(localMoment);
                    }

                    ngModelController.$setValidity("minDate", validateMin(scope.model, getMinDate()));
                    ngModelController.$setValidity("maxDate", validateMax(scope.model, getMaxDate()));
                }));
            }

            unwatchers.push(scope.$watch("minDate", function (newMinDate) {
                ngModelController.$setValidity("minDate", validateMin(scope.model, newMinDate));
            }));

            unwatchers.push(scope.$watch("maxDate", function (newMaxDate) {
                ngModelController.$setValidity("maxDate", validateMax(scope.model, newMaxDate));
            }));

            scope.$on('$destroy', function () {
                unwatchers.forEach(function (unwatcher) {
                    // stop watching
                    unwatcher();
                });
            });
        }

        // Convert data from view to model format and validate
        ngModelController.$parsers.unshift(function momentParser(str) {

            var parsedMoment = moment(str, dateFormat, true);
            var minMaxValid = validateMinMax(parsedMoment);
            var isValid = parsedMoment.isValid() && minMaxValid.isValid;

            updateValidity(!str || parsedMoment.isValid(), minMaxValid);

            if (isValid) {

                localMoment = localMoment.set({
                    'year': parsedMoment.year(),
                    'month': parsedMoment.month(),
                    'date': parsedMoment.date()
                }).clone();
            }

            return localMoment;
        });

        // Convert data from model to view format and validate
        ngModelController.$formatters.push(function momentFormatter(modelMoment) {

            if (!modelMoment) {
                return "";
            }

            var minMaxValid = validateMinMax(modelMoment);
            var dateIsValid = modelMoment && modelMoment.isValid();

            updateValidity(!modelMoment || dateIsValid, minMaxValid);

            if (dateIsValid) {

                localMoment = localMoment.set({
                    'year': modelMoment.year(),
                    'month': modelMoment.month(),
                    'date': modelMoment.date(),
                    'hours': modelMoment.hours(),
                    'minutes': modelMoment.minutes(),
                    'seconds': modelMoment.seconds()
                }).clone();
            }

            return localMoment.format(dateFormat);
        });

        function updateValidity(dateIsValid, minMaxValid) {

            ngModelController.$setValidity("maxDate", minMaxValid.maxIsValid);
            ngModelController.$setValidity("minDate", minMaxValid.minIsValid);
            ngModelController.$setValidity("date", dateIsValid);
        }

        function validateMinMax(currentDate) {

            var minDate = getMinDate();
            var maxDate = getMaxDate();

            var minIsValid = minDate ? validateMin(currentDate, minDate) : true;

            var maxIsValid = maxDate ? validateMax(currentDate, maxDate) : true;

            return {
                maxIsValid: maxIsValid,
                minIsValid: minIsValid,
                isValid: maxIsValid && minIsValid
            };
        }

        function validateMin(currentDate, minDate) {

            if (!currentDate || !currentDate.isValid() || !minDate || !minDate.isValid()) {

                return true;
            }

            return currentDate.isSameOrAfter(minDate, 'second');
        }

        function validateMax(currentDate, maxDate) {

            if (!currentDate || !currentDate.isValid() || !maxDate || !maxDate.isValid()) {

                return true;
            }

            return currentDate.isSameOrBefore(maxDate, 'second');
        }

        function getMinDate() {

            return scope.minDate ? scope.minDate.clone() : undefined;
        }

        function getMaxDate() {

            return scope.maxDate ? scope.maxDate.clone() : undefined;
        }

        // Build a month of days based on the date passed in
        scope.buildMonth = function (year, month) {

            var m = moment({
                year: year,
                month: month
            });

            scope.days = [];
            scope.filler = [];
            scope.year = year;
            scope.month = month;
            scope.monthName = m.format(monthNameFormat);

            scope.prevYear = month - 1 < 0 ? year - 1 : year;
            scope.nextYear = month + 1 > 11 ? year + 1 : year;
            scope.prevMonth = month - 1 < 0 ? 11 : month - 1;
            scope.nextMonth = month + 1 > 11 ? 0 : month + 1;

            var timezone = getTimezone();
            var daysInMonth = m.daysInMonth();

            for (var i = 1; i <= daysInMonth; i++) {

                var day = moment();
                day = timezone ? day.tz(timezone) : day;

                day.set({
                    'month': month,
                    'date': i,
                    'year': year
                });

                var max = getMaxDate() ? getMaxDate().endOf('day') : undefined;

                var min = getMinDate() ? getMinDate().startOf('day') : undefined;

                var disabled = !validateMax(day, max) || !validateMin(day, min);

                var selected = scope.model ? scope.model.isSame(day, 'day') : false;

                scope.days.push({
                    'number': i,
                    'disabled': disabled,
                    'class': {
                        'today': isToday(year, month, i),
                        'disabled': disabled,
                        'selected': selected
                    }
                });
            }

            var fillers = getFillerCount(m.day());
            for (var k = 0; k < fillers; k++) {
                scope.filler.push(k);
            }
        };

        // Adjust for first day of week setting
        function getFillerCount(weekDayOfFirstDayOfMonth) {

            var diff = weekDayOfFirstDayOfMonth - firstDayOfWeek;

            return diff < 0 ? 7 + diff : diff;
        }

        // The datepickers dates time might change from an external
        // place, such as the timepicker, then we can not simply maintain it

        // Function to put selected date in the scope
        scope.applyDate = function (month, day, year) {

            if (day.disabled) {
                return;
            }

            // This assignment will trigger the formatter function
            updateModal(localMoment.set({
                'month': month,
                'date': day.number,
                'year': year
            }));
            hidePicker();
        };

        // Build picker template and register with the directive scope
        var template = angular.element('<div class="v-date-picker" data-ng-show="showDatepicker">' + '<div class="month-name">{{ monthName }} {{ year }}</div>' + '<div class="month-prev" data-ng-click="buildMonth( prevYear, prevMonth )">&lt;</div>' + '<div class="month-next" data-ng-click="buildMonth( nextYear, nextMonth )">&gt;</div>' + '<div class="day-name-cell" data-ng-repeat="dayName in dayNames">{{ dayName }}</div>' + '<div class="filler-space" data-ng-repeat="space in filler"></div>' + '<div class="date-cell" ' + 'data-ng-class="day.class" ' + 'data-ng-disabled="day.disabled" ' + 'data-ng-repeat="day in days" ' + 'data-ng-click="applyDate( month, day, year )">' + '{{ day.number }}' + '</div>' + '</div>');

        // TODO why compile all the time (in linkFn)?
        $compile(template)(scope);
        element.after(template);

        // Show the picker when clicking in the input
        element.on("click", function () {

            if (!scope.showDatepicker) {

                var date = scope.model ? scope.model : localMoment;
                scope.buildMonth(date.year(), date.month());
                scope.showDatepicker = true;

                $timeout(function () {
                    $document.on("click touchstart", handler);
                }, 100);
            }
        });

        // Hide the picker when typing in the field
        element.on("keydown paste", hidePicker);
        scope.$on("$destroy", hidePicker);

        // Hide the picker when clicking away
        var handler = function handler(event) {

            if (!template[0].contains(event.target)) {
                scope.$apply(hidePicker);
            }
        };

        function hidePicker() {

            $document.off("click touchstart", handler);
            scope.showDatepicker = false;
        }
    }

    return directive;
}