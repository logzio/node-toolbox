'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var _ = _interopDefault(require('lodash'));
var deepMerge = _interopDefault(require('deepmerge'));
var Joi = _interopDefault(require('@hapi/joi'));
var retry = _interopDefault(require('async-retry'));
var ConsulLibrary = _interopDefault(require('consul'));
var chalk = _interopDefault(require('chalk'));
var dateFormat = _interopDefault(require('dateformat'));
var stringify = _interopDefault(require('json-stringify-safe'));
var colorize = _interopDefault(require('json-colorizer'));
var LogzioLogger = _interopDefault(require('logzio-nodejs'));
var objectSize = _interopDefault(require('rough-object-size'));
var se = _interopDefault(require('serialize-error'));
var v8 = _interopDefault(require('v8'));
var osUtils = _interopDefault(require('node-os-utils'));
var path = require('path');
var heapdump = _interopDefault(require('heapdump'));
var bodyParser = _interopDefault(require('body-parser'));
var helmet = _interopDefault(require('helmet'));
var express = _interopDefault(require('express'));
var asyncHandler = _interopDefault(require('express-async-handler'));
var ct = _interopDefault(require('@godaddy/terminus'));
var opentracing = _interopDefault(require('opentracing'));
var jaegerClient = _interopDefault(require('jaeger-client'));
require('@opentelemetry/api');
require('@opentelemetry/core');
require('@opentelemetry/tracing');
require('@opentelemetry/exporter-jaeger');
require('@opentelemetry/propagator-jaeger');

class Observable {
  #val;
  #listeners = [];

  constructor(value) {
    this.#val = value;
  }

  set(val) {
    if (this.#val !== val) {
      this.#val = val;
      this.#listeners.forEach(l => l(val));
    }
  }

  get() {
    return this.#val;
  }

  subscribe(listener) {
    this.#listeners.push(listener);
    return () => {
      this.#listeners = this.#listeners.filter(l => l !== listener);
    };
  }
}

function validateAndGetJoiSchema(schema) {
  let finalSchema;

  if (_.isArray(schema)) {
    finalSchema = schema.reduce((curSchema, newSchema) => {
      if (!Joi.isSchema(newSchema)) newSchema = Joi.object(newSchema);
      curSchema = curSchema.concat(newSchema);
      return curSchema;
    }, Joi.object());
  } else {
    if (schema.isJoi) finalSchema = schema;
    else finalSchema = Joi.object(schema);
  }

  return finalSchema;
}

class Config {
  #config;
  #schema;
  #observable;
  #observables;
  #overrides;

  constructor({ schema, defaults = {}, overrides = {} } = {}) {
    if (!schema) throw new Error('must pass Joi type schema');

    this.#config = {};
    this.#observables = {};
    this.#schema = validateAndGetJoiSchema(schema);
    this.#overrides = _.pickBy(overrides);
    this.#observable = new Observable(this.#config);
    this._merge({ value: defaults });
  }

  _merge({ value, onError } = {}) {
    const curVales = deepMerge.all([this.#config, value, this.#overrides]);
    const { error, value: validated } = this.#schema.validate(curVales, { abortEarly: false });

    if (!error) {
      this.#config = validated;
    } else if (onError) {
      if (onError(error)) {
        const { value: newValidated } = this.#schema.validate(curVales, {
          allowUnknown: true,
          abortEarly: false,
        });

        this.#config = newValidated;
      }
    } else throw error;
  }

  subscribe({ key = null, onChange }) {
    if (!onChange) return;
    if (!key) {
      return this.#observable.subscribe(onChange);
    } else if (!this.#observables[key]) {
      this.#observables[key] = new Observable(this.get(key));
    }
    return this.#observables[key].subscribe(onChange);
  }

  set({ value, key, onError }) {
    if (!value) return;
    if (key) value = _.set({}, key, value);
    this._merge({ value, onError });

    Object.entries(this.#observables).forEach(([key, obs]) => {
      obs.set(this.get(key));
    });
    this.#observable.set(this.#config);
  }

  get(key) {
    if (!key) return this.#config;
    return _.get(this.#config, key);
  }
}

