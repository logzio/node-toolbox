const { createMetricsSender } = require('./metricsSender');
const { getUsages } = require('./getUsages');

module.exports = {
  getUsages,
  createMetricsSender,
};
