'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var _ = _interopDefault(require('lodash'));
var chalk = _interopDefault(require('chalk'));
var dateFormat = _interopDefault(require('dateformat'));
var stringify = _interopDefault(require('json-stringify-safe'));
var colorize = _interopDefault(require('json-colorizer'));
var LogzioLogger = _interopDefault(require('logzio-nodejs'));
var objectSize = _interopDefault(require('rough-object-size'));
var se = _interopDefault(require('serialize-error'));

const { magenta, white, yellow, red } = chalk;

const levelsMetaData = {
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

var LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

function changeLogLevelColor({ logLevel, color }) {
  if (levelsMetaData[logLevel] && /^#.{6}$/.test(color)) levelsMetaData[logLevel] = color;
}

const isOnlyObject = a => !_.isArray(a) && _.isObject(a);

class Logger {
  #transports;
  #formatters;
  #metaData;
  #datePattern;
  #logLevel;
  #_log;

  constructor({
    transports = [],
    metaData = {},
    formatters = [],
    datePattern = 'dd/mm/yyyy hh:mm:ss.l',
    logLevel = LogLevel.INFO,
  } = {}) {
    if (transports.length === 0) console.warn('LOGGER: HAVE NO TRANSPORTS');
    this.#transports = transports;
    this.transports = transports.reduce((acc, transport) => {
      acc[transport.name] = transport;
      return acc;
    }, {});

    this.#logLevel = logLevel;
    this.#metaData = metaData;
    this.#formatters = formatters;
    this.#datePattern = datePattern;
    this.#_log = function _log(logLevel = LogLevel.INFO, [message = null, ...rest] = []) {
      const data = {
        ...rest.reduce((cur, arg) => {
          if (isOnlyObject(arg)) {
            cur = {
              ...cur,
              ...arg,
            };
          } else {
            if (!cur._logArgs_) cur._logArgs_ = [];
            cur._logArgs_.push(arg);
          }
          return cur;
        }, {}),
        ...(isOnlyObject(message) ? message : { message }),
      };

      const timestamp = this.#datePattern ? { timestamp: dateFormat(new Date(), this.#datePattern) } : null;
      const formattedData = this.#formatters.reduce((transformData, formatter) => formatter(transformData), {
        ...this.#metaData,
        ...data,
        logLevel,
        ...timestamp,
      });

      this.#transports.forEach(transport => {
        let currentLevel = transport.logLevel || this.#logLevel;
        let shouldLog = levelsMetaData[formattedData.logLevel].weight <= levelsMetaData[currentLevel].weight;

        if (transport.isOpen && shouldLog) transport.log(transport.format(formattedData));
      });
    };
  }
  debug() {
    this.#_log(LogLevel.DEBUG, arguments);
  }

  log() {
    this.#_log(LogLevel.INFO, arguments);
  }

  info() {
    this.#_log(LogLevel.INFO, arguments);
  }

  warn() {
    this.#_log(LogLevel.WARN, arguments);
  }

  error() {
    this.#_log(LogLevel.ERROR, arguments);
  }

  beautify() {
    const [message = null, data = {}] = arguments;

    data.__makeLogPrettyJSON__ = true;

    this.#_log(LogLevel.INFO, [message, data]);
  }
  addTransport(transport) {
    this.#transports.push(transport);
    this.transports[transport.name] = transport;
  }

  async removeTransport(name) {
    if (this.transports[name]) {
      await this.transports[name].close();
      _.unset(this.transports, name);
      this.#transports = this.#transports.filter(t => t.name !== name);
    }
  }

  addFormatter(formatter) {
    this.#formatters = this.#formatters.push(formatter);
  }
  removeFormatter(formatter) {
    this.#formatters = this.#formatters.filter(f => f !== formatter);
  }

  close() {
    return Promise.all(this.#transports.map(transporter => transporter.close()));
  }

  logLevel(level) {
    if (LogLevel[level]) this.#logLevel = level;
  }
}

