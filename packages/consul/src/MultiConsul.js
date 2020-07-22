import deepMerge from 'deepmerge';
import { Consul } from './Consul.js';

export class MultiConsul extends Consul {
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

  async _loadAll() {
    const data = await Promise.allSettled(this.#paths.map(path => this.get(path)));
    data.forEach(({ value: { value, key } = {} }) => {
      if (key && value) this.values[key].value = value;
    });

    return this._mergeAll();
  }

  async getAll() {
    if (!this.#mergedValues) await this._loadAll();

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
