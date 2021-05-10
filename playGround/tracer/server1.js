import { Logger, LogLevel, addLogLevel, ConsoleTransport, Color } from '../../packages/logger/src/index.js';

const logger = new Logger({
  transports: [new ConsoleTransport({ logLevel: LogLevel.INFO })],
});

logger.info('asd');

addLogLevel({ name: 'nir', weight: 1, color: Color.black });

logger.log('123');
logger.nir('nir');
