const { create } = require('./create');
const { createConsoleTransporter, createLogzIoTransporter } = require('./transports');
const { LogLevel } = require('./LogLevel');

const {
  handleError,
  handleRequest,
  logSize,
  removeCircularFields,
  maskFields,
  omitFields,
  sliceFields,
  renameFields,
} = require('./formatters');

function createLogger({
  host,
  debug = false,
  metaData = {},
  serviceName = null,
  token = null,
  fieldsToOmit,
  fieldsToMask,
  fieldsToSlice,
  fieldsToRename,
  colorizeLog,
  maxLogSizeBytes,
  maxFieldByteSize,
  defaultLengthToMask,
  logToConsole,
  requestFieldsToLog,
} = {}) {
  if (!serviceName) throw Error('please provide logger serviceName');

  const transports = [];

  let defaultMeta = {};
  const formatters = [
    handleRequest({ requestFieldsToLog }),
    handleError,
    omitFields({ fieldsToOmit }),
    renameFields({ fieldsToRename }),
    maskFields({ fieldsToMask, defaultLengthToMask }),
    sliceFields({ fieldsToSlice, maxFieldByteSize }),
    removeCircularFields,
  ];

  if (logToConsole) {
    transports.push({
      log: createConsoleTransporter({ colorizeLog, formatters }),
      logLevel: debug ? LogLevel.DEBUG : LogLevel.INFO,
    });
  }

  if (token) {
    defaultMeta = { type: serviceName, ...metaData };

    var logzTransporter = createLogzIoTransporter({
      host,
      token,
      defaultMeta,
      serviceName,
      formatters: [logSize({ maxLogSizeBytes })],
    });

    transports.push({ log: logzTransporter.log, logLevel: LogLevel.INFO });
  }

  const logger = create({
    formatters,
    transports,
  });

  logger.replaceToken = token => {
    if (logzTransporter) logzTransporter.replaceToken(token);
  };

  logger.close = () => {
    if (logzTransporter) return logzTransporter.close();
  };

  return logger;
}

module.exports = { createLogger };