class Consul {
  constructor({
    port,
    host = 'localhost',
    connectMaxRetries = 5,
    connectTimeout = 5000,
    connectRetryBackoffFactor = 2,
    failOnFailedConnection = true,
    watchBackoffFactor = 100,
    watchBackoffMax = 30000,
    watchMaxAttempts = null,
    baseUrl = null,
    logger = console,
  } = {}) {
    if (!port) throw new Error('consul must have port');

    this.consulInstance = new ConsulLibrary({ host, port, promisify: true });

    this._logger = logger;
    this.keyPrefix = baseUrl ? `${baseUrl.replace(/\/*$/, '')}/` : '';

    this.retry = {
      retries: connectMaxRetries,
      factor: connectRetryBackoffFactor,
    };

    this.connectionParams = {
      host,
      port,
      timeout: connectTimeout,
      failOnFailedConnection,
    };

    this.openWatchersToClose = [];
    this.watchOptions = {
      backoffFactor: watchBackoffFactor,
      backoffMax: watchBackoffMax,
    };

    if (watchMaxAttempts) this.watchOptions.maxAttempts = watchMaxAttempts;

    this.registerParams = {
      id: null,
      timeoutId: null,
      serviceName: null,
    };
  }

  async validateConnected() {
    const { host, port, timeout, failOnFailedConnection } = this.connectionParams;
    let countRetries = 0;

    try {
      await retry(async () => {
        if (this._logger && countRetries !== 0)
          this._logger.info(`CONSUL: try to connect to ${host}:${port} ${countRetries}/${this.retry.retries}`);

        countRetries += 1;

        await this.consulInstance.agent.check.list({ timeout });
      }, this.retry);

      if (this._logger) {
        const message = `CONSUL: connected successfully to ${host}:${port}`;

        if (countRetries > 1) this._logger.warn(`${message} after ${countRetries} tries`);
        else this._logger.info(message);
      }
    } catch (err) {
      const errorMessage = `CONSUL: failed to connect to consul after ${countRetries} attempts with message: ${err.message}`;

      if (failOnFailedConnection) throw new Error(errorMessage);
      else if (this._logger) this._logger.warn(errorMessage);
    }
  }

  parseValue({ Value = null, Key = null } = {}) {
    if (!Key || !Value) return undefined;

    let value;

    try {
      value = JSON.parse(Value);
    } catch (err) {
      value = Value;
    }

    return {
      key: Key,
      value,
    };
  }

