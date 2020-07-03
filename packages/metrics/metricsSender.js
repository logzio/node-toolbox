const nodeMetrics = require('logzio-nodejs-metrics');
const { getUsages } = require('./getUsages');

async function createMetricsSender({ token, host, serviceName, metaData: globalMetaData = {}, interval = 1000 } = {}) {
  if (!serviceName) throw new Error('must provide serviceName');

  let metricsInstance = null;

  let intervalId;

  if (token && host) {
    metricsInstance = nodeMetrics.createMetrics({
      token,
      host,
      bufferSize: 10,
    });
  }

  const subscribers = [];

  function notifySubscribers(data) {
    subscribers.forEach(subscriber => subscriber(data));
  }

  async function sendUsage({ data: newMetrics, metaData } = {}) {
    const currentUsage = await getUsages();

    const data = { ...currentUsage, ...newMetrics };
    const sendMetaData = {
      ...globalMetaData,
      ...metaData,
      type: serviceName,
    };

    if (metricsInstance) metricsInstance.send(data, sendMetaData);

    notifySubscribers(data);
  }

  async function sendMetrics({ data, metaData } = {}) {
    const sendMetaData = {
      ...globalMetaData,
      ...metaData,
      type: serviceName,
    };

    if (metricsInstance) metricsInstance.send(data, sendMetaData);

    notifySubscribers(data);
  }

  function startUsageInterval(newInterval = interval) {
    if (!intervalId) intervalId = setInterval(sendUsage, newInterval);
  }

  function stopUsageInterval() {
    if (intervalId) clearInterval(intervalId);
  }

  function close() {
    stopUsageInterval();

    if (metricsInstance) metricsInstance.sendAndClose();
  }

  function subscribeToMetricsSend(onChange) {
    if (onChange in subscribers) return;

    subscribers.push(onChange);
  }

  return {
    sendUsage,
    sendMetrics,
    subscribeToMetricsSend,
    startUsageInterval,
    stopUsageInterval,
    close,
  };
}

module.exports = {
  createMetricsSender,
};
