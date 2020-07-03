const { registerTraceRoute } = require('../../trace');

let tracer = null;
let server = null;
let mockRequest = null;

const tags = {
  random: 'tagy',
};

describe('registerTraceRoute', () => {
  beforeEach(() => {
    jest.resetModules();
    server = {
      on: jest.fn(),
    };
    tracer = {
      createSpan: jest.fn().mockReturnValue('span'),
      finishSpan: jest.fn(),
    };
    mockRequest = {
      on: jest.fn(),
      setEncoding: jest.fn(),
      url: 'defaultUrl',
      method: 'defaultMethod',
      headers: { header1: '123' },
      res: {
        statusCode: 8282,
      },
    };
  });

  it('throw error if no server or tracer', async () => {
    expect(() => registerTraceRoute()).toThrowError(new Error('must provide server and tracer'));
  });

  it('should create and close span', async () => {
    registerTraceRoute({ server, tracer, tags });
    expect(server.on).toBeCalledTimes(1);

    const [[name, emitRequestFn]] = server.on.mock.calls;

    expect(name).toEqual('request');

    emitRequestFn(mockRequest);
    expect(mockRequest.on).toBeCalledTimes(2);
    expect(mockRequest.setEncoding).toBeCalledTimes(1);

    const [[error], [end, onEnd]] = mockRequest.on.mock.calls;

    expect(error).toEqual('error');
    expect(end).toEqual('end');
    onEnd();

    expect(tracer.createSpan).toBeCalledTimes(1);

    const { url, method, headers } = mockRequest;

    expect(tracer.createSpan).toBeCalledWith({ url, method, headers, tags });

    expect(tracer.finishSpan).toBeCalledTimes(1);

    const createdSpan = tracer.createSpan.mock.results[0].value;

    expect(tracer.finishSpan).toBeCalledWith({ span: createdSpan, status: mockRequest.res.statusCode });
  });

  it('should exclude url', async () => {
    const blockedUrl = 'should/exclude/url';
    const shouldExcludeUrl = url => {
      if (url === blockedUrl) return true;
    };

    registerTraceRoute({ server, tracer, shouldExcludeUrl });

    const [[, emitRequestFn]] = server.on.mock.calls;

    emitRequestFn(mockRequest);
    mockRequest.url = blockedUrl;
    emitRequestFn(mockRequest);
    expect(mockRequest.on).toBeCalledTimes(2);
  });

  it('onCreateSpan should get the created span and request', async () => {
    let haveBeenCalled = false;
    const onCreateSpan = ({ req, span }) => {
      haveBeenCalled = true;
      expect(req).toEqual(mockRequest);
      expect(span).toEqual('span');
    };

    registerTraceRoute({ server, tracer, onCreateSpan });

    const [[, emitRequestFn]] = server.on.mock.calls;

    emitRequestFn(mockRequest);

    expect(haveBeenCalled).toEqual(true);
  });

  it('should finish span on error', async () => {
    registerTraceRoute({ server, tracer });

    const [[, emitRequestFn]] = server.on.mock.calls;

    emitRequestFn(mockRequest);

    const [[, onError]] = mockRequest.on.mock.calls;

    const error = new Error('some error');

    onError(error);

    expect(tracer.finishSpan).toBeCalledTimes(1);

    const createdSpan = tracer.createSpan.mock.results[0].value;

    expect(tracer.finishSpan).toBeCalledWith({ span: createdSpan, status: mockRequest.res.statusCode, error });
  });
});
