import { LogLevels } from './LogLevels.js';
import dateFormat from 'dateformat';

export function createLogger({ transports = [], metaData = {}, formatters = [], datePattern = 'dd/mm/yyyy hh:mm:ss.l' } = {}) {
  if (transports.length === 0) console.warn('LOGGER: HAVE NO TRANSPORTS');

  function _logData(logLevel = LogLevels.levels.INFO, [message = null, data = {}] = []) {
    if (typeof message === 'string') data.message = message;
    else if (typeof message === 'object' || message instanceof Object) data = { ...message, ...data };

    const timestamp = datePattern ? { timestamp: dateFormat(new Date(), datePattern) } : null;
    const formattedData = formatters.reduce((transformData, formatter) => formatter(transformData), {
      ...metaData,
      ...data,
      logLevel,
      ...timestamp,
    });

    transports.forEach(transport => {
      let shouldLogByWeight = LogLevels.metaData[formattedData.logLevel].weight <= LogLevels.metaData[transport.logLevel].weight;

      if (transport.isOpen && shouldLogByWeight) transport.log(formattedData);
    });
  }

  function debug() {
    _logData(LogLevels.levels.DEBUG, arguments);
  }

  function log() {
    _logData(LogLevels.levels.INFO, arguments);
  }

  function info() {
    return _logData(LogLevels.levels.INFO, arguments);
  }

  function warn() {
    return _logData(LogLevels.levels.WARN, arguments);
  }

  function error() {
    return _logData(LogLevels.levels.ERROR, arguments);
  }

  function beautify() {
    const [message = null, data = {}] = arguments;

    data.__makeLogPrettyJSON__ = true;

    return _logData(LogLevels.levels.INFO, [message, data]);
  }

  const close = () => Promise.all(transports.map(transporter => transporter.close()));

  return {
    log,
    info,
    debug,
    warn,
    error,
    beautify,
    LogLevels,
    close,
    transports: transports.reduce((acc, transporter) => {
      acc[transporter.name] = transporter;
      return acc;
    }, {}),
  };
}
