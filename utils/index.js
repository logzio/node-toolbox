require('./ServerError');

const { registerHealthCheckAndGraceful } = require('./registerHealthCheckAndGraceful');
const { initializeRequestHooks } = require('./initializeRequestHooks');
const { createSingletonInstance } = require('./createSingletonInstance');

module.exports = {
  createSingletonInstance,
  registerHealthCheckAndGraceful,
  initializeRequestHooks,
};
