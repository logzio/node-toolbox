import { LogLevels } from '../LogLevels.js';

export class Transport {
  constructor({ name, logLevel, formatters }) {
    this.name = name;
    this.isOpen = true;
    this.logLevel = LogLevels.levels[logLevel] ? logLevel : LogLevels.levels.INFO;
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
