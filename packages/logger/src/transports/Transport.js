import LogLevel from '../LogLevels.js';
const { INFO } = LogLevel;
export class Transport {
  constructor({ name = 'transport', logLevel = INFO, formatters = [] }) {
    this.name = name;
    this.isOpen = true;
    this.formatters = formatters;
    this._logLevel = LogLevel[logLevel] ? logLevel : INFO;
  }

  format(data) {
    return this.formatters.reduce((newData, formatter) => formatter(newData), data);
  }

  addFormatter(formatter) {
    if (Array.isArray(formatter)) formatter.forEach(f => this.formatters.push(f));
    else this.formatters.push(formatter);
  }

  removeFormatter(formatter) {
    this.formatters = this.formatters.filter(f => f !== formatter);
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
