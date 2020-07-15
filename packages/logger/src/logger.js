import { LogLevels } from './LogLevels.js';
import dateFormat from 'dateformat';

export class Logger {
  constructor({
    transports = [],
    metaData = {},
    formatters = [],
    datePattern = 'dd/mm/yyyy hh:mm:ss.l',
    logLevel = LogLevels.levels.INFO,
  } = {}) {
    if (transports.length === 0) console.warn('LOGGER: HAVE NO TRANSPORTS');
    this._transports = transports;
    this.transports = transports.reduce((acc, transporter) => {
      acc[transporter.name] = transporter;
      return acc;
    }, {});

    this._logLevel = logLevel;
    this.metaData = metaData;
    this.formatters = formatters;
    this.datePattern = datePattern;
  }

  _log(logLevel = LogLevels.levels.INFO, [message = null, data = {}] = []) {
    if (typeof message === 'string') data.message = message;
    else if (typeof message === 'object' || message instanceof Object) data = { ...message, ...data };

    const timestamp = this.datePattern ? { timestamp: dateFormat(new Date(), this.datePattern) } : null;
    const formattedData = this.formatters.reduce((transformData, formatter) => formatter(transformData), {
      ...this.metaData,
      ...data,
      logLevel,
      ...timestamp,
    });

    this._transports.forEach(transport => {
      let currentLevel = transport.logLevel || this._logLevel;
      let shouldLog = LogLevels.metaData[formattedData.logLevel].weight <= LogLevels.metaData[currentLevel].weight;

      if (transport.isOpen && shouldLog) transport.log(transport.format(formattedData));
    });
  }

  debug() {
    this._log(LogLevels.levels.DEBUG, arguments);
  }

  log() {
    this._log(LogLevels.levels.INFO, arguments);
  }

  info() {
    this._log(LogLevels.levels.INFO, arguments);
  }

  warn() {
    this._log(LogLevels.levels.WARN, arguments);
  }

  error() {
    this._log(LogLevels.levels.ERROR, arguments);
  }

  beautify() {
    const [message = null, data = {}] = arguments;

    data.__makeLogPrettyJSON__ = true;

    this._log(LogLevels.levels.INFO, [message, data]);
  }

  close() {
    return Promise.all(this._transports.map(transporter => transporter.close()));
  }

  logLevel(level) {
    if (LogLevels.levels[level]) this._logLevel = level;
  }
}
