import _ from 'lodash';
import { LogLevel, levelsMetaData } from './LogLevels.js';
import dateFormat from 'dateformat';

const { INFO } = LogLevel;
const isOnlyObject = a => !_.isArray(a) && _.isObject(a);

export class Logger {
  #transports;
  #formatters;
  #metaData;
  #datePattern;
  #logLevel;
  #_log;

  constructor({ transports = [], metaData = {}, formatters = [], datePattern = 'dd/mm/yyyy HH:MM:ss.l' } = {}) {
    if (!Array.isArray(transports)) transports = [transports];
    if (!Array.isArray(formatters)) formatters = [formatters];
    if (transports.length === 0) console.warn('LOGGER: HAVE NO TRANSPORTS');
    this.#transports = transports;

    this.#metaData = metaData;
    this.#formatters = formatters;
    this.#datePattern = datePattern;
    this.#_log = function _log(logLevel = INFO, [message = null, ...rest] = []) {
      const data = {
        ...rest.reduce((cur, arg) => {
          if (isOnlyObject(arg)) {
            cur = {
              ...cur,
              ...arg,
            };
          } else {
            if (!cur._logArgs_) cur._logArgs_ = [];
            cur._logArgs_.push(arg);
          }
          return cur;
        }, {}),
        ...(isOnlyObject(message) ? message : { message }),
      };

      const timestamp = this.#datePattern ? { timestamp: dateFormat(new Date(), this.#datePattern) } : null;
      const formattedData = this.#formatters.reduce((transformData, formatter) => formatter(transformData), {
        ...this.#metaData,
        ...data,
        logLevel,
        ...timestamp,
      });

      this.#transports.forEach(transport => {
        let currentLevel = transport.logLevel;
        let shouldLog = levelsMetaData[formattedData.logLevel].weight <= levelsMetaData[currentLevel].weight;
        if (transport.isOpen && shouldLog) transport.log(transport.format({ ...formattedData }));
      });
    };
  }

  debug() {
    this.#_log(LogLevel.DEBUG, arguments);
  }

  log() {
    this.#_log(INFO, arguments);
  }

  info() {
    this.#_log(INFO, arguments);
  }

  warn() {
    this.#_log(LogLevel.WARN, arguments);
  }

  error() {
    this.#_log(LogLevel.ERROR, arguments);
  }

  logWithLevel(level, ...rest) {
    this.#_log(level, ...rest);
  }

  beautify() {
    const [message = null, log = {}] = arguments;

    const data = { ...log, __makeLogPrettyJSON__: true };

    this.#_log(INFO, [message, data]);
  }

  addTransport(transport) {
    if (Array.isArray(transport)) transport.forEach(t => this.#transports.push(t));
    else this.#transports.push(transport);
  }

  async removeTransport(name) {
    const transport = this.#transports.find(t => t.name === name);
    if (transport) await transport.close();
    this.#transports = this.#transports.filter(t => t.name !== name);
  }

  addFormatter(formatter) {
    if (Array.isArray(formatter)) formatter.forEach(f => this.#formatters.push(f));
    else this.#formatters.push(formatter);
  }

  removeFormatter(formatter) {
    this.#formatters = this.#formatters.filter(f => f !== formatter);
  }

  close() {
    return Promise.all(this.#transports.map(transporter => transporter.close()));
  }
}
