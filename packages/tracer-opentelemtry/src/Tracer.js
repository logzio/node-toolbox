import { default as api } from '@opentelemetry/api';
import { default as core } from '@opentelemetry/core';
import { default as tracing } from '@opentelemetry/tracing';
import { default as jaegerExporter } from '@opentelemetry/exporter-jaeger';
import { default as jaegerHttpTracePropagator } from '@opentelemetry/propagator-jaeger';

const { BasicTracerProvider, ConsoleSpanExporter, SimpleSpanProcessor, BatchSpanProcessor } = tracing;
const { JaegerExporter } = jaegerExporter;
const { ProbabilitySampler, LogLevel, setActiveSpan } = core;
const { trace, propagation, defaultSetter, defaultGetter } = api;
const { JaegerHttpTracePropagator, UBER_TRACE_ID_HEADER } = jaegerHttpTracePropagator;

export class Tracer {
  #tracer;
  #shouldIgnore;
  #onStartSpan;
  #onFinishSpan;
  #propagator;

  constructor({
    tags = {},
    onStartSpan,
    shouldIgnore,
    onFinishSpan,
    debug = false,
    exporterOptions,
    probability = 1,
    userJaeger = true,
    traceHeader = UBER_TRACE_ID_HEADER,
    serviceName = 'node-js',
  } = {}) {
    this.#shouldIgnore = shouldIgnore;
    this.#onStartSpan = onStartSpan;
    this.#onFinishSpan = onFinishSpan;
    const providerOptions = {
      defaultAttributes: tags,
    };

    if (debug) {
      providerOptions.logger = console;
      providerOptions.logLevel = LogLevel.DEBUG;
    } else {
      providerOptions.sampler = new ProbabilitySampler(probability);
    }

    const provider = new BasicTracerProvider(providerOptions);

    const exporter = new JaegerExporter({
      serviceName,
      host: 'localhost',
      port: 6832,
      maxPacketSize: 65000,
      ...exporterOptions,
    });

    if (debug) {
      provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
      provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
    } else {
      provider.addSpanProcessor(new BatchSpanProcessor(exporter));
    }

    let providerRegisterOptions = {};

    if (userJaeger) {
      this.#propagator = new JaegerHttpTracePropagator(traceHeader);
      providerRegisterOptions.propagator = this.#propagator;
      // propagation.setGlobalPropagator(this.#propagator);
    }

    provider.register(providerRegisterOptions);
    this.#tracer = trace.getTracer(serviceName);
  }

  startSpan({ operation, tags = {}, carrier } = {}) {
    if (this.#shouldIgnore && this.#shouldIgnore(operation)) return;

    const currentContext = propagation.extract(carrier, defaultGetter);

    const span = this.#tracer.startSpan(operation, { attributes: tags }, currentContext);

    const activeContext = setActiveSpan(currentContext, span);

    propagation.inject(carrier, defaultSetter, activeContext);

    if (this.#onStartSpan) this.#onStartSpan(span, carrier);

    return span;
  }

  finishSpan({ span, tags = {} } = {}) {
    if (!span) return;
    if (tags) span.setAttributes(tags);

    if (this.#onFinishSpan) this.#onFinishSpan(span);

    span.end();
  }
}
