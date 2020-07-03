const Joi = require('joi');
const _ = require('lodash');
const deepMerge = require('deepmerge');
const { memoryCacher } = require('memory-cacher');
const { loadConfiguration } = require('./loadConfiguration');

async function createConfigManager({
  consul,
  environment,
  region = null,
  serviceName,
  schema,
  logger: currentLogger = console,
} = {}) {
  if (!serviceName || !environment) throw new Error('must pass serviceName and environment');

  if (!schema || !schema.isJoi) throw new Error('must pass Joi type schema');

  let logger = currentLogger;
  let sharedConfig = {};
  let mainConfig = {};
  let configuration = {};

  const subscribers = [];

  function notifySubscribers({ value, error, path }) {
    subscribers.forEach(subscriber => subscriber({ value, error, path }));
  }

  function subscribeToConfigChange(onChange) {
    if (onChange in subscribers) return;

    subscribers.push(onChange);
  }

  const mergeValidateAndNotify = ({ path, notify = true }) => {
    const mergedConfigurations = deepMerge(sharedConfig, mainConfig);

    const { error, value: validated } = Joi.validate(mergedConfigurations, schema, {
      abortEarly: false,
    });

    if (error) {
      logger.error({
        message: 'CONFIG: Configs validation error (merge with new config)',
        error,
        configuration: mergedConfigurations,
      });

      const { value } = Joi.validate(mergedConfigurations, schema, {
        allowUnknown: true,
        abortEarly: false,
      });

      configuration = value;
    } else {
      configuration = validated;
    }

    if (notify) notifySubscribers({ path, error, value: configuration });
  };

  sharedConfig = await loadConfiguration({
    // app is the old share (because we can't change the app.conf  in consul yet (kibana-6))
    serviceName: 'app', // shared
    environment,
    region,
    consul,
    onConfigChange: ({ path, newConfiguration }) => {
      sharedConfig = newConfiguration;
      mergeValidateAndNotify({ path });
    },
  });

  mainConfig = await loadConfiguration({
    region,
    serviceName,
    environment,
    consul,
    onConfigChange: ({ path, newConfiguration }) => {
      mainConfig = newConfiguration;
      mergeValidateAndNotify({ path });
    },
  });

  mergeValidateAndNotify({ notify: false });

  function getLoggerConfiguration() {
    return {
      host: _.get(configuration, 'listenerUrl'),
      token: _.get(configuration, 'loggerToken'),
      ..._.get(configuration, 'loggerConfiguration'),
    };
  }

  function getMetricsConfiguration() {
    return {
      host: _.get(configuration, 'listenerUrl'),
      token: _.get(configuration, 'metricsToken'),
      interval: _.get(configuration, 'metricsInterval'),
    };
  }

  function get(key) {
    if (!key) return configuration;

    return _.get(configuration, key);
  }

  const REGION_SETTINGS_EXPIRATION = 24 * 60 * 60 * 1000;

  async function getRegionSpecificConfig(newRegion) {
    // app is the old share (because we can't change the app.conf  in consul yet (kibana-6))
    const key = `${environment}/${newRegion}/app.conf`;

    return memoryCacher.getCached(
      key,
      async () => {
        const { value } = await consul.get(key);

        return value;
      },
      REGION_SETTINGS_EXPIRATION,
    );
  }

  function setLogger(newLogger) {
    logger = newLogger;
  }

  return {
    get,
    consul,
    serviceName,
    setLogger,
    getLoggerConfiguration,
    getMetricsConfiguration,
    subscribeToConfigChange,
    getRegionSpecificConfig,
  };
}

module.exports = {
  createConfigManager,
};
