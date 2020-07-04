import logzioLogger from 'logzio-nodejs';
import { LogLevels } from '../LogLevels.js';
import { Transport } from './Transport.js';

export function logzioTransport({
  host,
  type,
  token,
  metaData,
  name = 'logzio',
  formatters = [],
  logLevel = LogLevels.levels.INFO,
}) {
  if (!token) throw new Error('must include logz0io token');

  const transport = new Transport({ name, logLevel });

  let logzIoLogger, currentToken;

  function _startLogzLogger(token) {
    logzIoLogger = logzioLogger.createLogger({
      host,
      token,
      name: type,
    });

    currentToken = token;
    transport.isOpen = true;
  }

  logzIoLogger = _startLogzLogger(token);

  transport.log = function ({ timestamp, ...data }) {
    const formattedData = formatters.reduce((newData, formatter) => formatter(newData), data);
    logzIoLogger.log({ ...formattedData, ...metaData });
  };

  transport.close = function close() {
    return new Promise(resolve => {
      if (!logzIoLogger) resolve();

      logzIoLogger.sendAndClose(() => {
        transport.isOpen = false;
        resolve();
      });
    });
  };

  transport.replaceToken = async function replaceToken(newToken) {
    if (!currentToken || !newToken || currentToken === newToken) return;
    await transport.close();
    _startLogzLogger(newToken);
  };

  return transport;
}
