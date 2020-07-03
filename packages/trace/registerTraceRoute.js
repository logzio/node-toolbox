function registerTraceRoute({
  server,
  tracer,
  tags,
  shouldExcludeUrl = null,
  onCreateSpan = null,
  logger = console,
} = {}) {
  if (!server || !tracer) throw new Error('must provide server and tracer');

  server.on('request', req => {
    let span = null;

    try {
      if (shouldExcludeUrl && shouldExcludeUrl(req.url)) return;

      const { url, method, headers } = req || {};

      span = tracer.createSpan({ url, method, headers, tags });

      if (onCreateSpan) onCreateSpan({ req, span });

      req.setEncoding('utf8');
    } catch (err) {
      logger.error({ message: `failed to create span ${err.message}`, error: err });
    }

    req.on('error', error => {
      try {
        tracer.finishSpan({ span, error, status: req.res.statusCode });
      } catch (err) {
        logger.error({ message: `failed to finish span ${err.message}`, error: err });
      }
    });
    req.on('end', () => {
      try {
        tracer.finishSpan({ span, status: req.res.statusCode });
      } catch (err) {
        logger.error({ message: `failed to finish span ${err.message}`, error: err });
      }
    });
  });
}

module.exports = { registerTraceRoute };