class Transport {
  constructor({ name = 'transport', logLevel = LogLevel.INFO, formatters = [] }) {
    this.name = name;
    this.isOpen = true;
    this.formatters = formatters;
    this._logLevel = LogLevel[logLevel] ? logLevel : LogLevel.INFO;
  }

  format(data) {
    return this.formatters.reduce((newData, formatter) => formatter(newData), data);
  }

  set logLevel(level) {
    if (LogLevel[level]) this._logLevel = level;
  }

  get logLevel() {
    return this._logLevel;
  }

  close() {
    this.isOpen = false;
  }

  open() {
    this.isOpen = true;
  }
}

function printJSON(color = false) {
  return function printJSONLog({ message, logLevel, timestamp, __makeLogPrettyJSON__, ...rest }) {
    const keys = _.keys(rest).length > 0;

    if (keys) rest = stringify(rest, null, __makeLogPrettyJSON__ ? 4 : 0);

    if (color)
      return `${levelsMetaData[logLevel].color(logLevel)}: ${chalk.blue(timestamp)} ${message ? message : ''}${
        keys ? ` ${colorize(rest)}` : ''
      }`;

    return `${logLevel}: [${timestamp}] ${message ? message : ''}${keys ? ` ${rest}` : ''}`;
  };
}

class ConsoleTransport extends Transport {
  constructor({ color = true, formatters = [], logLevel = null, name = 'console' } = {}) {
    super({ name, logLevel, formatters });
    this.print = printJSON(color);
  }

  log(data) {
    console.log(this.print(data));
  }
}

class LogzioTransport extends Transport {
  constructor({ host, type, token, metaData = {}, name = 'logzio', formatters = [], logLevel = null, ...moreOptions } = {}) {
    super({ name, formatters, logLevel });
    if (!token) throw new Error('must include logz.io token');

    this.host = host;
    this.token = token;
    this.name = type;
    this.name = type;
    this.extraFields = metaData;
    this.moreOptions = moreOptions;
    this._createLogger();
  }

  _createLogger() {
    const { host, token, name, extraFields, moreOptions } = this;
    this.logzIoLogger = LogzioLogger.createLogger({ host, token, name, extraFields, moreOptions });
    this.isOpen = true;
  }

  log({ timestamp, ...data }) {
    this.logzIoLogger.log(data);
  }

  close() {
    return new Promise(resolve => {
      if (!this.logzIoLogger) resolve();

      this.logzIoLogger.sendAndClose(() => {
        this.isOpen = false;
        resolve();
      });
    });
  }

  async replaceToken(newToken) {
    if (!this.token || !newToken || this.token === newToken) return;
    await this.close();
    this.token = newToken;
    this._createLogger();
  }
}

var index = /*#__PURE__*/Object.freeze({
  __proto__: null,
  Transport: Transport,
  ConsoleTransport: ConsoleTransport,
  LogzioTransport: LogzioTransport
});

const defaultSize = 1048576 * 0.5; // 1048576 * 0.5 = 0.5MB

function logSize(maxLogSizeBytes = defaultSize) {
  return function logSizeLog(log = {}) {
    const currentSize = objectSize.roughObjectSize(log);

    if (maxLogSizeBytes <= currentSize) {
      log = {
        logObjectKeys: Object.keys(log),
        message: 'Log exceeded the max bytes size',
        maxLogSize: maxLogSizeBytes,
      };
    }

    log.logSize = currentSize;
    return log;
  };
}

function maskFields(list = [], defaultLengthToMask = 7) {
  return function maskFieldsLog(log) {
    list.forEach(({ field, length = null }) => {
      const fieldValue = _.get(log, field);

      if (!fieldValue) return;

      if (typeof fieldValue !== 'string') return;

      if (length === 0) _.set(log, field, '*'.repeat(fieldValue.length));
      else {
        const useLength = length || defaultLengthToMask;

        if (useLength > fieldValue.length) return;

        const from = fieldValue.length - useLength;

        _.set(log, field, '*'.repeat(from) + fieldValue.substring(from, fieldValue.length));
      }
    });

    return log;
  };
}

