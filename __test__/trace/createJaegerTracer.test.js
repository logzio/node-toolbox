let initTracer = null;
let createJaegerTracer = null;

const serviceName = 'serviceNameTest';
const host = 'testHost';
const port = '8282';
const samplerPercentage = 10;
const logger = {
  info: jest.fn(),
  error: jest.fn(),
};
const tags = {
  some: 'tag',
};

const createParams = {
  serviceName,
  host,
  port,
  samplerPercentage,
  logger,
  tags,
};

describe('Trace', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.mock('jaeger-client', () => ({
      initTracer: jest.fn().mockImplementation(() => ({
        extract: jest.fn(),
        inject: jest.fn(),
        startSpan: jest.fn().mockImplementation(() => ({
          log: jest.fn(),
          setTag: jest.fn(),
          finish: jest.fn(),
        })),
      })),
    }));
    ({ initTracer } = require('jaeger-client'));

    ({ createJaegerTracer } = require('../../trace'));
  });

  it('throw error if no serviceName host', async () => {
    expect(() => createJaegerTracer()).toThrowError(new Error('createJaegerTracer must have serviceName and host'));
  });

  it('should start the tracer with the right config and options', async () => {
    const options = {
      tags,
      logger,
    };

    const config = {
      serviceName,
      reporter: {
        agentHost: host,
        agentPort: port,
      },
      sampler: {
        type: 'const',
        param: samplerPercentage,
      },
    };

    createJaegerTracer(createParams);
    expect(initTracer).toBeCalledTimes(1);
    expect(initTracer).toHaveBeenCalledWith(config, options);
  });

  it('should create a proper span', async () => {
    const tracer = createJaegerTracer(createParams);

    const url = 'boya';
    const method = 'post';
    const newTags = {
      second: 'tags',
    };

    const headers = { boya: 'boya' };

    const span = tracer.createSpan({ url, method, tags: newTags, headers });

    const { extract, startSpan, inject } = initTracer.mock.results[0].value;

    expect(extract.mock.calls[0]).toEqual(['http_headers', headers]);
    expect(startSpan.mock.calls[0]).toEqual([url, { childOf: undefined, tags: newTags }]);
    expect(inject.mock.calls[0][1]).toEqual('http_headers');
    expect(inject.mock.calls[0][2]).toEqual(headers);
    expect(span.setTag.mock.calls[0]).toEqual(['http.url', url]);
    expect(span.setTag.mock.calls[1]).toEqual(['http.method', method]);
  });

  it('should finish span', async () => {
    const tracer = createJaegerTracer(createParams);

    const url = 'boya';
    const method = 'post';
    const newTags = {
      second: 'tags',
    };

    const headers = { boya: 'boya' };

    const span = tracer.createSpan({ url, method, tags: newTags, headers });
    const status = '8282';
    const error = new Error('yablolo');

    tracer.finishSpan({ span, status, error });

    expect(span.log.mock.calls[0][0]).toEqual({ message: error.message, event: 'error', stack: error.stack });
    expect(span.setTag.mock.calls[2]).toEqual(['error', true]);
    expect(span.setTag.mock.calls[3]).toEqual(['http.status_code', +status]);
    expect(span.finish).toBeCalledTimes(1);
  });
});
