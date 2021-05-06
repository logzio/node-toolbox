interface AnyObject {
  [key: string]: any;
}

export type Span = AnyObject;

export type ExporterOptions = {
  type?: string;
  probability?: number;
  host?: string;
  port?: number;
  interval?: number;
};

export type OnStartSpanParams = {
  span?: AnyObject;
  req?: AnyObject;
  res?: AnyObject;
};

export type OnErrorParams = {
  err?: AnyObject;
  message?: string;
};

export type shouldIgnoreFunction = (url: string) => boolean;
export type onStartSpanFunction = (onStartSpanParams: OnStartSpanParams) => void;
export type onFinishSpanFunction = (span: Span) => void;
export type onErrorFunction = (onErrorParams: OnErrorParams) => void;

export type TracerParams = {
  server: AnyObject;
  tracer: Tracer;
  tags?: AnyObject;
  shouldIgnore?: shouldIgnoreFunction;
  onStartSpan?: onStartSpanFunction;
  onFinishSpan?: onFinishSpanFunction;
  onError?: onErrorFunction;
};

export interface TracerConstructiorOtions {
  serviceName: string;
  carrierType?: string;
  debug?: boolean;
  tags?: AnyObject;
  debug?: boolean;
  shouldIgnore?: shouldIgnoreFunction;
  onStartSpan?: onStartSpanFunction;
  onFinishSpan?: onFinishSpanFunction;
  onError?: onErrorFunction;
}

export type StartSpanParams = {
  url: string;
  operation: string;
  method: string;
  tags?: AnyObject;
  carrier?: string;
};

export type FinishSpanParams = {
  span: Span;
  tags?: AnyObject;
  statusCode?: number;
  error?: void;
};

export declare class Tracer {
  public constructor(tracerConstructiorOtions: TracerConstructiorOtions);
  public startSpan(startSpanParams: StartSpanParams): Span;
  public finishSpan(finishSpanParams: FinishSpanParams): void;
  public close(): void;
}

export function nodeHttpTracer(tracerParams: TracerParams): void;
export function hapiHttpTracer(tracerParams: TracerParams): void;
export function middlewareTracer(tracerParams: TracerParams): void;

export type AxiosHooksTracerParams = {
  axios: AnyObject;
  tracer: Tracer;
  tags?: AnyObject;
  shouldIgnore?: shouldIgnoreFunction;
  onStartSpan?: onStartSpanFunction;
  onFinishSpan?: onFinishSpanFunction;
  onError?: onErrorFunction;
  kind?: string;
};

export function axiosHooksTracer(axiosHooksTracerParams: AxiosHooksTracerParams): void;
