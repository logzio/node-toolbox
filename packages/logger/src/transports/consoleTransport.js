import { LogLevels } from '../LogLevels.js';
import { Transport } from './Transport.js';
import stringify from 'json-stringify-safe';
import colorize from 'json-colorizer';
import chalk from 'chalk';
import lodash from 'lodash';

const { isObject } = lodash;

function printJSON(colorizeLog = false) {
  return function printJSONLog({ message, logLevel, timestamp, __makeLogPrettyJSON__, ...rest }) {
    if (isObject(message)) {
      rest = Object.assign(rest, message);
      message = '';
    }

    const keys = Object.keys(rest).length > 0;

    if (keys) rest = stringify(rest, null, __makeLogPrettyJSON__ ? 4 : 0);

    if (colorizeLog)
      return `${LogLevels.metaData[logLevel].color(logLevel)}: ${chalk.blue(timestamp)} ${message ? message : ''}${
        keys ? ` ${colorize(rest)}` : ''
      }`;

    return `${logLevel}: [${timestamp}] ${message ? message : ''}${keys ? ` ${rest}` : ''}`;
  };
}

export function consoleTransport({
  colorizeLog = true,
  formatters = [],
  logLevel = LogLevels.levels.INFO,
  name = 'console',
} = {}) {
  const transport = new Transport({ name, logLevel });
  const print = printJSON(colorizeLog);

  transport.log = function ({ ...data }) {
    const formattedData = formatters.reduce((newData, formatter) => formatter(newData), data);

    console.log(print(formattedData));
  };

  return transport;
}
