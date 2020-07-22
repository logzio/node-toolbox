import LogLevel from '../LogLevels.js';

export class Transport {
  constructor({ name = 'transport', logLevel = LogLevel.INFO, formatters = [] }) {
    this.name = name;
    this.isOpen = true;
    this.formatters = formatters;
    this._logLevel = LogLevel[logLevel] ? logLevel : LogLevel.INFO;
  }

  format(data) {
    return this.formatters.reduce((newData, formatter) => formatter(newData), data);
  }

  set logLevel(level) {
    if (LogLevel[level]) this._logLevel = level;
  }

  get logLevel() {
    return this._logLevel;
  }

  close() {
    this.isOpen = false;
  }

  open() {
    this.isOpen = true;
  }
}
