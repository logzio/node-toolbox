import deepMerge from 'deepmerge';

export class MultiConsul {
  constructor({ consul, paths = [] } = {}) {
    this.paths = paths;
    this.consul = consul;
    this.values = [];
    this.mergedValues;
  }

  async merge() {
    this.mergedValues = deepMerge.all(this.values);
  }

  async load() {
    await Promise.all(
      this.paths.map(path =>
        this.consul
          .get(path)
          .then(({ value }) => (this.values[this.paths.findIndex(path)] = value))
          .catch(() => (this.values[this.paths.findIndex(path)] = {})),
      ),
    );
  }

  async get() {
    if (!this.mergedValues) await this.load();

    return this.mergedValues;
  }

  async onOneChange({ key, value }) {
    this.values[this.paths.findIndex(key)] = value;
    this.mergedValues = deepMerge.all(this.values);
  }

  async watch(onChange) {
    this.paths.forEach(path =>
      this.consul.watch({
        key: path,
        onChange: async ({ key, value }) => {
          await this.onOneChange({ key, value });
          onChange({ key, value: this.mergedValues });
        },
      }),
    );
  }
}
