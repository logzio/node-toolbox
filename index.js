const logger = require('./logger');
const config = require('./config');
const utils = require('./utils');
const metrics = require('./metrics');
const trace = require('./trace');
const middlewares = require('./middlewares');

module.exports = {
  middlewares,
  ...logger,
  ...config,
  ...metrics,
  ...trace,
  ...utils,
};
