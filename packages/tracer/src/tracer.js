import opentracing from 'opentracing';
import { default as jaegerClient } from 'jaeger-client';
const { initTracer } = jaegerClient;

/**
 * configuration for tracer.
 * @typedef {Object}  TracerConfig
 * @property {Object} [tags=] tags - key value for default tags for each span.
 * @property {boolean} [debug=false] debug - debug created spans.
 * @property {string} [serviceName=node-js] serviceName - name of the serivce.
 * @property {string} [carrierType=http_headers] carrierType - opentracing carrier types
 * @property {string} [carrierType=http_headers] carrierType - opentracing carrier types
 */

/** Tracer create jaeger-tracer-clinet for easy use */
export class Tracer {
  #tracer;
  #shouldIgnore;
  #onStartSpan;
  #onFinishSpan;
  #carrierType;

  /**
   * constructor description
   * @param {TracerConfig} tracerConfig - config the Tracer.
   */
  constructor({
    tags = {},
    onStartSpan,
    shouldIgnore,
    onFinishSpan,
    debug = false,
    exporterOptions = {},
    serviceName = 'node-js',
    carrierType = opentracing.FORMAT_HTTP_HEADERS,
  }) {
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

    const span = this.#tracer.startSpan(operation, {
      childOf: rootSpan,
      tags: {
        [opentracing.Tags.SPAN_KIND]: opentracing.Tags.SPAN_KIND_RPC_SERVER,
        ...tags,
      },
    });

    this.onStartSpan?.(span);

    this.#tracer.inject(span, this.#carrierType, carrier);

    return span;
  }

  finishSpan({ span, tags = {} } = {}) {
    if (!span) return;
    if (tags) span.addTags(tags);

    if (this.#onFinishSpan) this.#onFinishSpan(span);

    span.finish();
  }

  close() {
    return new Promise(resolve => this.#tracer.close(resolve));
  }
}
