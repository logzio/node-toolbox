jest.mock('consul', () =>
  jest.fn().mockImplementation(() => ({
    watch: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      end: jest.fn(),
    })),
    kv: {
      get: jest.fn(),
      set: jest.fn(),
    },
    agent: {
      service: {
        register: jest.fn(),
        deregister: jest.fn(),
        list: jest.fn(),
      },
      check: {
        list: jest.fn(),
      },
    },
  })),
);

const registerData = {
  meta: {
    meta: 'data',
  },
  checks: [
    {
      http: 'http://localhost',
      deregistercriticalserviceafter: '6s',
      interval: '5m',
    },
  ],
  address: 'address',
  hostname: 'hostname82',
  serviceName: 'serviceName82',
  port: 8282,
  registerInterval: 0,
};

const connectionOptions = {
  host: 'localhost',
  port: 8282,
  promisify: true,
};

const passedConnectOptions = {
  connectMaxRetries: 0,
  connectRetryBackoffFactor: 0,
  failOnFailedConnection: false,
};

module.exports = {
  registerData,
  connectionOptions,
  passedConnectOptions,
};
