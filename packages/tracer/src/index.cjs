'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var opentracing = _interopDefault(require('opentracing'));
var jaegerClient = _interopDefault(require('jaeger-client'));

const { initTracer } = jaegerClient;

class Tracer {
  #tracer;
  #shouldIgnore;
  #onStartSpan;
  #onFinishSpan;
  #carrierType;

  constructor({
    tags = {},
    onStartSpan,
    shouldIgnore,
    onFinishSpan,
    debug = false,
    exporterOptions = {},
    serviceName = 'node-js',
    carrierType = opentracing.FORMAT_HTTP_HEADERS,
  }) {
    this.#shouldIgnore = shouldIgnore;
    this.#onStartSpan = onStartSpan;
    this.#onFinishSpan = onFinishSpan;
    this.#carrierType = carrierType;

    let sampler = {
      type: exporterOptions.type ?? 'const',
      param: exporterOptions.probability ?? 1,
    };

    const reporter = {
      agentHost: exporterOptions.host ?? 'localhost',
      agentPort: exporterOptions.port ?? 6832,
      flushIntervalMs: exporterOptions.interval ?? 2000,
    };

    const config = {
      serviceName,
      sampler,
      reporter,
    };

    const options = {
      tags,
    };

    if (debug) {
      sampler = {
        type: 'const',
        param: 1,
      };
      reporter.logSpans = true;
      options.logger = console;
    }

    this.#tracer = initTracer(config, options);
  }

  startSpan({ operation, tags = {}, carrier } = {}) {
    if (this.#shouldIgnore?.(operation)) return;
    const rootSpan = this.#tracer.extract(this.#carrierType, carrier);

    const span = this.#tracer.startSpan(operation, {
      childOf: rootSpan,
      tags: {
        [opentracing.Tags.SPAN_KIND]: opentracing.Tags.SPAN_KIND_RPC_SERVER,
        ...tags,
      },
    });

    this.onStartSpan?.(span);

    this.#tracer.inject(span, this.#carrierType, carrier);

