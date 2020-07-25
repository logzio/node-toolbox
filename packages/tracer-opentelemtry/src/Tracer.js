import { default as api } from '@opentelemetry/api';
import { default as core } from '@opentelemetry/core';
import { default as tracing } from '@opentelemetry/tracing';
import { default as jaegerExporter } from '@opentelemetry/exporter-jaeger';

import { default as jaegerHttpTracePropagator } from '@opentelemetry/propagator-jaeger';

const { BasicTracerProvider, ConsoleSpanExporter, SimpleSpanProcessor, BatchSpanProcessor } = tracing;
const { JaegerExporter } = jaegerExporter;
const { ProbabilitySampler, LogLevel, HttpTraceContext, getActiveSpan, setActiveSpan } = core;
const { trace, propagation, defaultSetter, defaultGetter } = api;
const { JaegerHttpTracePropagator } = jaegerHttpTracePropagator;
export class Tracer {
  #tracer;
  #shouldIgnore;
  #onStartSpan;
  #onFinishSpan;

  constructor({
    tags,
    onStartSpan,
    shouldIgnore,
    onFinishSpan,
    debug = false,
    exporterOptions,
    probability = 1,
    traceHeader = 'uber-trace-id',
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

    provider.register({
      propagator: new JaegerHttpTracePropagator(traceHeader),
    });

    this.#tracer = trace.getTracer(serviceName);
  }

  startSpan({ operation, tags = {}, carrier } = {}) {
    if (this.#shouldIgnore && this.#shouldIgnore(operation)) return;

    const context = propagation.extract(carrier);

    const span = this.#tracer.startSpan(operation, {}, context);

    if (tags) span.setAttributes(tags);

    propagation.inject(carrier, defaultGetter, setActiveSpan(context, span));

    return span;
  }

  finishSpan({ span, tags = {} } = {}) {
    if (!span) return;
    if (tags) span.setAttributes(tags);

    if (this.#onFinishSpan) this.#onFinishSpan(span);

    span.end();
  }
}
