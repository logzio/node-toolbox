import { default as api } from '@opentelemetry/api';
import { default as core } from '@opentelemetry/core';
import { default as node } from '@opentelemetry/node';
import { default as tracing } from '@opentelemetry/tracing';
import { default as jaegerExporter } from '@opentelemetry/exporter-jaeger';

export function createTracer({
  debug = false,
  tags = [],
  port = 6832,
  host = 'localhost',
  serviceName = 'node-js',
  maxPacketSize = 65000,
  requestHook,
  responseHook,
  ignoreOutgoingUrls = [],
  ignoreIncomingPaths = [],
  applyCustomAttributesOnSpan,
  probability = 1,
} = {}) {
  const sampler = {};
  if (!debug) sampler.sampler = new core.ProbabilitySampler(probability);

  const provider = new node.NodeTracerProvider({
    logLevel: debug ? core.LogLevel.DEBUG : core.LogLevel.ERROR,
    ...{ sampler },
    plugins: {
      http: {
        ignoreOutgoingUrls,
        ignoreIncomingPaths,
        applyCustomAttributesOnSpan,
        requestHook,
        responseHook,
      },
    },
  });

  provider.register();

  const exporter = new jaegerExporter.JaegerExporter({
    serviceName,
    tags,
    host,
    port,
    maxPacketSize,
  });

  provider.addSpanProcessor(debug ? new tracing.SimpleSpanProcessor(exporter) : new tracing.BatchSpanProcessor(exporter));

  return api.trace.getTracer(serviceName);
}
