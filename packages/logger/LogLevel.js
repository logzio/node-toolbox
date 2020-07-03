const chalk = require('chalk');

const LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

const LogLevelWeight = {
  DEBUG: 5,
  INFO: 4,
  WARN: 3,
  ERROR: 2,
};

const LogLevelColor = {
  DEBUG: chalk.magenta,
  INFO: chalk.white,
  WARN: chalk.yellow,
  ERROR: chalk.red,
};

function colorByLevel(level) {
  if (LogLevelColor[level]) {
    return LogLevelColor[level](level);
  }

  return level;
}

module.exports = { LogLevel, LogLevelWeight, colorByLevel };
