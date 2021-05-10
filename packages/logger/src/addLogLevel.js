import { LogLevel, levelsMetaData } from './LogLevels.js';
import { Logger } from './logger.js';
import chalk from 'chalk';

export const Color = {
  black: chalk['black'],
  red: chalk['red'],
  green: chalk['green'],
  yellow: chalk['yellow'],
  blue: chalk['blue'],
  magenta: chalk['magenta'],
  cyan: chalk['cyan'],
  white: chalk['white'],
  gray: chalk['gray'],
  grey: chalk['grey'],
  blackBright: chalk['blackBright'],
  redBright: chalk['redBright'],
  greenBright: chalk['greenBright'],
  yellowBright: chalk['yellowBright'],
  blueBright: chalk['blueBright'],
  magentaBright: chalk['magentaBright'],
  cyanBright: chalk['cyanBright'],
  whiteBright: chalk['whiteBright'],
};

export function addLogLevel({ name, color, weight }) {
  const n = name.toUpperCase();
  LogLevel[n] = n;
  levelsMetaData[n] = {
    color,
    weight,
  };
  Logger.prototype[n.toLowerCase()] = function () {
    this.logWithLevel(LogLevel[n], arguments);
  };
}
