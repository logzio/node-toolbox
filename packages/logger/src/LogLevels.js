import chalk from 'chalk';
const { magenta, white, yellow, red } = chalk;

const metaData = {
  DEBUG: {
    weight: 5,
    color: magenta,
  },
  INFO: {
    weight: 4,
    color: white,
  },
  WARN: {
    weight: 3,
    color: yellow,
  },
  ERROR: {
    weight: 2,
    color: red,
  },
};

const levels = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

function changeColor(logLevel, color) {
  if (metaData[logLevel] && /^#.{6}$/.test(color)) metaData[logLevel] = color;
}

export const LogLevels = { levels, metaData, changeColor };
