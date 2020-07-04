import { LogLevels } from '../LogLevels.js';

export class Transport {
  constructor({ name, logLevel }) {
    this.name = name;
    this.isOpen = true;
    this.logLevel = LogLevels.levels[logLevel] ? logLevel : LogLevels.levels.INFO;
  }

  log() {}

  changeLogLevel(logLevel) {
    if (LogLevels.levels[logLevel]) this.logLevel = logLevel;
  }

  open() {
    this.isOpen = true;
  }

  close() {}
}
