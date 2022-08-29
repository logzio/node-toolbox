import retry from 'async-retry';
import ConsulLibrary from 'consul';
import deepMerge from 'deepmerge';

const defaultValidateOptions = { fail: true, timeout: 5000, retries: 6, factor: 2, onRetry: null };
const defaultWatchOptions = { backoffFactor: 100, backoffMax: 30000, maxAttempts: 10000, ignoreFirst: true };
const defaultRegisterRetryOptions = { factor: 2, retries: 6, onRetry: null };
function parseValue({ Value = null, Key = null, ...rest } = {}) {
  if (!Key || !Value) return undefined;

  let value;

  try {
    value = JSON.parse(Value);
  } catch (err) {
    value = Value;
  }

  return {
    ...rest,
    key: Key,
    value,
  };
}

export class Consul {
  constructor({
    port = 8500,
    host = 'localhost',
    baseUrl = null,
    validateOptions = {},
    watchOptions = {},
    registerRetryOptions = {},
  } = {}) {
    if (!port) throw new Error('consul must have port');

    this.consulInstance = new ConsulLibrary({ host, port, promisify: true });

    this.keyPrefix = baseUrl ? `${baseUrl.replace(/\/*$/, '')}/` : '';
    this.didIgnorePaths = {};

    this.connectionParams = {
      host,
      port,
    };

    this.openWatchersToClose = [];

    this.watchOptions = {
      ...defaultWatchOptions,
      ...watchOptions,
    };

    this.validateOptions = {
      ...defaultValidateOptions,
      ...validateOptions,
    };

    this.registerRetryOptions = {
      ...defaultRegisterRetryOptions,
      ...registerRetryOptions,
    };

    this.registerParams = {
      id: null,
      timeoutId: null,
      serviceName: null,
    };
  }

  async validateConnected(options = {}) {
    let { fail, timeout, retries, factor, onRetry } = { ...this.validateOptions, ...options };
    try {
      await retry(async () => this.consulInstance.agent.check.list({ timeout }), { factor, retries, onRetry });
    } catch (err) {
      if (fail) throw new Error(`CONSUL: failed to connect to consul after ${retries + 1} attempts with message: ${err.message}`);
    }
  }

  buildKey(key) {
    return `${this.keyPrefix}${key.replace(new RegExp(`^/*${this.keyPrefix}/*|^/*`), '')}`;
  }

  async get(key) {
    return parseValue(await this.consulInstance.kv.get(this.buildKey(key)));
  }

  async set({ key, value }) {
    return this.consulInstance.kv.set(this.buildKey(key), JSON.stringify(value));
  }

  async setString({ key, value }) {
    return this.consulInstance.kv.set(this.buildKey(key), value);
  }

  async keys(key) {
    return this.consulInstance.kv.keys(this.buildKey(key));
  }

  async merge({ key, value }) {
    const configValues = await this.get(key);

    const currentValues = configValues ? configValues.value : {};

    const newValues = deepMerge(currentValues, value);

    await this.set(key, newValues);

    return newValues;
  }

  watch({ key, onChange, onError, options = {} } = {}) {
    if (!key || !onChange) return;

    const { ignoreFirst, ...watchOptions } = {
      method: this.consulInstance.kv.get,
      options: { key: this.buildKey(key) },
      ...this.watchOptions,
      ...options,
    };

    this.didIgnorePaths[key] = false;

    const watcher = this.consulInstance.watch(watchOptions);

    if (!ignoreFirst) this.didIgnorePaths[key] = true;

    this.get(key)
      .then(data => (!data ? (this.didIgnorePaths[key] = true) : ''))
      .catch(() => (this.didIgnorePaths[key] = true));

    watcher.on('change', data => {
      if (this.didIgnorePaths[key] && data) {
        onChange(parseValue(data));
      } else if (data) {
        this.didIgnorePaths[key] = true;
      }
    });
    watcher.on('error', error => {
      if (error && error.message === 'not found') return;

      const returnError = {
        ...error,
        host: this.connectionParams.host,
        port: this.connectionParams.port,
      };
      if (error && error.code === 'ECONNREFUSED') {
        returnError.message = `unable to reconnect to ${this.connectionParams.host}:${this.connectionParams.port}, not watching ${key}`;
      } else if (error && error.code === 'ECONNRESET') {
        returnError.message = `connection to ${this.connectionParams.host}:${this.connectionParams.port} lost, stop watching ${key}`;
      } else {
        returnError.message = `error on watch ${key}`;
      }

      onError({ error: returnError, key });
    });
    this.openWatchersToClose.push(watcher);
  }

  async register({ data, options = {} } = {}) {
    if (options.onBeforeRegister) {
      options.onBeforeRegister(data);
    }

    if (!data.name || !data.id) throw new Error('must provide name and id to register for consul service discovery');

    const retryOptions = {
      ...this.registerRetryOptions,
      ...options,
    };

    const list = await retry(async () => this.consulInstance.agent.service.list(), retryOptions);

    const isAlreadyRegistered = Object.entries(list).some(([id, { Service }]) => id === data.id && Service === data.name);

    if (!isAlreadyRegistered) {
      await retry(async () => this.consulInstance.agent.service.register(data), retryOptions);

      this.registerParams.id = data.id;
    }

    if (options.onAfterRegister) {
      options.onAfterRegister(isAlreadyRegistered);
    }
  }

  async registerInterval({ data, interval, onError, options }) {
    const retryOptions = {
      ...this.registerRetryOptions,
      ...options,
    };

    const startInterval = async () => {
      try {
        await this.register({ data, options: retryOptions });
      } catch (err) {
        onError(err);
      }
      this.registerParams.timeoutId = setTimeout(startInterval, interval);
    };

    startInterval();
  }

  async close(options = {}) {
    if (this.registerParams.id) {
      if (this.registerParams.timeoutId) clearTimeout(this.registerParams.timeoutId);

      const registerRetryOptions = {
        ...this.registerRetryOptions,
        ...options,
      };
      await retry(async () => this.consulInstance.agent.service.deregister(this.registerParams.id), registerRetryOptions);
    }
    this.openWatchersToClose.forEach(watcher => watcher.end());
  }
}
