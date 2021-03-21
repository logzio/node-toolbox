export function middlewareTracer({ tracer, tags = {}, shouldIgnore, onStartSpan, onFinishSpan, onError } = {}) {
  if (!tracer)
    return function (req, res, next) {
      next();
    };

  const setOperationName = (req, span) => {
    try {
      const { originalUrl, baseUrl, _parsedUrl = {}, route = {}, method } = req;

      if (shouldIgnore && shouldIgnore(originalUrl)) return;

      let operation = `${method.toUpperCase()}: ${baseUrl}`;

      if (route.path && route.path !== '*') operation += route.path;
      else operation += _parsedUrl.pathname;

      span.setOperationName(operation);
    } catch (err) {
      onError?.({ message: `failed to set operation name ${err.message}`, error: err });
    }
  };

  return (req, res, next) => {
    let span = null;

    const { originalUrl, method, headers } = req;
    try {
      if (shouldIgnore && shouldIgnore(originalUrl)) return;

      span = tracer.startSpan({ operation: originalUrl, url: originalUrl, method, carrier: headers, tags });
      onStartSpan?.({ span, req, res });
    } catch (err) {
      onError?.({ message: `failed to create span ${err.message}`, error: err });
    }

    const handlerError = error => {
      try {
        setOperationName(req, span);

        onFinishSpan?.(span, error);
        tracer.finishSpan({ span, statusCode: res.statusCode || 500, error });
      } catch (err) {
        onError?.({ message: `failed to finish span ${err.message}`, error: err });
      }
    };

    res.on('error', handlerError);
    req.on('error', handlerError);

    req.on('close', () => {
      try {
        setOperationName(req, span);
        onFinishSpan?.(span, req, res);
        tracer.finishSpan({ span, statusCode: res.statusCode });
      } catch (err) {
        onError?.({ message: `failed to finish span ${err.message}`, error: err });
      }
    });

    next();
  };
}
