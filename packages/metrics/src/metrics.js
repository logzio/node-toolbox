import { getUsages } from './getUsages.js';

export async function createMetrics({ metaData: globalMetaData = {}, interval = 5000 } = {}) {
  let intervalId;

  const subscribers = [];

  async function send({ data: newMetrics, metaData } = {}) {
    const currentUsage = await getUsages();

    const data = { ...currentUsage, ...newMetrics };
    const sendMetaData = {
      ...globalMetaData,
      ...metaData,
    };

    subscribers.forEach(subscriber => subscriber(data, sendMetaData));
  }

  function start(newInterval = interval) {
    if (!intervalId) intervalId = setInterval(send, newInterval);
  }

  function stop() {
    if (intervalId) clearInterval(intervalId);
  }

  function close() {
    stop();
  }

  function subscribe(onChange) {
    if (onChange in subscribers) return;

    subscribers.push(onChange);
  }

  return {
    subscribe,
    send,
    start,
    stop,
    close,
  };
}
