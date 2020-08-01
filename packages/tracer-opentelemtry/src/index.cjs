'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var api = _interopDefault(require('@opentelemetry/api'));
var core = _interopDefault(require('@opentelemetry/core'));
var tracing = _interopDefault(require('@opentelemetry/tracing'));
var jaegerExporter = _interopDefault(require('@opentelemetry/exporter-jaeger'));
var jaegerHttpTracePropagator = _interopDefault(require('@opentelemetry/propagator-jaeger'));

const { BasicTracerProvider, ConsoleSpanExporter, SimpleSpanProcessor, BatchSpanProcessor } = tracing;
const { JaegerExporter } = jaegerExporter;
const { ProbabilitySampler, LogLevel, HttpTraceContext, getActiveSpan, setActiveSpan } = core;
const { trace, propagation, defaultSetter, defaultGetter } = api;
const { JaegerHttpTracePropagator } = jaegerHttpTracePropagator;
class Tracer {
  #tracer;
  #shouldIgnore;
  #onStartSpan;
  #onFinishSpan;

  constructor({
    tags,
    onStartSpan,
    shouldIgnore,
    onFinishSpan,
    debug = false,
    exporterOptions,
    probability = 1,
    traceHeader = 'uber-trace-id',
    serviceName = 'node-js',
  } = {}) {
    this.#shouldIgnore = shouldIgnore;
    this.#onStartSpan = onStartSpan;
    this.#onFinishSpan = onFinishSpan;

    const providerOptions = {
      defaultAttributes: tags,
    };

    if (debug) {
      providerOptions.logger = console;
      providerOptions.logLevel = LogLevel.DEBUG;
    } else {
      providerOptions.sampler = new ProbabilitySampler(probability);
    }

    const provider = new BasicTracerProvider(providerOptions);

    const exporter = new JaegerExporter({
      serviceName,
      host: 'localhost',
      port: 6832,
      maxPacketSize: 65000,
      ...exporterOptions,
    });

    if (debug) {
      provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
      provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
    } else {
      provider.addSpanProcessor(new BatchSpanProcessor(exporter));
    }

    provider.register({
      propagator: new JaegerHttpTracePropagator(traceHeader),
    });

    this.#tracer = trace.getTracer(serviceName);
  }

  startSpan({ operation, tags = {}, carrier } = {}) {
    if (this.#shouldIgnore && this.#shouldIgnore(operation)) return;

    const context = propagation.extract(carrier);

    const span = this.#tracer.startSpan(operation, {}, context);

    if (tags) span.setAttributes(tags);

    propagation.inject(carrier, defaultGetter, setActiveSpan(context, span));

    return span;
  }

  finishSpan({ span, tags = {} } = {}) {
    if (!span) return;
    if (tags) span.setAttributes(tags);

    if (this.#onFinishSpan) this.#onFinishSpan(span);

    span.end();
  }
}

const { CanonicalCode } = api;

function nodeHttpTracer({ server, tracer, tags = {}, shouldIgnore, onStartSpan, onFinishSpan, onError } = {}) {
  if (!server || !tracer) throw new Error('must provide server and tracer');

  server.on('request', (req, res) => {
    let span = null;
    const { originalUrl, baseUrl, _parsedUrl = {}, route = {}, method, headers } = req;
    try {
      if (shouldIgnore && shouldIgnore(originalUrl)) return;

      let operation = `${method.toUpperCase()}: ${baseUrl}`;

      if (route.path && route.path !== '*') operation += route.path;
      else operation += _parsedUrl.pathname;

      const _tags = {
        url: originalUrl,
        method,
        ...tags,
      };

      span = tracer.startSpan({ operation, tags: _tags, carrier: headers });
      onStartSpan?.(span, req, res);
    } catch (err) {
      onError?.({ message: `failed to create span ${err.message}`, error: err });
    }

    res.on('error', error => {
      try {
        const { statusCode, statusMessage } = res;

        span.addEvent('error', { error });
        span.setStatus({
          code: CanonicalCode.UNKNOWN,
          message: statusMessage,
        });

        onFinishSpan?.(span, error);
        tracer.finishSpan({ span, tags: { statusCode }, carrier: headers });
      } catch (err) {
        onError?.({ message: `failed to finish span ${err.message}`, error: err });
      }
    });

    req.on('error', error => {
      try {
        const { statusCode, statusMessage } = res;

        span.addEvent('error', { error });
        span.setStatus({
          code: CanonicalCode.UNKNOWN,
          message: statusMessage,
        });
        onFinishSpan?.(span, error);
        tracer.finishSpan({ span, tags: { statusCode }, carrier: headers });
      } catch (err) {
        onError?.({ message: `failed to finish span ${err.message}`, error: err });
      }
    });

    res.on('finish', () => {
      try {
        onFinishSpan?.(span, req, res);
        tracer.finishSpan({ span, tags: { statusCode: res.statusCode }, carrier: headers });
      } catch (err) {
        onError?.({ message: `failed to finish span ${err.message}`, error: err });
      }
    });
  });
}

const { CanonicalCode: CanonicalCode$1 } = api;
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
              url: raw.req.url,
              method,
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
          span._operationName = `${request.route.method.toUpperCase()}: ${request.route.path}`;

        const { statusCode: status } = request.response;
        let error = null;

        if (request.response.source && request.response.source.error) {
          error = {
            message: request.response.source.message,
            type: request.response.source.error,
            stack: {},
          };
        }
        if (error) {
          span.addEvent('error', { error });
          span.setStatus({
            code: CanonicalCode$1.UNKNOWN,
            message: error.message,
          });
        }

        tracer.finishSpan({ span, tags: { statusCode: status } });
      }
    } catch (err) {
      onError?.({ message: 'failed to finish span', error: err });
    }
  });

  return tracer;
};

const { CanonicalCode: CanonicalCode$2 } = api;

function axiosHooksTracer({ axios, tracer, shouldIgnore, onStartSpan, onFinishSpan, onError, tags } = {}) {
  if (!axios) return;

  if (!tracer) throw new Error('must provide tracer');

  axios.interceptors.request.use(
    function (config) {
      try {
        if (!shouldIgnore || !shouldIgnore(config.url)) {
          const span = tracer.startSpan({
            operation: config.url,
            carrier: config.headers,
            tags: {
              url: config.url,
              method: config.method,
              ...tags,
              ...config?.meta?.tags,
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
        if (error.config && error.config.meta && error.config.meta.span) {
          const { span, ...meta } = error.config.meta;

          const err = error.error || error.message || 'request error';
          span.addEvent('error', { error: err });
          span.setStatus({
            code: CanonicalCode$2.UNKNOWN,
            message: err.message,
          });
          onFinishSpan?.(span, error);
          tracer.finishSpan({ span, tags: { statusCode: 500 } });
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
          tracer.finishSpan({ span, tags: { statusCode: response.status } });
          response.config.meta = meta;
        }
      } catch (err) {
        onError?.({ message: `failed to finish span ${err.message}`, error: err });
      }

      return response;
    },
    function (error) {
      try {
        if (error.config && error.config.meta && error.config.meta.span) {
          const { span, ...meta } = error.config.meta;
          const err = error.error || error.message || 'request error';

          const status = error.response && error.response.status;

          span.addEvent('error', { error: err });
          span.setStatus({
            code: CanonicalCode$2.UNKNOWN,
            message: err.message,
          });
          onFinishSpan?.(span, error);
          tracer.finishSpan({ span, tags: { statusCode: status } });
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
exports.nodeHttpTracer = nodeHttpTracer;
