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

export type TracerParams = {
  server: AnyObject;
  tracer: Tracer;
  tags?: AnyObject;
  shouldIgnore(url: string): () => boolean;
  onStartSpan(onStartSpanParams: OnStartSpanParams): () => void;
  onFinishSpan(span: AnyObject): () => void;
  onError(onErrorParams: OnErrorParams): () => void;
};

export interface TracerOptions {
  serviceName: string;
  carrierType?: string;
  debug?: boolean;
  tags?: AnyObject;
  shouldIgnore(url: string): () => boolean;
  onStartSpan(onStartSpanParams: OnStartSpanParams): () => void;
  onFinishSpan(span: AnyObject): () => void;
  onError(onErrorParams: OnErrorParams): () => void;
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
  public constructor(tracerOptions: TracerOptions);
  public startSpan(startSpanParams: StartSpanParams): Span;
  public finishSpan(finishSpanParams: FinishSpanParams): void;
  public close(): void;
}

export type OnStartSpanParams = {
  span?: AnyObject;
  req?: AnyObject;
  res?: AnyObject;
};

export type OnErrorParams = {
  err?: AnyObject;
  message?: string;
};

export type TracerParams = {
  server: AnyObject;
  tracer: Tracer;
  tags?: AnyObject;
  shouldIgnore(url: string): () => boolean;
  onStartSpan(onStartSpanParams: OnStartSpanParams): () => void;
  onFinishSpan(span: AnyObject): () => void;
  onError(onErrorParams: OnErrorParams): () => void;
};

export function nodeHttpTracer(tracerParams: TracerParams): void;
export function hapiHttpTracer(tracerParams: TracerParams): void;
export function middlewareTracer(tracerParams: TracerParams): void;

export type AxiosHooksTracerParams = {
  axios: AnyObject;
  tracer: Tracer;
  tags?: AnyObject;
  shouldIgnore(url: string): () => boolean;
  onStartSpan(onStartSpanParams: OnStartSpanParams): () => void;
  onFinishSpan(span: AnyObject): () => void;
  onError(onErrorParams: OnErrorParams): () => void;
  kind?: string;
};

export function axiosHooksTracer(axiosHooksTracerParams: AxiosHooksTracerParams): void;
