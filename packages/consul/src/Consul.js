import retry from 'async-retry';
import ConsulLibrary from 'consul';
import deepMerge from 'deepmerge';

export class Consul {
  constructor({ port, host = 'localhost', baseUrl = null } = {}) {
    if (!port) throw new Error('consul must have port');

    this.consulInstance = new ConsulLibrary({ host, port, promisify: true });

    this.keyPrefix = baseUrl ? `${baseUrl.replace(/\/*$/, '')}/` : '';

    this.connectionParams = {
      host,
      port,
    };

    this.openWatchersToClose = [];

    this.registerParams = {
      id: null,
      timeoutId: null,
      serviceName: null,
    };
  }

  async validateConnected({ fail = true, timeout = 5000, retries = 6, factor = 2, onRetry = null }) {
    try {
      await retry(async () => this.consulInstance.agent.check.list({ timeout }), { factor, retries, onRetry });
    } catch (err) {
      if (fail) throw new Error(`CONSUL: failed to connect to consul after ${retries + 1} attempts with message: ${err.message}`);
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

  watch({ key, onChange, onError, backoffFactor = 100, backoffMax = 30000, maxAttempts = 10000 } = {}) {
    if (!key || !onChange) return;

    const options = {
      method: this.consulInstance.kv.get,
      options: { key: this.buildKey(key) },
      backoffFactor,
      backoffMax,
      maxAttempts,
    };

    const watcher = this.consulInstance.watch(options);

    watcher.on('change', data => data && onChange(this.parseValue(data)));
    watcher.on('error', err => err && onError(err));
    this.openWatchersToClose.push(watcher);
  }

  async register({ meta, checks, address, hostname, serviceName, port, interval = null, onErorr } = {}) {
    if (!serviceName || !hostname) throw new Error('must provide serviceName and hostname to service discovery');

    if (this.registerParams.id) return;

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

        if (interval) this.registerParams.timeoutId = setTimeout(startRegisterInterval, interval);
      } catch (err) {
        onErorr(err);
      }
    };

    await invokeRegister();

    startRegisterInterval();
  }

  async close() {
    if (this.registerParams.id) {
      if (this.registerParams.timeoutId) clearTimeout(this.registerParams.timeoutId);
      await retry(async () => this.consulInstance.agent.service.deregister(this.registerParams.id), this.retry);
    }
    this.openWatchersToClose.forEach(watcher => watcher.end());
  }
}
