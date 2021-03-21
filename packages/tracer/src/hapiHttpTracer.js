export const hapiHttpTracer = ({ server, tracer, shouldIgnore, onStartSpan, onFinishSpan, onError, tags }) => {
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
        if (request.route && request.route.path)
          span.setOperationName(`${request.route.method.toUpperCase()}: ${request.route.path}`);

        let error = null;

        if (request.response.source && request.response.source.error) {
          error = {
            message: request.response.source.message,
            type: request.response.source.error,
            stack: {},
          };
        }
        onFinishSpan?.({ span, req: request, res: request.response });
        tracer.finishSpan({ span, tags, error, statusCode: request.response.statusCode });
      }
    } catch (err) {
      onError?.({ message: 'failed to finish span', error: err });
    }
  });
};
