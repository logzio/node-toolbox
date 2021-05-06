import opentracing from 'opentracing';
import { default as jaegerClient } from 'jaeger-client';
const { initTracer } = jaegerClient;
const { FORMAT_HTTP_HEADERS } = opentracing;

const defaultExporterOptions = { type: 'probabilistic', probability: 1, host: 'localhost', port: 6832, interval: 2000 };
export class Tracer {
  #tracer;
  #shouldIgnore;
  #onStartSpan;
  #onFinishSpan;
  #carrierType;

  constructor({
    tags = {},
    onStartSpan,
    shouldIgnore,
    onFinishSpan,
    debug = false,
    exporterOptions = {},
    serviceName = 'node-js',
    carrierType = FORMAT_HTTP_HEADERS,
  }) {
    this.#shouldIgnore = shouldIgnore;
    this.#onStartSpan = onStartSpan;
    this.#onFinishSpan = onFinishSpan;
    this.#carrierType = carrierType;

    const finalExportOptions = {
      ...defaultExporterOptions,
      ...exporterOptions,
    };
    let sampler = {
      type: finalExportOptions.type ?? 'probabilistic',
      param: finalExportOptions.probability ?? 1,
    };

    const reporter = {
      agentHost: finalExportOptions.host ?? 'localhost',
      agentPort: finalExportOptions.port ?? 6832,
      flushIntervalMs: finalExportOptions.interval ?? 2000,
    };

    const options = {
      tags,
    };

    if (debug) {
      sampler = {
        type: 'const',
        param: 1,
      };
      reporter.logSpans = true;
      options.logger = console;
    }

    const config = {
      serviceName,
      sampler,
      reporter,
    };

    this.#tracer = initTracer(config, options);
  }

  startSpan({ operation, url, method, tags = {}, carrier, kind = opentracing.Tags.SPAN_KIND_RPC_SERVER } = {}) {
    if (this.#shouldIgnore?.(operation)) return;
    const rootSpan = this.#tracer.extract(this.#carrierType, carrier);

    tags[opentracing.Tags.SPAN_KIND] = kind;

    if (url) tags[opentracing.Tags.HTTP_URL] = url;
    if (url) tags[opentracing.Tags.HTTP_METHOD] = method;

    const span = this.#tracer.startSpan(operation, {
      childOf: rootSpan,
      tags,
    });

    this.#onStartSpan?.(span);

    this.#tracer.inject(span, this.#carrierType, carrier);

    return span;
  }

  finishSpan({ span, tags = {}, error, statusCode } = {}) {
    if (!span) return;
    if (error) {
      span.log({ event: 'error', message: error.message, stack: error.stack, type: error.type });
      tags[opentracing.Tags.ERROR] = true;
    }

    if (statusCode) tags[opentracing.Tags.HTTP_STATUS_CODE] = statusCode;

    span.addTags(tags);

    if (this.#onFinishSpan) this.#onFinishSpan(span);

    span.finish();
  }

  close() {
    return new Promise(resolve => this.#tracer.close(() => resolve()));
  }
}
