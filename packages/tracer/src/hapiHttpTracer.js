import { Tags } from 'opentracing';

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
              [Tags.HTTP_URL]: raw.req.url,
              [Tags.HTTP_METHOD]: method,
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
          [Tags.HTTP_STATUS_CODE]: statusCode,
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
          tags[Tags.ERROR] = true;
        }

        tracer.finishSpan({ span, tags });
      }
    } catch (err) {
      onError?.({ message: 'failed to finish span', error: err });
    }
  });

  return tracer;
};
