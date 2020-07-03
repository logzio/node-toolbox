const { createConfigManager } = require('./configManager');
const { loadConfiguration } = require('./loadConfiguration');
const { Consul } = require('./Consul');

module.exports = {
  Consul,
  loadConfiguration,
  createConfigManager,
};
