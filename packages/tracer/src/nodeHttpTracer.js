import opentracing from 'opentracing';

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

      const _tags = {
        [opentracing.Tags.HTTP_URL]: originalUrl,
        [opentracing.Tags.HTTP_METHOD]: method,
        ...tags,
      };

      span = tracer.startSpan({ operation, tags: _tags, carrier: headers });
      onStartSpan?.({ span, req, res });
    } catch (err) {
      onError?.({ message: `failed to create span ${err.message}`, error: err });
    }

    const handlerError = error => {
      try {
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

    res.on('finish', () => {
      try {
        const _tags = {
          [opentracing.Tags.HTTP_STATUS_CODE]: res.statusCode,
        };
        onFinishSpan?.(span, req, res);
        tracer.finishSpan({ span, tags: _tags });
      } catch (err) {
        onError?.({ message: `failed to finish span ${err.message}`, error: err });
      }
    });
  });
}
