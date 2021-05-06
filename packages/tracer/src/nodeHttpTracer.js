export function nodeHttpTracer({
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
