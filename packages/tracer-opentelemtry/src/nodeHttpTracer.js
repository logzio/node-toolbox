import { default as api } from '@opentelemetry/api';

const { CanonicalCode } = api;

export function nodeHttpTracer({ server, tracer, tags = {}, shouldIgnore, onStartSpan, onFinishSpan, onError } = {}) {
  if (!server || !tracer) throw new Error('must provide server and tracer');

  server.on('request', (req, res) => {
    let span = null;
    const { originalUrl, baseUrl, _parsedUrl = {}, route = {}, method, headers } = req;
    try {
      if (shouldIgnore && shouldIgnore(originalUrl)) return;

      let operation = `${method.toUpperCase()}: ${baseUrl}`;

      if (route.path && route.path !== '*') operation += route.path;
      else operation += _parsedUrl.pathname;

      const _tags = {
        url: originalUrl,
        method,
        ...tags,
      };

      span = tracer.startSpan({ operation, tags: _tags, carrier: headers });
      onStartSpan?.(span, req, res);
    } catch (err) {
      onError?.({ message: `failed to create span ${err.message}`, error: err });
    }

    res.on('error', error => {
      try {
        const { statusCode, statusMessage } = res;

        span.addEvent('error', { error });
        span.setStatus({
          code: CanonicalCode.UNKNOWN,
          message: statusMessage,
        });

        onFinishSpan?.(span, error);
        tracer.finishSpan({ span, tags: { statusCode }, carrier: headers });
      } catch (err) {
        onError?.({ message: `failed to finish span ${err.message}`, error: err });
      }
    });

    req.on('error', error => {
      try {
        const { statusCode, statusMessage } = res;

        span.addEvent('error', { error });
        span.setStatus({
          code: CanonicalCode.UNKNOWN,
          message: statusMessage,
        });
        onFinishSpan?.(span, error);
        tracer.finishSpan({ span, tags: { statusCode }, carrier: headers });
      } catch (err) {
        onError?.({ message: `failed to finish span ${err.message}`, error: err });
      }
    });

    res.on('finish', () => {
      try {
        onFinishSpan?.(span, req, res);
        tracer.finishSpan({ span, tags: { statusCode: res.statusCode }, carrier: headers });
      } catch (err) {
        onError?.({ message: `failed to finish span ${err.message}`, error: err });
      }
    });
  });
}