  buildKey(key) {
    return `${this.keyPrefix}${key.replace(new RegExp(`^/*${this.keyPrefix}/*|^/*`), '')}`;
  }

  async get(key) {
    return this.parseValue(await this.consulInstance.kv.get(this.buildKey(key)));
  }

  async set(key, value) {
    return this.consulInstance.kv.set(this.buildKey(key), JSON.stringify(value));
  }

  async keys(key) {
    return this.consulInstance.kv.keys(this.buildKey(key));
  }

  async merge(key, values) {
    const configValues = await this.get(key);

    const currentValues = configValues ? configValues.value : {};

    const newValues = deepMerge(currentValues, values);

    await this.set(key, newValues);

    return newValues;
  }

  watch({ key, onChange } = {}) {
    if (!key || !onChange) {
      if (this._logger) this._logger.warn('CONSUL: must provide key and onChange function');

      return;
    }

    const options = {
      options: { key: this.buildKey(key) },
      ...this.watchOptions,
    };

    if (this._logger) this._logger.info(`CONSUL: start watching ${JSON.stringify(options)}`);

    options.method = this.consulInstance.kv.get;

    const watcher = this.consulInstance.watch(options);

    watcher.on('change', data => data && onChange(this.parseValue(data)));
    watcher.on('error', error => {
      if (error && error.message === 'not found') return;

      if (this._logger) {
        if (error && error.code === 'ECONNREFUSED') {
          const { address, port } = error;

          this._logger.warn(`CONSUL: unable to reconnect to ${address}:${port}, not watching ${key}`);
        } else if (error && error.code === 'ECONNRESET') {
          this._logger.warn(`CONSUL: connection to consul lost, stop watching ${key}`);
        } else this._logger.error(`CONSUL: error on watch ${key}`);
      }
    });

    this.openWatchersToClose.push(watcher);
  }

  async register({ meta, checks, address, hostname, serviceName, port, registerInterval = null } = {}) {
    if (!serviceName || !hostname) throw new Error('must provide serviceName and hostname to service discovery');

    if (this.registerParams.id) {
      if (this._logger) this._logger.warn(`CONSUL: ${this.registerParams.id} already registered`);

      return;
    }

    const options = {
      id: hostname,
      name: serviceName,
      port,
      address,
      meta,
      checks,
    };

    const invokeRegister = async () => {
      const list = await retry(async () => this.consulInstance.agent.service.list(), this.retry);

      const isRegistered = Object.entries(list).some(([id, { Service }]) => id === hostname && Service === serviceName);

      if (!isRegistered) {
        await retry(async () => this.consulInstance.agent.service.register(options), this.retry);

        this.registerParams.id = hostname;
      }
    };

    const startRegisterInterval = async () => {
      try {
        await invokeRegister();

        if (registerInterval) this.registerParams.timeoutId = setTimeout(startRegisterInterval, registerInterval);
      } catch (err) {
        if (this._logger) this._logger.error('CONSUL: registration failed', err);
      }
    };

    await invokeRegister();

    startRegisterInterval();
  }

  set logger(newLogger) {
    this._logger = newLogger;
  }

  async close() {
    try {
      if (this.registerParams.id) {
        if (this.registerParams.timeoutId) clearTimeout(this.registerParams.timeoutId);

        await retry(async () => this.consulInstance.agent.service.deregister(this.registerParams.id), this.retry);
      }

      this.openWatchersToClose.forEach(watcher => watcher.end());
    } catch (err) {
      if (this._logger) this._logger.error('CONSUL: close consul failed', err);
    }
  }
}

class MultiConsul extends Consul {
  #paths;

  #mergedValues;
  constructor({ paths = [], ...consulOptions } = {}) {
    super(consulOptions);
    this.#paths = paths;
    let p = 1;
    this.values = paths.reduce((acc, path) => {
      acc[path] = { p, value: {} };
      p++;
      return acc;
    }, {});

    this.#mergedValues;
  }

  _mergeAll() {
    const values = Object.values(this.values)
      .sort((a, b) => a.p - b.p)
      .map(({ value }) => value);

    this.#mergedValues = deepMerge.all(values);
    return this.#mergedValues;
  }

  async load() {
    const data = await Promise.allSettled(this.#paths.map(path => this.get(path)));

    data.forEach(({ value: { value, key } = {} }) => {
      if (key && value) this.values[key].value = value;
    });

    return this._mergeAll();
  }

  async getAll() {
    if (!this.#mergedValues) await this.load();

    return this.#mergedValues;
  }

  async _onOneChange({ key, value }) {
    this.values[key].value = value;
    return this._mergeAll();
  }

  async watchAll(change) {
    this.#paths.forEach(path =>
      this.watch({
        key: path,
        onChange: async ({ key, value }) => {
          await this._onOneChange({ key, value });
          change({ key, changedValue: value, value: this.#mergedValues });
        },
      }),
    );
  }
}

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

class Monitor {
  #intervalId;
  #interval;
  #listeners = [];
  #afterFinish;
  #monitor;

  constructor({ interval = 5000, afterFinish = false, monitor }) {
    this.#interval = interval;
    this.#afterFinish = afterFinish;
    this.#monitor = monitor;
  }

  start({ monitor = this.#monitor, interval = this.#interval, onCall, afterFinish = this.#afterFinish } = {}) {
    if (!this.#intervalId && monitor) {
      const fn = async () => {
        const data = await monitor();
        this.#listeners.forEach(subscriber => subscriber(data));
      };

      if (afterFinish) {
        const warpTimeout = async () => {
          await fn();
          this.#intervalId = setTimeout(warpTimeout, interval);
        };
        setTimeout(warpTimeout, interval);
      } else this.#intervalId = setInterval(fn, interval);
      if (onCall) return this.subscribe(onCall);
    }
  }

  stop() {
    this.#intervalId && clearInterval(this.#intervalId);
  }

  subscribe(onCall) {
    const unsubscribe = () => (this.#listeners = this.#listeners.filter(l => l !== onCall));

    if (onCall in this.#listeners) return unsubscribe;
    this.#listeners.push(onCall);
    return unsubscribe;
  }

  unsubscribe(onCall) {
    this.#listeners = this.#listeners.filter(l => l !== onCall);
  }

  destroy() {
    this.stop();
    this.#listeners = [];
  }
}

const { cpu, drive, mem, netstat } = osUtils;

async function getUsages() {
  const [cpuPercentage, cpuFree, { freePercentage }, memory, network] = await Promise.all([
    cpu.usage(),
    cpu.free(),
    drive.info(),
    mem.info(),
    netstat.inOut(),
  ]);

  const { heap_size_limit, used_heap_size, total_heap_size } = v8.getHeapStatistics();

  const metricsData = {
    cpu: {
      percentage: cpuPercentage,
      free: cpuFree,
    },
    heap: {
      percentage: (total_heap_size * 100) / heap_size_limit,
      size: used_heap_size,
      totalSize: total_heap_size,
      sizeLimit: heap_size_limit,
    },
    memory: {
      total: memory.totalMemMb,
      used: memory.usedMemMb,
      free: memory.freeMemMb,
      percentage: memory.freeMemPercentage,
    },
    drive: {
      percentage: +freePercentage,
    },
    network,
  };

  return metricsData;
}

class Metrics extends Monitor {
  #metaData;

  constructor({ metaData = {}, ...MonitorOptions } = {}) {
    super(MonitorOptions);
    this.#metaData = metaData;
  }

  async get({ metrics, metaData } = {}) {
    const currentUsage = await getUsages();

    return {
      metrics: {
        ...currentUsage,
        ...metrics,
      },
      metaData: {
        ...this.#metaData,
        ...metaData,
      },
    };
  }

  monitor(interval) {
    this.start({ monitor: this.get, interval });
  }
}

function _isIncremental(arr) {
  let incremental = true;
  for (let index = 1; index < arr.length; index += 1) {
    if (arr[index - 1] > arr[index]) {
      incremental = false;
      break;
    }
  }

  return incremental;
}
class Heap extends Monitor {
  #memHistory = [];
  #snapshotFolder;
  #minPercentage;
  #maxPercentage;
  #repeats;
  #onSnapshot;
  constructor({
    snapshotFolder = '/var/local/',
    minPercentage = 40,
    maxPercentage = 97,
    repeats = 3,
    onSnapshot,
    ...MonitorOptions
  } = {}) {
    super(MonitorOptions);
    this.#snapshotFolder = snapshotFolder;
    this.#minPercentage = minPercentage;
    this.#maxPercentage = maxPercentage;
    this.#onSnapshot = onSnapshot;
    this.#repeats = repeats;
  }

  _takeSnapshot(heapPercentage = 0, onSnapshot = this.#onSnapshot) {
    const name = `${path.join(this.#snapshotFolder, Date.now().toString())}.heapsnapshot`;
    heapdump.writeSnapshot(name, () => onSnapshot && onSnapshot(name, heapPercentage));
  }
  get() {
    const { heap_size_limit, total_heap_size } = v8.getHeapStatistics();
    const percentage = (total_heap_size * 100) / heap_size_limit;
    return percentage;
  }

  monitor(internval) {
    const invoke = () => this.check(this.get());
    this.start({ monitor: invoke.bind(this), internval });
  }

  dump(onSnapshot = this.#onSnapshot) {
    this._takeSnapshot(this.get(), onSnapshot);
  }

  check(heapPercentage) {
    if (heapPercentage < this.#minPercentage) {
      this.#memHistory.length = 0;
      return heapPercentage;
    }

    this.#memHistory.push(heapPercentage);

    if (this.#memHistory.some(m => m >= this.#maxPercentage)) {
      this._takeSnapshot(heapPercentage);
      this.#memHistory.length = 0;
    } else if (this.#repeats === this.#memHistory.length) {
      const incremental = _isIncremental(this.#memHistory);
      if (incremental) this._takeSnapshot(heapPercentage);
      this.#memHistory.length = 0;
    }
    return heapPercentage;
  }
}

class Express {
  constructor({ port = 3000, middlewares = [], routes = [], errorHandler = null } = {}) {
    this.port = port;
    this.middlewares = middlewares;
    this.routes = routes;
    this.errorHandler = errorHandler;
  }

  async start() {
    const app = express();

    app.use(helmet());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());

    this.middlewares.forEach(mid => {
      if (_.isArray(mid)) app.use(...mid);
      else app.use(mid);
    });

    this.routes.forEach(r => {
      if (r instanceof express.Router) app.use(r);
      else {
        let method, path, handlers, handler;
        if (_.isArray(r)) {
          [method, path, ...handlers] = r;
        } else if (_.isObject(r)) {
          ({ method, path, handler, handlers = [] } = r);
          if (handlers && !_.isArray(handlers)) handlers = [handlers];
          if (handler) handlers = [handler, ...handlers];
        }
        app[method](path, ...handlers.map(h => (h?.constructor?.name === 'AsyncFunction' ? asyncHandler(h) : h)));
      }
    });

    if (this.errorHandler) app.use(this.errorHandler);

    return new Promise(resolve => {
      const server = app.listen(this.port, () => resolve({ app, server }));
    });
  }
}

const requestHooks = ({ server, onStart, onEnd, onError } = {}) => {
  server.on('request', (req, res) => {
    const requestStartData = onStart?.(req, res);
    res.on('error', err => onError?.(err, requestStartData));
    res.on('finish', () => onEnd?.(req, res, requestStartData));
  });
};

const errorHandler = onError => {
  process.on('unhandledRejection', err => onError({ err, type: 'unhandledRejection' }));
  process.on('uncaughtException', err => onError({ err, type: 'uncaughtException' }));

  // eslint-disable-next-line no-unused-vars
  return (err, req, res, next) => {
    const meta = onError?.({ req, err, type: 'route' });

    const { message = 'Internal Server Error', statusCode = 500 } = err;

    res.status(statusCode).send({
      message,
      statusCode,
      ...meta,
    });
  };
};

function healthCheckAndGraceful({ server, cleanUp, timeout, healthChecks, beforeShutdown, onSendFailureDuringShutdown }) {
  const options = {
    healthChecks: {
      ...healthChecks,
      verbatim: true,
    },
    beforeShutdown,
    timeout,
    signals: ['SIGTERM', 'SIGINT'],
    onSignal: cleanUp,
    onSendFailureDuringShutdown,
  };

  ct.createTerminus(server, options);
}

class ServerError extends Error {
  constructor({ message, statusCode = 500, status = 500, e = null, err = null, error = null, ...metaData } = {}) {
    super(message || err.message || error.message || e.message || 'GENERAL_ERROR');

    this.statusCode = statusCode || status;
    Object.assign(this, metaData);

    err = err || error || e;

    if (err) {
      this.stack = err.stack;
    } else Error.captureStackTrace(this, ServerError);
  }
}

function attachServerErrorToGlobal() {
  global.ServerError = ServerError;
}

const { initTracer } = jaegerClient;

class Tracer {
  #tracer;
  #shouldIgnore;
  #onStartSpan;
  #onFinishSpan;
  #carrierType;

  constructor({
    tags = {},
    onStartSpan,
    shouldIgnore,
    onFinishSpan,
    debug = false,
    exporterOptions = {},
    serviceName = 'node-js',
    carrierType = opentracing.FORMAT_HTTP_HEADERS,
  }) {
    this.#shouldIgnore = shouldIgnore;
    this.#onStartSpan = onStartSpan;
    this.#onFinishSpan = onFinishSpan;
    this.#carrierType = carrierType;

    let sampler = {
      type: exporterOptions.type ?? 'const',
      param: exporterOptions.probability ?? 1,
    };

    const reporter = {
      agentHost: exporterOptions.host ?? 'localhost',
      agentPort: exporterOptions.port ?? 6832,
      flushIntervalMs: exporterOptions.interval ?? 2000,
    };

    const config = {
      serviceName,
      sampler,
      reporter,
    };

    const options = {
      tags,
    };

    if (debug) {
      sampler = {
        type: 'const',
        param: 1,
      };
      reporter.logSpans = true;
      options.logger = console;
    }

    this.#tracer = initTracer(config, options);
  }

  startSpan({ operation, tags = {}, carrier } = {}) {
    if (this.#shouldIgnore?.(operation)) return;
    const rootSpan = this.#tracer.extract(this.#carrierType, carrier);

    const span = this.#tracer.startSpan(operation, {
      childOf: rootSpan,
      tags: {
        [opentracing.Tags.SPAN_KIND]: opentracing.Tags.SPAN_KIND_RPC_SERVER,
        ...tags,
      },
    });

    this.onStartSpan?.(span);

    this.#tracer.inject(span, this.#carrierType, carrier);

    return span;
  }

  finishSpan({ span, tags = {} } = {}) {
    if (!span) return;
    if (tags) span.addTags(tags);

    if (this.#onFinishSpan) this.#onFinishSpan(span);

    span.finish();
  }

  close() {
    return new Promise(resolve => this.#tracer.close(resolve));
  }
}

function nodeHttpTracer({ server, tracer, tags = {}, shouldIgnore, onStartSpan, onFinishSpan, onError } = {}) {
  if (!server || !tracer) return;

  server.on('request', (req, res) => {
    let span = null;
    const { originalUrl, baseUrl, _parsedUrl = {}, route = {}, method, headers } = req;
    try {
      if (shouldIgnore && shouldIgnore(originalUrl)) return;

      let operation = `${method.toUpperCase()}: ${baseUrl}`;

      if (route.path && route.path !== '*') operation += route.path;
      else operation += _parsedUrl.pathname;

      const _tags = {
        [opentracing.Tags.HTTP_URL]: originalUrl,
        [opentracing.Tags.HTTP_METHOD]: method,
        ...tags,
      };

      span = tracer.startSpan({ operation, tags: _tags, carrier: headers });
      onStartSpan?.({ span, req, res });
    } catch (err) {
      onError?.({ message: `failed to create span ${err.message}`, error: err });
    }

    const handlerError = error => {
      try {
        span.log({ event: 'error', message: error?.message, stack: error?.stack, type: error?.type });
        const _tags = {
          [opentracing.Tags.ERROR]: true,
          [opentracing.Tags.HTTP_STATUS_CODE]: res.statusCode || 500,
        };

        onFinishSpan?.(span, error);
        tracer.finishSpan({ span, tags: _tags });
      } catch (err) {
        onError?.({ message: `failed to finish span ${err.message}`, error: err });
      }
    };

    res.on('error', handlerError);
    req.on('error', handlerError);

    req.on('close', () => {
      try {
        const _tags = {
          [opentracing.Tags.HTTP_STATUS_CODE]: res.statusCode,
        };
        onFinishSpan?.(span, req, res);
        tracer.finishSpan({ span, tags: _tags });
      } catch (err) {
        onError?.({ message: `failed to finish span ${err.message}`, error: err });
      }
    });
  });
}

const hapiHttpTracer = ({ server, tracer, shouldIgnore, onError, tags }) => {
  server.ext({
    type: 'onRequest',
    method: (request, h) => {
      try {
        if (!shouldIgnore(request.path)) {
          const { path, raw, method, headers } = request;

          const span = tracer.startSpan({
            operation: path,
            carrier: headers,
            tags: {
              [opentracing.Tags.HTTP_URL]: raw.req.url,
              [opentracing.Tags.HTTP_METHOD]: method,
              ...tags,
            },
          });

          request.app.span = span;
        }
      } catch (err) {
        onError?.({ message: 'failed to create span', error: err });
      }

      return h.continue;
    },
  });

  server.events.on('response', request => {
    try {
      const { span } = request.app;

      if (span) {
        if (request.route && request.route.path)
          span.setOperationName(`${request.route.method.toUpperCase()}: ${request.route.path}`);

        const { statusCode } = request.response;

        tags = {
          [opentracing.Tags.HTTP_STATUS_CODE]: statusCode,
        };
        let error = null;

        if (request.response.source && request.response.source.error) {
          error = {
            message: request.response.source.message,
            type: request.response.source.error,
            stack: {},
          };
        }
        if (error) {
          span.log({ event: 'error', message: error?.message, stack: error?.stack, type: error?.type });
          tags[opentracing.Tags.ERROR] = true;
        }

        tracer.finishSpan({ span, tags });
      }
    } catch (err) {
      onError?.({ message: 'failed to finish span', error: err });
    }
  });

  return tracer;
};

function middlewareTracer({ tracer, tags = {}, shouldIgnore, onStartSpan, onFinishSpan, onError } = {}) {
  if (!tracer)
    return function (req, res, next) {
      next();
    };

  const setOperationName = (req, span) => {
    try {
      const { originalUrl, baseUrl, _parsedUrl = {}, route = {}, method } = req;

      if (shouldIgnore && shouldIgnore(originalUrl)) return;

      let operation = `${method.toUpperCase()}: ${baseUrl}`;

      if (route.path && route.path !== '*') operation += route.path;
      else operation += _parsedUrl.pathname;

      span.setOperationName(operation);
    } catch (err) {
      onError?.({ message: `failed to set operation name ${err.message}`, error: err });
    }
  };

  return (req, res, next) => {
    let span = null;

    const { originalUrl, method, headers } = req;
    try {
      if (shouldIgnore && shouldIgnore(originalUrl)) return;

      const _tags = {
        [opentracing.Tags.HTTP_URL]: originalUrl,
        [opentracing.Tags.HTTP_METHOD]: method,
        ...tags,
      };

      span = tracer.startSpan({ operation: originalUrl, tags: _tags, carrier: headers });
      onStartSpan?.({ span, req, res });
    } catch (err) {
      onError?.({ message: `failed to create span ${err.message}`, error: err });
    }

    const handlerError = error => {
      try {
        setOperationName(req, span);
        span.log({ event: 'error', message: error?.message, stack: error?.stack, type: error?.type });
        const _tags = {
          [opentracing.Tags.ERROR]: true,
          [opentracing.Tags.HTTP_STATUS_CODE]: res.statusCode || 500,
        };

        onFinishSpan?.(span, error);
        tracer.finishSpan({ span, tags: _tags });
      } catch (err) {
        onError?.({ message: `failed to finish span ${err.message}`, error: err });
      }
    };

    res.on('error', handlerError);
    req.on('error', handlerError);

    req.on('close', () => {
      try {
        const _tags = {
          [opentracing.Tags.HTTP_STATUS_CODE]: res.statusCode,
        };
        setOperationName(req, span);
        onFinishSpan?.(span, req, res);
        tracer.finishSpan({ span, tags: _tags });
      } catch (err) {
        onError?.({ message: `failed to finish span ${err.message}`, error: err });
      }
    });

    next();
  };
}

function axiosHooksTracer({ axios, tracer, shouldIgnore, onStartSpan, onFinishSpan, onError, tags } = {}) {
  if (!axios || !tracer) return;

  axios.interceptors.request.use(
    function (config) {
      try {
        if (!shouldIgnore || !shouldIgnore(config.url)) {
          const span = tracer.startSpan({
            operation: config.url,
            carrier: config.headers,
            tags: {
              ...config?.meta?.tags,
              [opentracing.Tags.HTTP_URL]: config.url,
              [opentracing.Tags.HTTP_METHOD]: config.method,
              ...tags,
            },
          });

          onStartSpan?.(span, config);

          if (!config.meta) config.meta = {};

          config.meta.span = span;
        }
      } catch (err) {
        onError?.({ message: `failed to start span ${err.message}`, error: err });
      }

      return config;
    },
    function (error) {
      try {
        if (error?.config?.meta?.span) {
          const { span, ...meta } = error.config.meta;

          span.log({ event: 'error', message: error?.message, stack: error?.stack, type: error?.type || error?.code });
          const tags = {
            [opentracing.Tags.ERROR]: true,
            [opentracing.Tags.HTTP_STATUS_CODE]: error?.response?.status || 500,
          };

          onFinishSpan?.(span, error);
          tracer.finishSpan({ span, tags });
          error.config.meta = meta;
        }
      } catch (err) {
        onError?.({ message: `failed to finish span ${err.message}`, error: err });
      }

      return Promise.reject(error);
    },
  );

  axios.interceptors.response.use(
    function (response) {
      try {
        if (response.config && response.config.meta && response.config.meta.span) {
          const { span, ...meta } = response.config.meta;
          onFinishSpan?.(span, response);

          const tags = {
            [opentracing.Tags.HTTP_STATUS_CODE]: response.status,
          };

          tracer.finishSpan({ span, tags });
          response.config.meta = meta;
        }
      } catch (err) {
        onError?.({ message: `failed to finish span ${err.message}`, error: err });
      }

      return response;
    },
    function (error) {
      try {
        if (error?.config?.meta?.span) {
          const { span, ...meta } = error.config.meta;

          const status = error?.response?.status || 500;
          span.log({ event: 'error', message: error?.message, stack: error?.stack, type: error?.type || error?.code });

          const tags = {
            [opentracing.Tags.ERROR]: true,
            [opentracing.Tags.HTTP_STATUS_CODE]: status,
          };

          onFinishSpan?.(span, error);
          tracer.finishSpan({ span, tags });
          error.config.meta = meta;
        }
      } catch (err) {
        onError?.({ message: `failed to finish span ${err.message}`, error: err });
      }

      return Promise.reject(error);
    },
  );
}

function ExportAsync(name = 'instance') {
  let instance = null;
  let __set__ = false;
  const instanceProxy = new Proxy(
    {},
    {
      set(o, prop, value) {
        if (!instance) throw new Error(`${name} need to be created first`);

        instance[prop] = value;

        return true;
      },
      get(o, prop) {
        if (prop === '__set__') return __set__;

        if (!instance) throw new Error(`${name} need to be created first`);

        return instance[prop];
      },
    },
  );

  function setInstance(inst) {
    if (instance) throw new Error(`${name} was already been set`);

    instance = inst;
    __set__ = true;
  }

  return {
    setInstance,
    instance: instanceProxy,
  };
}

exports.Config = Config;
exports.Consul = Consul;
exports.ExportAsync = ExportAsync;
exports.Express = Express;
exports.Heap = Heap;
exports.LogLevel = LogLevel;
exports.Logger = Logger;
exports.Metrics = Metrics;
exports.Monitor = Monitor;
exports.MultiConsul = MultiConsul;
exports.Observable = Observable;
exports.ServerError = ServerError;
exports.Tracer = Tracer;
exports.attachServerErrorToGlobal = attachServerErrorToGlobal;
exports.axiosHooksTracer = axiosHooksTracer;
exports.changeLogLevelColor = changeLogLevelColor;
exports.errorHandler = errorHandler;
exports.formatters = index$1;
exports.getUsages = getUsages;
exports.hapiHttpTracer = hapiHttpTracer;
exports.healthCheckAndGraceful = healthCheckAndGraceful;
exports.middlewareTracer = middlewareTracer;
exports.nodeHttpTracer = nodeHttpTracer;
exports.requestHooks = requestHooks;
exports.transports = index;
