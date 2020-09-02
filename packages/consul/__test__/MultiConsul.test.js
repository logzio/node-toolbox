jest.mock('../src/Consul.js');
import { Consul, MultiConsul } from '../src/index.js';

const paths = ['configPathA', 'configPathB', 'configPathC'];

Consul.prototype.buildKey = key => `prefix/${key}`;

const configPathA = {
  key: 'prefix/configPathA',
  value: {
    a: 'a',
    b: 'a',
    c: 'a',
  },
};

const configPathB = {
  key: 'prefix/configPathB',
  value: {
    b: 'b',
    c: 'b',
  },
};

const configPathC = {
  key: 'prefix/configPathC',
  value: {
    c: 'c',
  },
};

const mockGet1 = path => {
  if (path == 'configPathA') return Promise.resolve(configPathA);
  else if (path == 'configPathB') return Promise.resolve(configPathB);
  else {
    return Promise.reject('path not exist');
  }
};

const mockGet2 = path => {
  if (path == 'configPathA') return Promise.resolve(configPathA);
  else if (path == 'configPathB') return Promise.resolve(configPathB);
  else if (path == 'configPathC') return Promise.resolve(configPathC);
};

describe('MultiConsul', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('create consul instance with values object by order of array of paths', () => {
    const multiConsul = new MultiConsul({ paths, host: '127.0.0.1', port: 80 });
    expect(multiConsul.values).toEqual({
      'prefix/configPathA': { p: 1, value: {} },
      'prefix/configPathB': { p: 2, value: {} },
      'prefix/configPathC': { p: 3, value: {} },
    });

    expect(Consul).toHaveBeenCalledTimes(1);
    expect(Consul).toHaveBeenCalledWith({ host: '127.0.0.1', port: 80 });
  });

  it('merge all available configs', async () => {
    Consul.prototype.get = mockGet1;

    const multiConsul = new MultiConsul({ paths, port: 82 });

    const allConfig = await multiConsul.getAll();
    expect(allConfig).toEqual({ a: 'a', b: 'b', c: 'b' });
  });

  it('should watch each path', async () => {
    Consul.prototype.get = mockGet1;
    Consul.prototype.watch = jest.fn();

    const multiConsul = new MultiConsul({ paths, port: 82 });
    await multiConsul.load();

    let callCout = 0;

    let changeA = { a: 'a1', b: 'b', c: 'b' };
    let changeC = { c: 'c1', d: 'c1' };

    const onChange = async ({ key, value }) => {
      callCout += 1;

      if (callCout === 1) {
        expect(multiConsul.values[key].value).toEqual(changeA);
        expect(await multiConsul.getAll()).toEqual(value);
      }

      if (callCout === 2) {
        expect(multiConsul.values[key].value).toEqual(changeC);
        expect(await multiConsul.getAll()).toEqual(value);
      }
    };

    multiConsul.watchAll({ onChange });

    expect(Consul.prototype.watch).toHaveBeenCalledTimes(3);
    expect(Consul.prototype.watch).toHaveBeenCalledTimes(3);

    const { onChange: onChangeA } = Consul.prototype.watch.mock.calls[0][0];
    const { onChange: onChangeC } = Consul.prototype.watch.mock.calls[2][0];

    await onChangeA({ key: 'prefix/configPathA', value: changeA });
    Consul.prototype.get = mockGet2;

    await onChangeC({ key: 'prefix/configPathC', value: changeC });

    expect(callCout).toEqual(2);
  });
});
