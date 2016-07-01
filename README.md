# angular-datetime - moment opinionated

Basic moment date/time pickers for Angular.js.


#### Build
```
$ npm install
$ npm run build
```

Look in dist folder.

## Configuration & Usage

Both the date picker and the time picker require Moment as a dependency. Include `moment.js` prior to the following directive scripts.

### Date Picker

Add `dist/angular-date-picker.js` and `dist/angular-date-picker.css` to your project, and include `vokal.datePicker` in your module dependencies.

```html
<input type="text" data-ng-model="momentInstance" data-date-picker[="M/D/YYYY"]
    [data-timezone="tzName"]>
```

#### `date-picker`

By default the picker displays using the `M/D/YYYY` Moment date format. You can supply a value to change this to any other [supported format](http://momentjs.com/docs/#/displaying/format/). If you format your date in a fashion that `moment().format` doesn't understand, you will have... problems.

#### `timezone`

The date picker has optional support for timezones, provided by [moment-timezone](http://momentjs.com/timezone/). To use timezones, include `moment-timezone.js` and its necessary data after the `moment.js` script. If this attribute is included without `moment-timezone`, a warning will log and this attribute will be ignored.

Supported zones are limited to those identifiable to `moment-timezone`, which can be found by running `moment.tz.names()`. The attribute is watched and will update the input value on change. If the value is set to `null` or `undefined`, `moment-timezone` will [attempt to guess](http://momentjs.com/timezone/docs/#/using-timezones/guessing-user-timezone/) the local timezone.


### Time Picker

Add `dist/angular-time-picker.js` and `dist/angular-time-picker.css` to your project, and include `vokal.timePicker` in your module dependencies.

```html
<input type="text" data-ng-model="momentInstance" data-time-picker[="h:mm a"]
    [data-picker-interval="60"]
    [data-timezone="tzName"]>
```

#### `time-picker`

By default the picker displays using the `h:mm a` Moment time format. You can supply a value to change this to any other [supported format](http://momentjs.com/docs/#/displaying/format/). If you format your time in a fashion that `moment().format` doesn't understand, you will have, yes, problems.

#### `picker-interval`

By default the picker will display times on a 60-minute interval. This can be changed to any value between `1` and `60` to include more granular times. Intervals do not wrap around the hour, so a value of `45` will produce a list of times like `2:00`, `2:45`, `3:00`, rather than `2:00`, `2:45`, `3:30`.

#### `timezone`

The time picker has optional support for timezones, provided by [moment-timezone](http://momentjs.com/timezone/). To use timezones, include `moment-timezone.js` and its necessary data after the `moment.js` script. If this attribute is included without `moment-timezone`, a warning will log and this attribute will be ignored.

Supported zones are limited to those identifiable to `moment-timezone`, which can be found by running `moment.tz.names()`. The attribute is watched and will update the input value on change. If the value is set to `null` or `undefined`, `moment-timezone` will [attempt to guess](http://momentjs.com/timezone/docs/#/using-timezones/guessing-user-timezone/) the local timezone.

#### `first day of week`
The datepicker sets the first day of the week according to ISO 8601, 12:00 am.
