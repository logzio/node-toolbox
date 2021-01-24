import _ from 'lodash';
import LogLevel, { levelsMetaData } from './LogLevels.js';
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

  constructor({ transports = [], metaData = {}, formatters = [], datePattern = 'dd/mm/yyyy hh:mm:ss.l', logLevel = INFO } = {}) {
    if (transports.length === 0) console.warn('LOGGER: HAVE NO TRANSPORTS');
    this.#transports = transports;
    this.transports = transports.reduce((acc, transport) => {
      acc[transport.name] = transport;
      return acc;
    }, {});

    this.#logLevel = logLevel;
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
        let currentLevel = transport.logLevel || this.#logLevel;
        let shouldLog = levelsMetaData[formattedData.logLevel].weight <= levelsMetaData[currentLevel].weight;

        if (transport.isOpen && shouldLog) transport.log(transport.format(formattedData));
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

  beautify() {
    const [message = null, data = {}] = arguments;

    data.__makeLogPrettyJSON__ = true;

    this.#_log(INFO, [message, data]);
  }
  addTransport(transport) {
    this.#transports.push(transport);
    this.transports[transport.name] = transport;
  }

  async removeTransport(name) {
    if (this.transports[name]) {
      await this.transports[name].close();
      _.unset(this.transports, name);
      this.#transports = this.#transports.filter(t => t.name !== name);
    }
  }

  addFormatter(formatter) {
    this.#formatters.push(formatter);
  }
  removeFormatter(formatter) {
    this.#formatters = this.#formatters.filter(f => f !== formatter);
  }

  close() {
    return Promise.all(this.#transports.map(transporter => transporter.close()));
  }

  logLevel(level) {
    if (LogLevel[level]) this.#logLevel = level;
  }
}
