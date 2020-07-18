import { Logger, transports } from '@madvinking/logger';

const consoleTransport = new transports.ConsoleTransport({ colorizeLog: true });

const logzioTransport = new transports.LogzioTransport({ token: '123' });

const t = [consoleTransport, logzioTransport];
const a = new Logger({ transports: t });

a.log('asdasd', { bbb: 'asd' });
a.log({ name: '123' });
a.log({ message: '123' });
a.log([1, 2, 3]);
a.log({ name: '123', boya: 'asd', message: 'kidma' }, { another: 'lama' });
a.log([1, 2, 3], { data: 'kdima' }, { err: 'aaa' });
