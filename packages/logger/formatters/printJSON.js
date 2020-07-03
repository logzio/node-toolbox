const stringify = require('json-stringify-safe');
const colorize = require('json-colorizer');
const chalk = require('chalk');

const _ = require('lodash');
const { colorByLevel } = require('../LogLevel');

function printJSON({ colorizeLog = false } = {}) {
  return function printJSONLog({ message, logLevel, timestamp, logzPrettyJSON, ...rest }) {
    if (_.isObject(message)) {
      rest = Object.assign(rest, message);
      message = '';
    }

    const keys = Object.keys(rest).length > 0;

    if (keys) rest = stringify(rest, null, logzPrettyJSON ? 4 : 0);

    if (colorizeLog)
      return `${colorByLevel(logLevel)}: ${chalk.blue(timestamp)} ${message ? message : ''}${
        keys ? ` ${colorize(rest)}` : ''
      }`;

    return `${logLevel}: [${timestamp}] ${message ? message : ''}${keys ? ` ${rest}` : ''}`;
  };
}

module.exports = { printJSON };
