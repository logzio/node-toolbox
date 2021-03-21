export function nodeHttpTracer({ server, tracer, tags = {}, shouldIgnore, onStartSpan, onFinishSpan, onError } = {}) {
  if (!server || !tracer) return;

  server.on('request', (req, res) => {
    let span = null;
    const { originalUrl, baseUrl, _parsedUrl = {}, route = {}, method, headers } = req;
    try {
      if (shouldIgnore && shouldIgnore(originalUrl)) return;

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
        onFinishSpan?.(span, error);
        tracer.finishSpan({ span, statusCode: res.statusCode, error });
      } catch (err) {
        onError?.({ message: `failed to finish span ${err.message}`, error: err });
      }
    };

    res.on('error', handlerError);
    req.on('error', handlerError);

    req.on('close', () => {
      try {
        onFinishSpan?.(span, req, res);
        tracer.finishSpan({ span, statusCode: res.statusCode });
      } catch (err) {
        onError?.({ message: `failed to finish span ${err.message}`, error: err });
      }
    });
  });
}
