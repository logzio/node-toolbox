const { objectDeepCompare } = require('deep-compare-any-order');
const deepMerge = require('deepmerge');

async function loadConfiguration({ consul, serviceName, environment, region = null, onConfigChange = () => {} } = {}) {
  if (!serviceName || !environment) throw new Error('must pass serviceName and environment');

  const mainConfig = {
    path: `${environment}/${serviceName}.conf`,
    value: {},
  };

  const regionConfig = region
    ? {
        path: `${environment}/${region}/${serviceName}.conf`,
        value: {},
      }
    : null;

  function mergeConfig() {
    return deepMerge(mainConfig.value, region ? regionConfig.value : {});
  }

  function watchConfig(currentConfig) {
    consul.watch({
      key: currentConfig.path,
      onChange: ({ value: changedValue }) => {
        if (objectDeepCompare(changedValue, currentConfig.value)) return;

        currentConfig.value = changedValue;

        onConfigChange({ path: currentConfig.path, newConfiguration: mergeConfig() });
      },
    });
  }

  async function loadFromConsul() {
    const promiseList = [consul.get(mainConfig.path)];

    if (region) promiseList.push(consul.get(regionConfig.path));

    const [{ value: mainValue = {} } = {}, { value: regionValue = {} } = {}] = await Promise.all(promiseList);

    mainConfig.value = mainValue;

    if (region) regionConfig.value = regionValue;

    watchConfig(mainConfig);

    if (region) watchConfig(regionConfig);

    return mergeConfig();
  }

  if (!consul) return {};

  return loadFromConsul();
}

module.exports = {
  loadConfiguration,
};
