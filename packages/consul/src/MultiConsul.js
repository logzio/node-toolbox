import deepMerge from 'deepmerge';
import { Consul } from './Consul.js';

export class MultiConsul extends Consul {
  #paths;
  #mergedValues = null;
  constructor({ paths = [], ...consulOptions } = {}) {
    super(consulOptions);
    this.#paths = paths;
    let p = 1;
    this.values = paths.reduce((acc, path) => {
      acc[this.buildKey(path)] = { p, value: {} };
      p++;
      return acc;
    }, {});
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
      if (value && key) this.values[key].value = value;
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

  async watchAll({ onChange, onError, options }) {
    this.#paths.forEach(path =>
      this.watch({
        options,
        key: path,
        onError,
        onChange: async ({ key, value }) => {
          await this._onOneChange({ key, value });
          onChange({ key, changedValue: value, value: this.#mergedValues });
        },
      }),
    );
  }
}
