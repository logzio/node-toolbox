import { default as api } from '@opentelemetry/api';
const { CanonicalCode } = api;

export function axiosHooksTracer({ axios, tracer, shouldIgnore, onStartSpan, onFinishSpan, onError, tags } = {}) {
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
            code: CanonicalCode.UNKNOWN,
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
            code: CanonicalCode.UNKNOWN,
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