    return span;
  }

  finishSpan({ span, tags = {} } = {}) {
    if (!span) return;
    if (tags) span.addTags(tags);

    if (this.#onFinishSpan) this.#onFinishSpan(span);

    span.finish();
  }

  close() {
    return new Promise(resolve => this.#tracer.close(resolve));
  }
}

function nodeHttpTracer({ server, tracer, tags = {}, shouldIgnore, onStartSpan, onFinishSpan, onError } = {}) {
  if (!server || !tracer) return;

  server.on('request', (req, res) => {
    let span = null;
    const { originalUrl, baseUrl, _parsedUrl = {}, route = {}, method, headers } = req;
    try {
      if (shouldIgnore && shouldIgnore(originalUrl)) return;

      let operation = `${method.toUpperCase()}: ${baseUrl}`;

      if (route.path && route.path !== '*') operation += route.path;
      else operation += _parsedUrl.pathname;

      const _tags = {
        [opentracing.Tags.HTTP_URL]: originalUrl,
        [opentracing.Tags.HTTP_METHOD]: method,
        ...tags,
      };

      span = tracer.startSpan({ operation, tags: _tags, carrier: headers });
      onStartSpan?.({ span, req, res });
    } catch (err) {
      onError?.({ message: `failed to create span ${err.message}`, error: err });
    }

    const handlerError = error => {
      try {
        span.log({ event: 'error', message: error?.message, stack: error?.stack, type: error?.type });
        const _tags = {
          [opentracing.Tags.ERROR]: true,
          [opentracing.Tags.HTTP_STATUS_CODE]: res.statusCode || 500,
        };

        onFinishSpan?.(span, error);
        tracer.finishSpan({ span, tags: _tags });
      } catch (err) {
        onError?.({ message: `failed to finish span ${err.message}`, error: err });
      }
    };

    res.on('error', handlerError);
    req.on('error', handlerError);

    req.on('close', () => {
      try {
        const _tags = {
          [opentracing.Tags.HTTP_STATUS_CODE]: res.statusCode,
        };
        onFinishSpan?.(span, req, res);
        tracer.finishSpan({ span, tags: _tags });
      } catch (err) {
        onError?.({ message: `failed to finish span ${err.message}`, error: err });
      }
    });
  });
}

const hapiHttpTracer = ({ server, tracer, shouldIgnore, onError, tags }) => {
  server.ext({
    type: 'onRequest',
    method: (request, h) => {
      try {
        if (!shouldIgnore(request.path)) {
          const { path, raw, method, headers } = request;

          const span = tracer.startSpan({
            operation: path,
            carrier: headers,
            tags: {
              [opentracing.Tags.HTTP_URL]: raw.req.url,
              [opentracing.Tags.HTTP_METHOD]: method,
              ...tags,
            },
          });

          request.app.span = span;
        }
      } catch (err) {
        onError?.({ message: 'failed to create span', error: err });
      }

      return h.continue;
    },
  });

  server.events.on('response', request => {
    try {
      const { span } = request.app;

      if (span) {
        if (request.route && request.route.path)
          span.setOperationName(`${request.route.method.toUpperCase()}: ${request.route.path}`);

        const { statusCode } = request.response;

        tags = {
          [opentracing.Tags.HTTP_STATUS_CODE]: statusCode,
        };
        let error = null;

        if (request.response.source && request.response.source.error) {
          error = {
            message: request.response.source.message,
            type: request.response.source.error,
            stack: {},
          };
        }
        if (error) {
          span.log({ event: 'error', message: error?.message, stack: error?.stack, type: error?.type });
          tags[opentracing.Tags.ERROR] = true;
        }

        tracer.finishSpan({ span, tags });
      }
    } catch (err) {
      onError?.({ message: 'failed to finish span', error: err });
    }
  });

  return tracer;
};

function middlewareTracer({ tracer, tags = {}, shouldIgnore, onStartSpan, onFinishSpan, onError } = {}) {
  if (!tracer)
    return function (req, res, next) {
      next();
    };

  const setOperationName = (req, span) => {
    try {
      const { originalUrl, baseUrl, _parsedUrl = {}, route = {}, method } = req;

      if (shouldIgnore && shouldIgnore(originalUrl)) return;

      let operation = `${method.toUpperCase()}: ${baseUrl}`;

      if (route.path && route.path !== '*') operation += route.path;
      else operation += _parsedUrl.pathname;

      span.setOperationName(operation);
    } catch (err) {
      onError?.({ message: `failed to set operation name ${err.message}`, error: err });
    }
  };

  return (req, res, next) => {
    let span = null;

    const { originalUrl, method, headers } = req;
    try {
      if (shouldIgnore && shouldIgnore(originalUrl)) return;

      const _tags = {
        [opentracing.Tags.HTTP_URL]: originalUrl,
        [opentracing.Tags.HTTP_METHOD]: method,
        ...tags,
      };

      span = tracer.startSpan({ operation: originalUrl, tags: _tags, carrier: headers });
      onStartSpan?.({ span, req, res });
    } catch (err) {
      onError?.({ message: `failed to create span ${err.message}`, error: err });
    }

    const handlerError = error => {
      try {
        setOperationName(req, span);
        span.log({ event: 'error', message: error?.message, stack: error?.stack, type: error?.type });
        const _tags = {
          [opentracing.Tags.ERROR]: true,
          [opentracing.Tags.HTTP_STATUS_CODE]: res.statusCode || 500,
        };

        onFinishSpan?.(span, error);
        tracer.finishSpan({ span, tags: _tags });
      } catch (err) {
        onError?.({ message: `failed to finish span ${err.message}`, error: err });
      }
    };

    res.on('error', handlerError);
    req.on('error', handlerError);

    req.on('close', () => {
      try {
        const _tags = {
          [opentracing.Tags.HTTP_STATUS_CODE]: res.statusCode,
        };
        setOperationName(req, span);
        onFinishSpan?.(span, req, res);
        tracer.finishSpan({ span, tags: _tags });
      } catch (err) {
        onError?.({ message: `failed to finish span ${err.message}`, error: err });
      }
    });

    next();
  };
}

function axiosHooksTracer({ axios, tracer, shouldIgnore, onStartSpan, onFinishSpan, onError, tags } = {}) {
  if (!axios || !tracer) return;

  axios.interceptors.request.use(
    function (config) {
      try {
        if (!shouldIgnore || !shouldIgnore(config.url)) {
          const span = tracer.startSpan({
            operation: config.url,
            carrier: config.headers,
            tags: {
              ...config?.meta?.tags,
              [opentracing.Tags.HTTP_URL]: config.url,
              [opentracing.Tags.HTTP_METHOD]: config.method,
              ...tags,
            },
          });

          onStartSpan?.(span, config);

          if (!config.meta) config.meta = {};

          config.meta.span = span;
        }
      } catch (err) {
        onError?.({ message: `failed to start span ${err.message}`, error: err });
      }

      return config;
    },
    function (error) {
      try {
        if (error?.config?.meta?.span) {
          const { span, ...meta } = error.config.meta;

          span.log({ event: 'error', message: error?.message, stack: error?.stack, type: error?.type || error?.code });
          const tags = {
            [opentracing.Tags.ERROR]: true,
            [opentracing.Tags.HTTP_STATUS_CODE]: error?.response?.status || 500,
          };

          onFinishSpan?.(span, error);
          tracer.finishSpan({ span, tags });
          error.config.meta = meta;
        }
      } catch (err) {
        onError?.({ message: `failed to finish span ${err.message}`, error: err });
      }

      return Promise.reject(error);
    },
  );

  axios.interceptors.response.use(
    function (response) {
      try {
        if (response.config && response.config.meta && response.config.meta.span) {
          const { span, ...meta } = response.config.meta;
          onFinishSpan?.(span, response);

          const tags = {
            [opentracing.Tags.HTTP_STATUS_CODE]: response.status,
          };

          tracer.finishSpan({ span, tags });
          response.config.meta = meta;
        }
      } catch (err) {
        onError?.({ message: `failed to finish span ${err.message}`, error: err });
      }

      return response;
    },
    function (error) {
      try {
        if (error?.config?.meta?.span) {
          const { span, ...meta } = error.config.meta;

          const status = error?.response?.status || 500;
          span.log({ event: 'error', message: error?.message, stack: error?.stack, type: error?.type || error?.code });

          const tags = {
            [opentracing.Tags.ERROR]: true,
            [opentracing.Tags.HTTP_STATUS_CODE]: status,
          };

          onFinishSpan?.(span, error);
          tracer.finishSpan({ span, tags });
          error.config.meta = meta;
        }
      } catch (err) {
        onError?.({ message: `failed to finish span ${err.message}`, error: err });
      }

      return Promise.reject(error);
    },
  );
}

exports.Tracer = Tracer;
exports.axiosHooksTracer = axiosHooksTracer;
exports.hapiHttpTracer = hapiHttpTracer;
exports.middlewareTracer = middlewareTracer;
exports.nodeHttpTracer = nodeHttpTracer;
