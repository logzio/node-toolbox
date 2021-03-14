/* eslint-disable @typescript-eslint/no-empty-function */
import { registerData, connectionOptions } from './Consul.mock.js';

import ConsulClass from 'consul';
import { Consul } from '../src/Consul.js';

describe('Consul', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('should validate connection amountOf retries ', async () => {
    const consul = new Consul(connectionOptions);

    expect(ConsulClass).toHaveBeenCalledTimes(1);
    expect(ConsulClass).toHaveBeenCalledWith({ ...connectionOptions, promisify: true });

    consul.consulInstance.agent.check.list.mockRejectedValue(new Error('random error'));

    await expect(consul.validateConnected({ timeout: 0, factor: 0, retries: 3 })).rejects.toEqual(
      new Error('CONSUL: failed to connect to consul after 4 attempts with message: random error'),
    );

    expect(consul.consulInstance.agent.check.list).toHaveBeenCalledTimes(4);
  });

  it('consul instance should be created with the host and port provided', async () => {
    const consul = new Consul(connectionOptions);

    ['consulInstance', 'get', 'set', 'watch', 'merge', 'register', 'close'].forEach(name => expect(consul[name]).toBeDefined());
  });

  it('buildKey should ignore remove prefix slash on key', async () => {
    const consul = new Consul({
      ...connectionOptions,
      baseUrl: '',
    });

    expect(consul.buildKey('nada')).toEqual('nada');
    expect(consul.buildKey('/nada')).toEqual('nada');
  });

  it('buildKey should add slash to key if baseUrl exist', async () => {
    const consul = new Consul({
      ...connectionOptions,
      baseUrl: 'base',
    });

    expect(consul.buildKey('nada')).toEqual('base/nada');
    expect(consul.buildKey('/nada')).toEqual('base/nada');
  });

  it('buildKey should remove slash to key if baseUrl exist', async () => {
    const consul = new Consul({
      ...connectionOptions,
      baseUrl: 'base2/',
    });

    expect(consul.buildKey('nada')).toEqual('base2/nada');
    expect(consul.buildKey('/nada')).toEqual('base2/nada');
  });

  it('watch should invoke on change', async () => {
    const consul = new Consul(connectionOptions);

    let onChangedCalled = false;
    const onChange = data => {
      onChangedCalled = true;
      expect(data).toEqual({ key: 'yablolo', value: { name: 'new name' } });
    };

    consul.watch({ key: 'randomKey', onChange, options: { backoffFactor: 8200, backoffMax: 8220 } });

    expect(consul.openWatchersToClose.length).toEqual(1);

    const mockedWatch = ConsulClass.mock.results[0].value.watch;

    expect(mockedWatch).toBeCalledTimes(1);
    expect(mockedWatch.mock.calls[0][0].options).toEqual({ key: 'randomKey' });
    expect(mockedWatch.mock.calls[0][0].backoffFactor).toEqual(8200);
    expect(mockedWatch.mock.calls[0][0].backoffMax).toEqual(8220);

    const mockedOn = mockedWatch.mock.results[0].value.on;

    expect(mockedOn).toBeCalledTimes(2);

    const [[change, invokeOnChange]] = mockedOn.mock.calls;

    expect(change).toEqual('change');

    invokeOnChange({ Key: 'yablolo', Value: JSON.stringify({ name: 'new name' }) });
    expect(onChangedCalled).toEqual(false);
    invokeOnChange({ Key: 'yablolo', Value: JSON.stringify({ name: 'new name' }) });
    expect(onChangedCalled).toEqual(true);
  });

  it('register should not register if service exist but retry on list', async () => {
    const consul = new Consul(connectionOptions);

    consul.consulInstance.agent.service.list
      .mockImplementationOnce(() => new Promise().reject())
      .mockImplementation(() => Promise.resolve({ [registerData.id]: { Service: registerData.name } }));

    await consul.register({ data: registerData });

    expect(consul.consulInstance.agent.service.list).toBeCalledTimes(2);
    expect(consul.consulInstance.agent.service.register).toBeCalledTimes(0);
  });

  it('register should call register if service not exist', async () => {
    const consul = new Consul(connectionOptions);

    consul.consulInstance.agent.service.list.mockImplementationOnce(() => Promise.resolve({}));
    await consul.register({ data: registerData });

    expect(consul.consulInstance.agent.service.list).toBeCalledTimes(1);
    expect(consul.consulInstance.agent.service.register).toBeCalledTimes(1);

    expect(consul.consulInstance.agent.service.register).toBeCalledWith(registerData);
    expect(consul.registerParams.id).toEqual(registerData.id);
  });

  it('register should not call register if service exist', async () => {
    const consul = new Consul(connectionOptions);

    consul.consulInstance.agent.service.list.mockImplementationOnce(() =>
      Promise.resolve({ [registerData.id]: { Service: registerData.name } }),
    );
    await consul.register({ data: registerData });

    expect(consul.consulInstance.agent.service.list).toBeCalledTimes(1);
    expect(consul.consulInstance.agent.service.register).toBeCalledTimes(0);
  });

  it.skip('service registration should retry every register Interval', async done => {
    const consul = new Consul(connectionOptions);

    consul.consulInstance.agent.service.list.mockImplementation(() => Promise.resolve({}));

    jest.useFakeTimers();
    await consul.register({ ...registerData, registerInterval: 1 });

    const AMOUNT_OF_RETRIES = 3;

    const runAmountOfTimers = (times, cb) =>
      setImmediate(() => {
        jest.runAllTimers();
        times -= 1;

        if (times) runAmountOfTimers(times, cb);
        else cb();
      });

    function afterRetries() {
      expect(setTimeout).toHaveBeenCalledTimes(AMOUNT_OF_RETRIES);

      expect(consul.consulInstance.agent.service.list).toBeCalledTimes(5);
      expect(consul.consulInstance.agent.service.register).toBeCalledTimes(4);
      done();
    }

    runAmountOfTimers(AMOUNT_OF_RETRIES, afterRetries);
  });

  it('close should remove watchers and deregister service', async () => {
    const consul = new Consul(connectionOptions);

    consul.consulInstance.agent.service.list.mockImplementation(() => Promise.resolve({}));

    await consul.register({ data: registerData });
    consul.watch({ key: 'randomKey', onChange: () => {} });
    consul.watch({ key: 'randomKey2', onChange: () => {} });

    await consul.close();

    expect(ConsulClass.mock.results[0].value.watch.mock.results[0].value.end).toBeCalledTimes(1);
    expect(ConsulClass.mock.results[0].value.watch.mock.results[0].value.end).toBeCalledTimes(1);
    expect(consul.consulInstance.agent.service.deregister).toBeCalledTimes(1);
    expect(consul.consulInstance.agent.service.deregister).toBeCalledWith(registerData.id);
  });
});
