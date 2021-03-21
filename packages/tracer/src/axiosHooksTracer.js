export function axiosHooksTracer({ axios, tracer, shouldIgnore, onStartSpan, onFinishSpan, onError, tags, kind = 'client' } = {}) {
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
