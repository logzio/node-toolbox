'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var retry = _interopDefault(require('async-retry'));
var ConsulLibrary = _interopDefault(require('consul'));
var deepMerge = _interopDefault(require('deepmerge'));

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

exports.Consul = Consul;
exports.MultiConsul = MultiConsul;
