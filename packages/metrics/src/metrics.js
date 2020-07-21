import { Monitor } from '@logzio-node-toolbox/utils';
import { getUsages } from './getUsages.js';

export class Metrics extends Monitor {
  #metaData;

  constructor({ metaData = {}, interval = 5000 } = {}) {
    super(interval);
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

  monitor(newInterval) {
    this.start(this.get.bind(this), newInterval);
  }
}
