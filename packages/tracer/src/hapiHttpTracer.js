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
        if (request?.route?.path)
          span.setOperationName(`${request.route.method.toUpperCase()}: ${request.route.path}`);

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
        tracer.finishSpan({ span, tags, error, statusCode: response.statusCode });
      }
    } catch (err) {
      onError?.({ message: 'failed to finish span', error: err });
    }
  });
};
