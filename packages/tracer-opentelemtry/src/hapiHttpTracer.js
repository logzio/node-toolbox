import { default as api } from '@opentelemetry/api';
const { CanonicalCode } = api;
export const hapiHttpTracer = ({ server, tracer, shouldIgnore, onError, tags }) => {
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
            code: CanonicalCode.UNKNOWN,
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
