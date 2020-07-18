import chalk from 'chalk';
const { magenta, white, yellow, red } = chalk;

export const levelsMetaData = {
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

export default {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

export function changeLogLevelColor({ logLevel, color }) {
  if (levelsMetaData[logLevel] && /^#.{6}$/.test(color)) levelsMetaData[logLevel] = color;
}