function omitFields(fieldsToOmit = []) {
  return function omitFieldsLog(log) {
    return _.omit(log, fieldsToOmit);
  };
}

function removeCircularFields() {
  return function removeCircularFieldsLog(log) {
    const map = new WeakMap();
    const noCirculars = v => {
      if (_.isArray(v)) return v.map(noCirculars);
      else if (_.isObject(v)) {
        if (map.has(v)) return '[Circular]';

        map.set(v, undefined);

        for (const key of Object.keys(v)) {
          try {
            v[key] = noCirculars(v[key]);
          } catch (err) {
            console.log(`unable to set key on removeCircularFields ${key}`);
          }
        }
      }

      return v;
    };
    return noCirculars(log);
  };
}

const rmCircular = removeCircularFields();
function sliceFields(fieldsToSlice = [], maxFieldByteSize = 10000) {
  const maxFieldLength = maxFieldByteSize / 2;

  return function sliceFieldsLog(log) {
    fieldsToSlice.forEach(fieldToSlice => {
      const candidate = _.get(log, fieldToSlice);

      if (typeof candidate === 'string' && candidate.length > maxFieldLength) {
        _.unset(log, fieldToSlice);
        _.set(log, fieldToSlice, `${candidate.slice(0, maxFieldLength)} ...`);
        if (!log.__overSizedField__) log.__overSizedField__ = {};
        log.__overSizedField__[fieldToSlice] = candidate.length;
      } else if (typeof candidate === 'object' && objectSize.roughObjectSize(rmCircular(candidate)) > maxFieldLength) {
        if (!log.__overSizedField__) log.__overSizedField__ = {};
        Object.keys(candidate).reduce((acc, key) => {
          const fullKey = `${fieldToSlice}.${key}`;
          log.__overSizedField__[fullKey] = objectSize.roughObjectSize(_.get(log, fullKey));
          return acc;
        }, {});
        _.unset(log, fieldToSlice);
        _.set(log, fieldToSlice, `${JSON.stringify(candidate).slice(0, maxFieldLength)} ...`);
      }
    });

    return log;
  };
}

function renameFields(fieldsToRename = {}) {
  return function renameFieldsLog({ ...data }) {
    Object.entries(fieldsToRename).forEach(([from, to]) => {
      const fieldValue = _.get(data, from);

      if (fieldValue) {
        _.set(data, to, fieldValue);
        _.unset(data, from);
      }
    });

    return data;
  };
}

function handleError() {
  return function handleErrorLog({ err = null, error = null, logLevel, message = null, ...data }) {
    let serError;

    if (err) serError = err;
    else if (error) serError = error;
    else if (_.isObject(message) && message.err && _.isObject(message.err)) {
      serError = message.err;
      message = null;
    } else {
      return { logLevel, message, ...data };
    }

    if (message) data.message = message;

    const { name, stack, message: errorMessage } = serError;

    return {
      ...data,
      logLevel: 'ERROR',
      error: se.serializeError({ name, stack, message: errorMessage }),
    };
  };
}

function pickFields(name, list, shouldFlat = true) {
  return function pickFieldsLog({ [name]: property, ...data }) {
    if (!property) return data;

    const filteredList = _.pick(property, list);

    return Object.assign(data, shouldFlat ? filteredList : { [name]: filteredList });
  };
}

var index$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  logSize: logSize,
  maskFields: maskFields,
  omitFields: omitFields,
  sliceFields: sliceFields,
  renameFields: renameFields,
  removeCircularFields: removeCircularFields,
  handleError: handleError,
  pickFields: pickFields
});

exports.LogLevel = LogLevel;
exports.Logger = Logger;
exports.changeLogLevelColor = changeLogLevelColor;
exports.formatters = index$1;
exports.transports = index;
