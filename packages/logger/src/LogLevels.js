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
};

export default {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

export function setLogLevelColor({ logLevel, color }) {
  if (levelsMetaData[logLevel] && /^#.{6}$/.test(color)) levelsMetaData[logLevel] = color;
}
