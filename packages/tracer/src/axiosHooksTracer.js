import opentracing from 'opentracing';

export function axiosHooksTracer({ axios, tracer, shouldIgnore, onStartSpan, onFinishSpan, onError, tags } = {}) {
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
      console.log(1);
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
