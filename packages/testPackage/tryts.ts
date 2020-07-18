import { Logger, changeLogLevelColor, transports } from '@madvinking/logger';

const consoleTransport = new transports.ConsoleTransport({ colorizeLog: true });
console.log('consoleTransport', consoleTransport);
const transports = [];
const a = new Logger({ transports });

a.log({ name: '123' });
