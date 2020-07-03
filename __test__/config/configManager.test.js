let memoryCacher;

const Joi = require('joi');

const defaultSchema = Joi.object({
  boolean: Joi.boolean().default(false),
  number: Joi.number().default(1),
  string: Joi.string().default('abcd'),
  array: Joi.array()
    .items(Joi.string())
    .default(['aa', 'bb']),
});

const defaultConfig = {
  boolean: false,
  number: 1,
  string: 'abcd',
  array: ['aa', 'bb'],
};

const defaultOptions = {
  region: 'someRegion',
  serviceName: 'existingServiceName',
  environment: 'someEnv',
  consulOptions: {},
  schema: defaultSchema,
  logger: { error: jest.fn() },
};

let { createConfigManager, loadConfiguration } = require('../../config');

const mockLoadConfigurationWith = ({ sharedValue, mainValue }) => {
  loadConfiguration.mockReturnValueOnce(sharedValue).mockReturnValueOnce(mainValue);
};

describe('configManager', () => {
  beforeEach(() => {
    jest.resetModules();

    jest.mock('memory-cacher', () => ({
      memoryCacher: {
        getCached: jest.fn(),
      },
    }));

    ({ memoryCacher } = require('memory-cacher'));

    jest.mock('../../config/loadConfiguration.js', () => ({
      loadConfiguration: jest.fn(),
    }));

    ({ createConfigManager, loadConfiguration } = require('../../config'));
  });

  it('throw error if no config env or schema name', async () => {
    await expect(createConfigManager()).rejects.toEqual(new Error('must pass serviceName and environment'));
  });

  it('throw error if schema is not Joi', async () => {
    await expect(createConfigManager({ ...defaultOptions, schema: {} })).rejects.toEqual(
      new Error('must pass Joi type schema'),
    );
  });

  it('expect to call loadConfig 2 with the right values and load the default schema', async () => {
    mockLoadConfigurationWith({
      sharedValue: {},
      mainValue: {},
    });

    const config = await createConfigManager(defaultOptions);

    expect(loadConfiguration).toBeCalledTimes(2);
    expect(loadConfiguration.mock.calls[0][0].serviceName).toEqual('app');
    expect(loadConfiguration.mock.calls[0][0].region).toEqual('someRegion');
    expect(loadConfiguration.mock.calls[0][0].environment).toEqual('someEnv');

    expect(loadConfiguration.mock.calls[1][0].serviceName).toEqual('existingServiceName');
    expect(loadConfiguration.mock.calls[1][0].region).toEqual('someRegion');
    expect(loadConfiguration.mock.calls[1][0].environment).toEqual('someEnv');

    expect(config.get()).toEqual(defaultConfig);
  });

  it('shared should overwrite defaults and ain should overwrite shared', async () => {
    mockLoadConfigurationWith({
      sharedValue: { boolean: true, number: 2 },
      mainValue: { string: 'z', number: 3 },
    });

    const config = await createConfigManager(defaultOptions);

    expect(config.get()).toEqual({ ...defaultConfig, boolean: true, number: 3, string: 'z' });
  });

  it('should print warning on validation and load ALL defaults and incoming', async () => {
    mockLoadConfigurationWith({
      sharedValue: { number: 'string' },
      mainValue: {},
    });

    const config = await createConfigManager(defaultOptions);

    expect(config.get()).toEqual({ ...defaultConfig, number: 'string' });
  });

  it('getRegionSpecificConfig should be add to config instance and return cached value', async () => {
    mockLoadConfigurationWith({
      sharedValue: {},
      mainValue: {},
    });

    const config = await createConfigManager(defaultOptions);

    expect(config.getRegionSpecificConfig).toBeDefined();
    await config.getRegionSpecificConfig('otherRegionName');
    expect(memoryCacher.getCached).toBeCalledTimes(1);
    expect(memoryCacher.getCached.mock.calls[0][0]).toEqual('someEnv/otherRegionName/app.conf');
  });

  it('should merge configuration and call subscribers with the merged configuration', async () => {
    mockLoadConfigurationWith({
      sharedValue: {},
      mainValue: {},
    });

    let onChangeCalledAmount = 0;

    const onChange = ({ value, path }) => {
      onChangeCalledAmount += 1;

      if (path === 'shared') expect(value).toEqual({ ...defaultConfig, number: 2 });

      if (path === 'main') expect(value).toEqual({ ...defaultConfig, number: 2, string: 'z' });
    };

    const config = await createConfigManager(defaultOptions);

    expect(config.get()).toEqual(defaultConfig);

    config.subscribeToConfigChange(onChange);

    loadConfiguration.mock.calls[0][0].onConfigChange({ path: 'shared', newConfiguration: { number: 2 } });
    expect(config.get()).toEqual({ ...defaultConfig, number: 2 });
    loadConfiguration.mock.calls[1][0].onConfigChange({ path: 'main', newConfiguration: { string: 'z' } });
    expect(config.get()).toEqual({ ...defaultConfig, number: 2, string: 'z' });

    expect(onChangeCalledAmount).toEqual(2);
  });
});
