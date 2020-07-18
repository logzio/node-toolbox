import LogLevel from '../LogLevels.js';

export class Transport {
  constructor({ name, logLevel = null, formatters = [] }) {
    this.name = name;
    this.isOpen = true;
    this.logLevel = logLevel;
    this.formatters = formatters;
  }

  format(data) {
    return this.formatters.reduce((newData, formatter) => formatter(newData), data);
  }

  logLevel(level) {
    if (LogLevel[level]) this.logLevel = level;
  }

  open() {
    this.isOpen = true;
  }

  log() {}
  close() {}
}
