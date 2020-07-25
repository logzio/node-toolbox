import { Monitor } from '@logzio-node-toolbox/utils';
import { getUsages } from './getUsages.js';

export class Metrics extends Monitor {
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
