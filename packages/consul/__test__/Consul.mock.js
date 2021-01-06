jest.mock('consul', () =>
  jest.fn().mockImplementation(() => ({
    buildKey: jest.fn().mockImplementation(key => key),
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

export const registerData = {
  data: {
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
    id: 'hostname82',
    name: 'serviceName82',
    port: 8282,
  },
  validateRegisteredInterval: 0,
};

export const connectionOptions = {
  host: 'localhost',
  port: 8282,
};
