import chalk from 'chalk';
const { magenta, white, yellow, red } = chalk;

export const levelsMetaData = {
  DEBUG: {
    weight: 8,
    color: magenta,
  },
  INFO: {
    weight: 6,
    color: white,
  },
  WARN: {
    weight: 4,
    color: yellow,
  },
  ERROR: {
    weight: 2,
    color: red,
  },
  SILENT: {
    weight: 0,
    color: white,
  },
};

export const LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  SILENT: 'SILENT',
};

export function setLogLevelColor({ logLevel, color }) {
  if (levelsMetaData[logLevel] && /^#.{6}$/.test(color)) levelsMetaData[logLevel] = color;
}

export function addLogLevel({ name, color, weight }) {
  LogLevel[name.toUpperCase()] = name.toUpperCase();
  levelsMetaData[name.toUpperCase()] = {
    color,
    weight,
  };
}
