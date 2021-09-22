import { levelsMetaData } from '../LogLevels.js';
import { Transport } from './Transport.js';
import stringify from 'json-stringify-safe';
import colorize from 'json-colorizer';
import chalk from 'chalk';
import _ from 'lodash';

function printJSON(color = false) {
  return function printJSONLog({ message, logLevel, timestamp, __makeLogPrettyJSON__, ...rest }) {
    const keys = _.keys(rest).length > 0;

    if (keys) rest = stringify(rest, null, __makeLogPrettyJSON__ ? 4 : 0);

    if (color)
      return `${levelsMetaData[logLevel].color(logLevel)}: ${chalk.blue(timestamp)} ${message ? message : ''}${
        keys ? ` ${colorize(rest)}` : ''
      }`;

    return `${logLevel}: [${timestamp}] ${message ? message : ''}${keys ? ` ${rest}` : ''}`;
  };
}

export class ConsoleTransport extends Transport {
  constructor({ color = true, formatters = [], logLevel = null, name = 'console' } = {}) {
    super({ name, logLevel, formatters });
    this.print = printJSON(color);
  }

  log(data) {
    console.log(this.print(data));
  }
}
