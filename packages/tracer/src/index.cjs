'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var opentracing = require('opentracing');
var jaegerClient = require('jaeger-client');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var opentracing__default = /*#__PURE__*/_interopDefaultLegacy(opentracing);
var jaegerClient__default = /*#__PURE__*/_interopDefaultLegacy(jaegerClient);

const { initTracer } = jaegerClient__default['default'];
const { FORMAT_HTTP_HEADERS } = opentracing__default['default'];

const defaultExporterOptions = { type: 'probabilistic', probability: 1, host: 'localhost', port: 6832, interval: 2000 };
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
    carrierType = FORMAT_HTTP_HEADERS,
  }) {
    this.#shouldIgnore = shouldIgnore;
    this.#onStartSpan = onStartSpan;
    this.#onFinishSpan = onFinishSpan;
    this.#carrierType = carrierType;

    const finalExportOptions = {
      ...defaultExporterOptions,
      ...exporterOptions,
    };
    let sampler = {
      type: finalExportOptions.type ?? 'probabilistic',
      param: finalExportOptions.probability ?? 1,
    };

    const reporter = {
      agentHost: finalExportOptions.host ?? 'localhost',
      agentPort: finalExportOptions.port ?? 6832,
      flushIntervalMs: finalExportOptions.interval ?? 2000,
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

    const config = {
      serviceName,
      sampler,
      reporter,
    };

    this.#tracer = initTracer(config, options);
  }

  startSpan({ operation, url, method, tags = {}, carrier, kind = opentracing__default['default'].Tags.SPAN_KIND_RPC_SERVER } = {}) {
    if (this.#shouldIgnore?.({ operation, url })) return;
    const rootSpan = this.#tracer.extract(this.#carrierType, carrier);

    tags[opentracing__default['default'].Tags.SPAN_KIND] = kind;

    if (url) tags[opentracing__default['default'].Tags.HTTP_URL] = url;
    if (url) tags[opentracing__default['default'].Tags.HTTP_METHOD] = method;

    const span = this.#tracer.startSpan(operation, {
      childOf: rootSpan,
      tags,
    });

    this.#onStartSpan?.(span);

    this.#tracer.inject(span, this.#carrierType, carrier);

    return span;
  }

  finishSpan({ span, tags = {}, error, statusCode } = {}) {
    if (!span) return;
    if (error) {
      span.log({ event: 'error', message: error.message, stack: error.stack, type: error.type });
      tags[opentracing__default['default'].Tags.ERROR] = true;
    }

    if (statusCode) tags[opentracing__default['default'].Tags.HTTP_STATUS_CODE] = statusCode;

    span.addTags(tags);

    if (this.#onFinishSpan) this.#onFinishSpan(span);

    span.finish();
  }

  close() {
    return new Promise(resolve => this.#tracer.close(() => resolve()));
  }
}

function nodeHttpTracer({
  server,
  tracer,
  tags = {},
  shouldIgnore = null,
  onStartSpan = null,
  onFinishSpan = null,
  onError = null,
} = {}) {
  if (!server || !tracer) return;

  server.on('request', (req, res) => {
    let span = null;
    const { originalUrl, baseUrl, _parsedUrl = {}, route = {}, method, headers } = req;
    try {
      if (shouldIgnore && shouldIgnore(req.url)) return;

      let operation = `${method.toUpperCase()}: ${baseUrl}`;

      if (route.path && route.path !== '*') operation += route.path;
      else operation += _parsedUrl.pathname;

      span = tracer.startSpan({ operation, tags, carrier: headers, url: originalUrl, method });
      onStartSpan?.({ span, req, res });
    } catch (err) {
      onError?.({ message: `failed to create span ${err.message}`, error: err });
    }

    const handlerError = error => {
      try {
        onFinishSpan?.({ span, req, res });
        tracer.finishSpan({ span, statusCode: res.statusCode, error });
      } catch (err) {
        onError?.({ message: `failed to finish span ${err.message}`, error: err });
      }
    };

    res.on('error', handlerError);
    req.on('error', handlerError);

    res.on('finish', () => {
      try {
        tracer.finishSpan({ span, status: res.statusCode });
      } catch (err) {
        onError?.({ message: `failed to finish span ${err.message}`, error: err });
      }
    });

    req.on('close', () => {
      try {
        onFinishSpan?.({ span, req, res });
        tracer.finishSpan({ span, statusCode: res.statusCode });
      } catch (err) {
        onError?.({ message: `failed to finish span ${err.message}`, error: err });
      }
    });
  });
}

const hapiHttpTracer = ({ server, tracer, shouldIgnore, onStartSpan, onFinishSpan, onError, tags }) => {
  server.ext({
    type: 'onRequest',
    method: (request, h) => {
      try {
        if (!shouldIgnore(request.path)) {
          const { path, raw, method, headers } = request;

          const span = tracer.startSpan({
            operation: path,
            carrier: headers,
            url: raw.req.url,
            method,
            tags,
          });
          onStartSpan?.({ span, req: request, res: h });
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
        if (request?.route?.path) span.setOperationName(`${request.route.method.toUpperCase()}: ${request.route.path}`);

        const { response } = request;

        let error = null;

        if (response?.source?.error) {
          error = {
            message: response.source.message,
            type: response.source.error,
            stack: {},
          };
        }
        onFinishSpan?.({ span, req: request, res: response });
        tracer.finishSpan({ span, tags, error, statusCode: response?.statusCode || 520 });
      }
    } catch (err) {
      onError?.({ message: 'failed to finish span', error: err });
    }
  });
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

      span = tracer.startSpan({ operation: originalUrl, url: originalUrl, method, carrier: headers, tags });
      onStartSpan?.({ span, req, res });
    } catch (err) {
      onError?.({ message: `failed to create span ${err.message}`, error: err });
    }

    const handlerError = error => {
      try {
        setOperationName(req, span);

        onFinishSpan?.({ span, res, req });
        tracer.finishSpan({ span, statusCode: res.statusCode || 500, error });
      } catch (err) {
        onError?.({ message: `failed to finish span ${err.message}`, error: err });
      }
    };

    res.on('error', handlerError);
    req.on('error', handlerError);

    req.on('close', () => {
      try {
        setOperationName(req, span);
        onFinishSpan?.({ span, res, req });
        tracer.finishSpan({ span, statusCode: res.statusCode, req });
      } catch (err) {
        onError?.({ message: `failed to finish span ${err.message}`, error: err });
      }
    });

    next();
  };
}

function axiosHooksTracer({ axios, tracer, shouldIgnore, onStartSpan, onFinishSpan, onError, tags, kind = 'client' } = {}) {
  if (!axios || !tracer) return;

  axios.interceptors.request.use(
    function (config) {
      try {
        if (!shouldIgnore || !shouldIgnore(config.url)) {
          const span = tracer.startSpan({
            operation: config.url,
            carrier: config?.headers,
            url: config.url,
            method: config.method,
            kind: config?.meta?.kind || kind,
            tags: {
              ...config?.meta?.tags,
              ...tags,
            },
          });

          onStartSpan?.({ span, req: config });

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

          onFinishSpan?.({ span, res: error });
          tracer.finishSpan({ span, tags, error, statusCode: error?.response?.status || 500 });
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
          onFinishSpan?.({ span, res: response });

          tracer.finishSpan({ span, tags, statusCode: response.status });
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

          onFinishSpan?.({ span, res: error });
          tracer.finishSpan({ span, tags, statusCode: error?.response?.status || 500, error });
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
