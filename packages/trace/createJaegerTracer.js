const opentracing = require('opentracing');
const { initTracer } = require('jaeger-client');

function createJaegerTracer({
  serviceName,
  host,
  port = 6832,
  tags = {},
  samplerPercentage = 1,
  logger = console,
} = {}) {
  if (!serviceName || !host) throw new Error('createJaegerTracer must have serviceName and host');

  const config = {
    serviceName,
    sampler: { type: 'const', param: samplerPercentage },
    reporter: {
      agentHost: host,
      agentPort: port,
    },
  };

  const options = {
    tags,
    logger,
  };

  const tracerInstance = initTracer(config, options);

  function createSpan({ url, headers = {}, method = 'GET', tags = {} }) {
    const rootSpan = tracerInstance.extract(opentracing.FORMAT_HTTP_HEADERS, headers);
    const currentSpan = tracerInstance.startSpan(url, { childOf: rootSpan, tags });

    tracerInstance.inject(currentSpan, opentracing.FORMAT_HTTP_HEADERS, headers);
    currentSpan.setTag(opentracing.Tags.HTTP_URL, url);
    currentSpan.setTag(opentracing.Tags.HTTP_METHOD, method);

    return currentSpan;
  }

  function finishSpan({ span, status, error = null }) {
    if (error) {
      span.log({ event: 'error', message: error.message, stack: error.stack, type: error.type });
      span.setTag(opentracing.Tags.ERROR, true);
    }

    span.setTag(opentracing.Tags.HTTP_STATUS_CODE, +status);
    span.finish();
  }

  function close() {
    return new Promise(resolve => tracerInstance.close(resolve));
  }

  return {
    close,
    createSpan,
    finishSpan,
  };
}

module.exports = {
  createJaegerTracer,
};
