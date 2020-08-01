import opentracing from 'opentracing';

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

      const _tags = {
        [opentracing.Tags.HTTP_URL]: originalUrl,
        [opentracing.Tags.HTTP_METHOD]: method,
        ...tags,
      };

      span = tracer.startSpan({ operation: originalUrl, tags: _tags, carrier: headers });
      onStartSpan?.({ span, req, res });
    } catch (err) {
      onError?.({ message: `failed to create span ${err.message}`, error: err });
    }

    const handlerError = error => {
      try {
        setOperationName(req, span);
        span.log({ event: 'error', message: error?.message, stack: error?.stack, type: error?.type });
        const _tags = {
          [opentracing.Tags.ERROR]: true,
          [opentracing.Tags.HTTP_STATUS_CODE]: res.statusCode || 500,
        };

        onFinishSpan?.(span, error);
        tracer.finishSpan({ span, tags: _tags });
      } catch (err) {
        onError?.({ message: `failed to finish span ${err.message}`, error: err });
      }
    };

    res.on('error', handlerError);
    req.on('error', handlerError);

    req.on('close', () => {
      try {
        const _tags = {
          [opentracing.Tags.HTTP_STATUS_CODE]: res.statusCode,
        };
        setOperationName(req, span);
        onFinishSpan?.(span, req, res);
        tracer.finishSpan({ span, tags: _tags });
      } catch (err) {
        onError?.({ message: `failed to finish span ${err.message}`, error: err });
      }
    });

    next();
  };
}
