import opentracing from 'opentracing';
import { initTracer } from 'jaeger-client';
export class Tracer {
  #tracer;
  #shouldIgnore;
  #onStartSpan;
  #onFinishSpan;
  #carrierType;

  constructor({
    tags,
    onStartSpan,
    shouldIgnore,
    onFinishSpan,
    debug = false,
    exporterOptions,
    serviceName = 'node-js',
    carrierType = opentracing.FORMAT_HTTP_HEADERS,
  } = {}) {
    this.#shouldIgnore = shouldIgnore;
    this.#onStartSpan = onStartSpan;
    this.#onFinishSpan = onFinishSpan;
    this.#carrierType = carrierType;

    let sampler = {
      type: exporterOptions.type ?? 'const',
      param: exporterOptions.probability ?? 1,
    };

    const reporter = {
      agentHost: exporterOptions.host ?? 'localhost',
      agentPort: exporterOptions.port ?? 6832,
      flushIntervalMs: exporterOptions.interval ?? 2000,
    };

    const config = {
      serviceName,
      sampler,
      reporter,
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

    this.#tracer = initTracer(config, options);
  }

  startSpan({ operation, tags = {}, carrier } = {}) {
    if (this.#shouldIgnore?.(operation)) return;

    const rootSpan = this.#tracer.extract(this.#carrierType, carrier);

    const span = this.#tracer.startSpan(operation, { childOf: rootSpan, tags });

    this.onStartSpan?.(span);

    this.#tracer.inject(span, this.#carrierType, carrier);

    return span;
  }

  finishSpan({ span, tags = {} } = {}) {
    if (!span) return;
    if (tags) span.setTags(tags);

    if (this.#onFinishSpan) this.#onFinishSpan(span);

    span.finish();
  }
}
