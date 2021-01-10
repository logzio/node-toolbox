import retry from 'async-retry';
import ConsulLibrary from 'consul';
import deepMerge from 'deepmerge';

const defaultValidateOptions = { fail: true, timeout: 5000, retries: 6, factor: 2, onRetry: null };
const defaultWatchOptions = { backoffFactor: 100, backoffMax: 30000, maxAttempts: 10000 };
const defaultRegisterRetryOptions = { factor: 2, retries: 6, onRetry: null };
function parseValue({ Value = null, Key = null } = {}) {
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

  async validateConnected(validateOptions = {}) {
    let { fail, timeout, retries, factor, onRetry } = { ...this.validateOptions, ...validateOptions };
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

  watch({ key, onChange, onError, watchOptions = {} } = {}) {
    if (!key || !onChange) return;

    const options = {
      method: this.consulInstance.kv.get,
      options: { key: this.buildKey(key) },
      ...this.watchOptions,
      ...watchOptions,
    };

    const watcher = this.consulInstance.watch(options);

    watcher.on('change', data => data && onChange(parseValue(data)));
    watcher.on('error', err => err && onError(err, key));
    this.openWatchersToClose.push(watcher);
  }

  async register({ data, retryOptions } = {}) {
    if (!data.name || !data.id) throw new Error('must provide name and id to register for consul service discovery');

    if (this.registerParams.id) return;

    const options = {
      ...this.registerRetryOptions,
      ...retryOptions,
    };

    const list = await retry(async () => this.consulInstance.agent.service.list(), options);

    const isRegistered = Object.entries(list).some(([id, { Service }]) => id === data.id && Service === data.name);

    if (!isRegistered) {
      await retry(async () => this.consulInstance.agent.service.register(data), options);

      this.registerParams.id = data.id;
    }
  }

  async registerInterval({ data, interval, onError, retryOptions }) {
    const options = {
      ...this.registerRetryOptions,
      ...retryOptions,
    };

    const startInterval = async () => {
      try {
        await this.register(data, options);
      } catch (err) {
        onError(err);
      }
      this.registerParams.timeoutId = setTimeout(startInterval, interval);
    };

    startInterval();
  }

  async close(registerRetryOptions = {}) {
    if (this.registerParams.id) {
      if (this.registerParams.timeoutId) clearTimeout(this.registerParams.timeoutId);

      const options = {
        ...this.registerRetryOptions,
        ...registerRetryOptions,
      };
      await retry(async () => this.consulInstance.agent.service.deregister(this.registerParams.id), options);
    }
    this.openWatchersToClose.forEach(watcher => watcher.end());
  }
}
