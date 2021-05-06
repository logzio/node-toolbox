interface AnyObject {
  [key: string]: any;
}

export type ExporterOptions = {
  type?: string;
  probability?: number;
  host?: string;
  port?: number;
  interval?: number;
};

export interface TracerOptions {
  serviceName: string;
  carrierType?: string;
  debug?: boolean;
  tags?: AnyObject;
  shouldIgnore?: void;
  onStartSpan?: void;
  onFinishSpan?: void;
  exporterOptions?: ExporterOptions;
}

export type StartSpanParams = {
  operation: string;
  tags?: AnyObject;
  carrier?: string;
};

export type FinishSpanParams = {
  span: AnyObject;
  tags?: AnyObject;
  carrier?: string;
};

export declare class Tracer {
  public constructor(tracerOptions: TracerOptions);
  public startSpan(startSpanParams: StartSpanParams): Span;
  public finishSpan(finishSpanParams: FinishSpanParams): void;
  public close(): void;
}

export type TracerParams = {
  server: AnyObject;
  tracer: Tracer;
  tags?: AnyObject;
  shouldIgnore?: void;
  onStartSpan?: void;
  onFinishSpan?: void;
  onError?: void;
};

export function nodeHttpTracer(tracerParams: TracerParams): void;
export function hapiHttpTracer(tracerParams: TracerParams): void;
export function middlewareTracer(tracerParams: TracerParams): void;

export type AxiosHooksTracerParams = {
  axios: AnyObject;
  tracer: Tracer;
  tags?: AnyObject;
  shouldIgnore?: void;
  onStartSpan?: void;
  onFinishSpan?: void;
  onError?: void;
  kind?: string;
};

export function axiosHooksTracer(axiosHooksTracerParams: AxiosHooksTracerParams): void;
