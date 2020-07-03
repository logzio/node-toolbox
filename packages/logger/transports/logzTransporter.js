const logzioLogger = require('logzio-nodejs');

function createLogzIoTransporter({ host, token, serviceName, defaultMeta, formatters = [] }) {
  let logger = logzioLogger.createLogger({
    host,
    token,
    name: serviceName,
  });
  let currentToken = token;

  function log({ timestamp, ...data }) {
    const formatedData = formatters.reduce((transformData, formatter) => formatter(transformData), data);

    logger.log({ ...formatedData, ...defaultMeta });
  }

  function close() {
    return new Promise(resolve => {
      if (!this.logger) {
        return resolve();
      }

      return logger.sendAndClose(resolve);
    });
  }

  async function replaceToken(newToken) {
    if (!currentToken || !newToken || currentToken === newToken) return;

    log({ message: 'node-toolbox | Logger | logger token changed', newToken, currentToken });
    currentToken = newToken;
    await close();
    logger = logzioLogger.createLogger({ host, token: newToken, name: serviceName });
  }

  return {
    log,
    close,
    replaceToken,
  };
}

module.exports = { createLogzIoTransporter };
