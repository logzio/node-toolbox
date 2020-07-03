const axios = require('axios');

axios.interceptors.request.use = jest.fn();
axios.interceptors.response.use = jest.fn();

const { registerTraceToAxios } = require('../../trace');

let tracer = null;
let mockRequest = null;

describe('registerTraceToAxios', () => {
  beforeEach(() => {
    axios.interceptors.request.use.mockReset();
    axios.interceptors.response.use.mockReset();

    tracer = {
      createSpan: jest.fn().mockReturnValue('createdSpan'),
      finishSpan: jest.fn(),
    };

    mockRequest = {
      url: 'defaultUrl',
      method: 'defaultMethod',
      headers: { header1: '123' },
      meta: {
        tags: {
          random: 'tag1',
        },
      },
    };
  });

  it('throw error if tracer', () => {
    expect(() => registerTraceToAxios()).toThrowError(new Error('must provide tracer'));
  });

  it('should create span on request and save the span in the meta', () => {
    registerTraceToAxios({ tracer });

    expect(axios.interceptors.request.use).toBeCalledTimes(1);
    expect(axios.interceptors.response.use).toBeCalledTimes(1);

    const [[onRequest]] = axios.interceptors.request.use.mock.calls;

    onRequest(mockRequest);

    expect(tracer.createSpan).toBeCalledTimes(1);

    const {
      url,
      method,
      headers,
      meta: { tags },
    } = mockRequest;

    expect(tracer.createSpan).toBeCalledWith({ url, method, headers, tags });
    expect(mockRequest.meta.span).toEqual('createdSpan');
  });

  it('should finish span on request Failed', async () => {
    registerTraceToAxios({ tracer });

    const [[, onRequestFailed]] = axios.interceptors.request.use.mock.calls;

    const span = 'removeSpan';
    const error = {
      error: new Error('some error'),
      config: {
        meta: {
          span,
        },
      },
    };

    await expect(onRequestFailed(error)).rejects.toEqual(error);

    expect(tracer.finishSpan).toBeCalledTimes(1);

    expect(tracer.finishSpan).toBeCalledWith({ error: error.error, status: 500, span });
  });

  it('should finish span on response', () => {
    registerTraceToAxios({ tracer });

    const [[onResponse]] = axios.interceptors.response.use.mock.calls;

    const span = 'removeSpan';
    const response = {
      status: 200,
      config: {
        meta: {
          span,
        },
      },
    };

    onResponse(response);

    expect(tracer.finishSpan).toBeCalledTimes(1);
    expect(tracer.finishSpan).toBeCalledWith({ status: 200, span });
    expect(response.config.meta.span).toBeUndefined;
  });

  it('should finish span on response error', async () => {
    registerTraceToAxios({ tracer });

    const [[, onResponseError]] = axios.interceptors.response.use.mock.calls;

    const span = 'removeSpan';
    const error = {
      message: 'some error',
      response: {
        status: 400,
      },
      config: {
        meta: {
          span,
        },
      },
    };

    await expect(onResponseError(error)).rejects.toEqual(error);

    expect(tracer.finishSpan).toBeCalledTimes(1);
    expect(tracer.finishSpan).toBeCalledWith({ status: 400, span, error: 'some error' });
    expect(error.config.meta.span).toBeUndefined;
  });

  it('should exclude url', () => {
    const blockedUrl = 'should/exclude/url';
    const shouldExcludeUrl = url => {
      if (url === blockedUrl) return true;
    };

    registerTraceToAxios({ tracer, shouldExcludeUrl });

    const [[onRequest]] = axios.interceptors.request.use.mock.calls;

    mockRequest.url = blockedUrl;

    const res = onRequest(mockRequest);

    expect(tracer.createSpan).toBeCalledTimes(0);
    expect(res).toEqual(mockRequest);
  });

  it('onCreateSpan should get the created span and request', () => {
    let haveBeenCalled = false;
    const onCreateSpan = ({ req, span }) => {
      haveBeenCalled = true;
      expect(req).toEqual(mockRequest);
      expect(span).toEqual('createdSpan');
    };

    registerTraceToAxios({ tracer, onCreateSpan });

    const [[onRequest]] = axios.interceptors.request.use.mock.calls;

    onRequest(mockRequest);

    expect(haveBeenCalled).toEqual(true);
  });
});
