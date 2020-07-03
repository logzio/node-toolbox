const dateFormat = require('dateformat');
const { LogLevel, LogLevelWeight } = require('./LogLevel');

function create({ formatters = [], transports = [] } = {}) {
  const defaultDatePattern = 'dd/mm/yyyy hh:mm:ss.l';

  if (transports.length === 0) console.warn('LOGGER: HAVE NO TRANSPORTS');

  function log(logLevel = LogLevel.INFO, [message = null, data = {}] = []) {
    if (typeof message === 'string') data.message = message;
    else if (typeof message === 'object' || message instanceof Object) data = { ...message, ...data };

    const formatedData = formatters.reduce((transformData, formatter) => formatter(transformData), {
      ...data,
      logLevel,
      timestamp: dateFormat(new Date(), defaultDatePattern),
    });

    transports.forEach(({ logLevel: transporterLevel, log: transporterLog }) => {
      if (LogLevelWeight[transporterLevel] >= LogLevelWeight[logLevel]) transporterLog(formatedData);
    });
  }

  function debug() {
    log(LogLevel.DEBUG, arguments);
  }

  function info() {
    return log(LogLevel.INFO, arguments);
  }

  function warn() {
    return log(LogLevel.WARN, arguments);
  }

  function error() {
    return log(LogLevel.ERROR, arguments);
  }

  function beautify() {
    const [message = null, data = {}] = arguments;

    data.logzPrettyJSON = true;

    return log(LogLevel.INFO, [message, data]);
  }

  return {
    info,
    debug,
    warn,
    error,
    beautify,
  };
}

module.exports = { create };
