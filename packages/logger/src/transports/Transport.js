import { LogLevels } from '../LogLevels.js';

export class Transport {
  constructor({ name, logLevel = LogLevels.levels.INFO, formatters = [] }) {
    this.name = name;
    this.isOpen = true;
    this.logLevel = logLevel;
    this.formatters = formatters;
  }

  _format(data) {
    return this.formatters.reduce((newData, formatter) => formatter(newData), data);
  }

  changeLogLevel(logLevel) {
    if (LogLevels.levels[logLevel]) this.logLevel = logLevel;
  }

  open() {
    this.isOpen = true;
  }

  log() {}
  close() {}
}
