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
  carrierType: string;
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
