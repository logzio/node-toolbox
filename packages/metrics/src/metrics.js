import { getUsages } from './getUsages.js';

export class Metrics {
  constructor({ metaData = {}, interval = 5000 } = {}) {
    this._intervalId;
    this._interval = interval;
    this._metaData = metaData;
    this._listeners = [];
  }

  async send({ data: newMetrics, metaData } = {}) {
    const currentUsage = await getUsages();

    const data = { ...currentUsage, ...newMetrics };
    const sendMetaData = {
      ...this._metaData,
      ...metaData,
    };

    this._listeners.forEach(subscriber => subscriber(data, sendMetaData));
  }

  start(newInterval = this._interval) {
    if (!this._intervalId) this._intervalId = setInterval(this.send.bind(this), newInterval);
  }

  stop() {
    if (this._intervalId) clearInterval(this._intervalId);
  }

  close() {
    stop();
  }

  subscribe(onChange) {
    if (onChange in this._listeners) return;
    this._listeners.push(onChange);
    return () => {
      this._listeners = this._listeners.filter(l => l !== onChange);
    };
  }
}
