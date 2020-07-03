const { registerData, connectionOptions, passedConnectOptions } = require('./mocks/Consul.mock');

let logger = {};
const ConsulClass = require('consul');
const { Consul } = require('../../config/Consul');

describe('consul', () => {
  beforeEach(() => {
    jest.resetModules();

    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
  });

  it('throw error if no port or host provided', () => {
    expect(() => new Consul()).toThrowError(new Error('consul must have host and port'));
  });

  it('consul must try amount of retries and fail with error', async () => {
    const consul = new Consul({
      failOnFailedConnection: true,
      connectMaxRetries: 2,
      connectRetryBackoffFactor: 0,
      ...connectionOptions,
      logger,
    });

    consul.consulInstance.agent.check.list.mockRejectedValue(new Error('random error'));
    await expect(consul.validateConnected()).rejects.toEqual(
      new Error('CONSUL: failed to connect to consul after 3 attempts with message: random error'),
    );

    expect(consul.consulInstance.agent.check.list).toHaveBeenCalledTimes(3);
    expect(logger.info).toHaveBeenCalledTimes(2);
    expect(ConsulClass).toHaveBeenCalledTimes(1);
    expect(ConsulClass).toHaveBeenCalledWith(connectionOptions);
  });

  it('consul instance should be created with the host and port provided', async () => {
    const consul = new Consul({
      ...passedConnectOptions,
      ...connectionOptions,
      logger,
    });

    ['consulInstance', 'get', 'set', 'watch', 'merge', 'register', 'close'].forEach(name =>
      expect(consul[name]).toBeDefined(),
    );

    expect(ConsulClass).toHaveBeenCalledTimes(1);
    expect(ConsulClass).toHaveBeenCalledWith(connectionOptions);
  });

  it('buildKey should ignore remove prefix slash on key', async () => {
    const consul = new Consul({
      ...passedConnectOptions,
      ...connectionOptions,
      logger,
      baseUrl: '',
    });

    expect(consul.buildKey('nada')).toEqual('nada');
    expect(consul.buildKey('/nada')).toEqual('nada');
  });

  it('buildKey should add slash to key if baseUrl exist', async () => {
    const consul = new Consul({
      ...passedConnectOptions,
      ...connectionOptions,
      logger,
      baseUrl: 'base',
    });

    expect(consul.buildKey('nada')).toEqual('base/nada');
    expect(consul.buildKey('/nada')).toEqual('base/nada');
  });

  it('buildKey should remove slash to key if baseUrl exist', async () => {
    const consul = new Consul({
      ...passedConnectOptions,
      ...connectionOptions,
      logger,
      baseUrl: 'base2/',
    });

    expect(consul.buildKey('nada')).toEqual('base2/nada');
    expect(consul.buildKey('/nada')).toEqual('base2/nada');
  });

  it('watch should return with warn if no onChange or key', async () => {
    const consul = new Consul({
      ...passedConnectOptions,
      ...connectionOptions,
      watchBackoffFactor: 8200,
      watchBackoffMax: 8220,
      logger,
    });

    consul.watch();
    expect(logger.warn).toHaveBeenCalledWith('CONSUL: must provide key and onChange function');
  });

  it('watch should invoke on change', async () => {
    const consul = new Consul({
      ...passedConnectOptions,
      ...connectionOptions,
      watchBackoffFactor: 8200,
      watchBackoffMax: 8220,
      logger,
    });

    let onChangedCalled = false;
    const onChange = data => {
      onChangedCalled = true;
      expect(data).toEqual({ key: 'yablolo', value: { name: 'new name' } });
    };

    consul.watch({ key: 'randomKey', onChange });

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
    expect(onChangedCalled).toBeTruthy();
  });

  it('register should not register if service exist', async () => {
    const consul = new Consul({
      failOnFailedConnection: true,
      connectMaxRetries: 2,
      connectRetryBackoffFactor: 0,
      ...connectionOptions,
      logger,
    });

    consul.consulInstance.agent.service.list
      .mockImplementationOnce(() => new Promise().reject())
      .mockImplementation(() => Promise.resolve({ [registerData.hostname]: { Service: registerData.serviceName } }));

    await consul.register(registerData);

    expect(consul.consulInstance.agent.service.list).toBeCalledTimes(3);
    expect(consul.consulInstance.agent.service.register).toBeCalledTimes(0);
  });

  it('register should not register if service exist', async () => {
    const consul = new Consul({
      failOnFailedConnection: true,
      connectMaxRetries: 2,
      connectRetryBackoffFactor: 0,
      ...connectionOptions,
      logger,
    });

    consul.consulInstance.agent.service.list
      .mockImplementationOnce(() => Promise.resolve({}))
      .mockImplementationOnce(() => Promise.resolve({ [registerData.hostname]: { Service: registerData.serviceName } }));
    await consul.register(registerData);

    expect(consul.consulInstance.agent.service.list).toBeCalledTimes(2);
    expect(consul.consulInstance.agent.service.register).toBeCalledTimes(1);

    const expectedData = {
      meta: registerData.meta,
      checks: registerData.checks,
      address: registerData.address,
      port: registerData.port,
      id: registerData.hostname,
      name: registerData.serviceName,
    };

    expect(consul.consulInstance.agent.service.register).toBeCalledWith(expectedData);
    expect(consul.registerParams.id).toEqual(expectedData.id);
  });

  it('service registration should register and save the id', async () => {
    const consul = new Consul({
      failOnFailedConnection: true,
      connectMaxRetries: 2,
      connectRetryBackoffFactor: 0,
      ...connectionOptions,
      logger,
    });

    consul.consulInstance.agent.service.list
      .mockImplementationOnce(() => Promise.resolve({}))
      .mockImplementationOnce(() => Promise.resolve({ [registerData.hostname]: { Service: registerData.serviceName } }));
    await consul.register(registerData);

    expect(consul.consulInstance.agent.service.list).toBeCalledTimes(2);
    expect(consul.consulInstance.agent.service.register).toBeCalledTimes(1);

    const expectedData = {
      meta: registerData.meta,
      checks: registerData.checks,
      address: registerData.address,
      port: registerData.port,
      id: registerData.hostname,
      name: registerData.serviceName,
    };

    expect(consul.consulInstance.agent.service.register).toBeCalledWith(expectedData);
    expect(consul.registerParams.id).toEqual(expectedData.id);
  });

  it('service registration should retry every registerInterval', async done => {
    const consul = new Consul({
      failOnFailedConnection: true,
      connectMaxRetries: 2,
      connectRetryBackoffFactor: 0,
      ...connectionOptions,
      logger,
    });

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
    const consul = new Consul({
      failOnFailedConnection: true,
      connectMaxRetries: 2,
      connectRetryBackoffFactor: 0,
      ...connectionOptions,
      logger,
    });

    consul.consulInstance.agent.service.list.mockImplementation(() => Promise.resolve({}));

    await consul.register(registerData);
    consul.watch({ key: 'randomKey', onChange: () => {} });
    consul.watch({ key: 'randomKey2', onChange: () => {} });

    await consul.close();

    expect(ConsulClass.mock.results[0].value.watch.mock.results[0].value.end).toBeCalledTimes(1);
    expect(ConsulClass.mock.results[0].value.watch.mock.results[0].value.end).toBeCalledTimes(1);
    expect(consul.consulInstance.agent.service.deregister).toBeCalledTimes(1);
    expect(consul.consulInstance.agent.service.deregister).toBeCalledWith(registerData.hostname);
  });
});
