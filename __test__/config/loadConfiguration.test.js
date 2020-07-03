const { loadConfiguration } = require('../../config');

let watchers = {};

const startValue = {
  name: 'mainConfig',
  region: 'noRegion',
  deepMerge: {
    deep1: 'noChange',
    deep2: 'noChange',
  },
};

const startRegionValue = {
  region: 'overWriteByRegion',
  deepMerge: {
    deep2: 'change',
  },
};

const mockConsul = {
  watch: jest.fn().mockImplementation(({ key, onChange, onError }) => {
    watchers[key] = {
      onChange,
      onError,
    };
  }),
  get: jest.fn().mockImplementation(key => {
    if (key.includes('region'))
      return Promise.resolve({
        value: startRegionValue,
      });

    return Promise.resolve({
      value: startValue,
    });
  }),
};

describe('loadConfiguration', () => {
  beforeEach(() => (watchers = {}));
  it('throw error if no service name or env', async () => {
    await expect(loadConfiguration()).rejects.toEqual(new Error('must pass serviceName and environment'));
  });

  it('if no consul return empty object', async () => {
    const config = await loadConfiguration({ serviceName: 'exist', environment: 'test' });

    expect(config).toEqual({});
  });

  it('return main config if no region and watch', async () => {
    const config = await loadConfiguration({ serviceName: 'exist', environment: 'test', consul: mockConsul });

    expect(config).toEqual({
      name: 'mainConfig',
      region: 'noRegion',
      deepMerge: {
        deep1: 'noChange',
        deep2: 'noChange',
      },
    });

    expect(mockConsul.get).toHaveBeenCalledTimes(1);
    expect(mockConsul.get).toBeCalledWith('test/exist.conf');
    expect(watchers['test/exist.conf']).toBeDefined();
  });

  it('return main merge with region config if passed region', async () => {
    const config = await loadConfiguration({
      serviceName: 'exist',
      environment: 'test',
      consul: mockConsul,
      region: 'region',
    });

    expect(config).toEqual({
      name: 'mainConfig',
      region: 'overWriteByRegion',
      deepMerge: {
        deep1: 'noChange',
        deep2: 'change',
      },
    });

    expect(mockConsul.get).toHaveBeenCalledTimes(2);
    expect(mockConsul.get).toBeCalledWith('test/exist.conf');
    expect(mockConsul.get).toBeCalledWith('test/region/exist.conf');
    expect(watchers['test/exist.conf']).toBeDefined();
    expect(watchers['test/region/exist.conf']).toBeDefined();
  });

  it('update when watch happen and the values changed', async () => {
    let validated = 0;
    const onConfigChange = ({ path, newConfiguration }) => {
      if (path === 'test/exist.conf') {
        expect(newConfiguration).toEqual({
          name: 'mainConfigChange',
          region: 'overWriteByRegion',
          deepMerge: { deep2: 'change' },
        });
      } else {
        expect(newConfiguration).toEqual({
          name: 'mainConfigChange',
          region: 'overWriteByRegionChanged',
        });
      }

      validated += 1;
    };

    await loadConfiguration({
      serviceName: 'exist',
      environment: 'test',
      consul: mockConsul,
      region: 'region',
      onConfigChange,
    });

    watchers['test/exist.conf'].onChange({
      value: startValue,
    });

    watchers['test/exist.conf'].onChange({
      value: {
        name: 'mainConfigChange',
        region: 'noRegion',
      },
    });
    watchers['test/region/exist.conf'].onChange({
      value: {
        region: 'overWriteByRegionChanged',
      },
    });

    expect(validated).toEqual(2);
  });
});
