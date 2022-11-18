interface AnyObject {
  [key: string]: any;
}

export interface ConsulOptions {
  port?: number;
  host?: string;
  baseUrl?: string;
  validateOptions?: ValidateOptions;
  watchOptions?: WatchOptions;
  registerRetryOptions?: RegisterRetryOptions;
}

export interface KeyValueOptions {
  key: string;
  value: AnyObject | string;
  cas?: number;
  dc?: string;
  flags?: number;
  acquire?: string;
  release?: string;
}

export interface ValidateOptions {
  fail?: boolean;
  timeout?: number;
  retries?: number;
  factor?: number;
  onRetry?: VoidFunction;
}

export interface WatchOptionsInner {
  backoffFactor?: number;
  backoffMax?: number;
  maxAttempts?: number;
}

export interface WatchOptions {
  key?: string;
  onChange?: VoidFunction;
  onError?: VoidFunction;
  options?: WatchOptionsInner;
}

export interface RegisterRetryOptions {
  factor?: number;
  retries?: number;
  onRetry?: VoidFunction;
}
export interface RegisterData {
  meta?: AnyObject;
  checks?: AnyObject;
  address?: string;
  id: string;
  name: string;
  port?: number;
}
export interface RegisterOptions {
  registerData: RegisterData;
  options?: RegisterRetryOptions;
}

export interface RegisterIntervalOptions extends RegisterOptions {
  interval: number;
  onError?: VoidFunction;
}
export interface WatchAllOptions {
  onChange?: VoidFunction;
  onError?: VoidFunction;
  options?: WatchOptionsInner;
}
export declare class Consul {
  public constructor(options: ConsulOptions);
  public validateConnected(options?: ValidateOptions): void;
  private buildKey(key: string): { key: string; value: AnyObject };
  public get(key?: string): AnyObject;
  public set(options: KeyValueOptions): boolean;
  public setString(options: KeyValueOptions): boolean;
  public keys(key?: string): AnyObject;
  public merge(options: KeyValueOptions): AnyObject;
  public watch(options?: WatchOptions): void;
  public register(options: RegisterOptions): void;
  public registerInterval(options: RegisterIntervalOptions): void;
  public close(): void;
}
interface MultiConsulOptions extends ConsulOptions {
  paths: string[];
}
export declare class MultiConsul extends Consul {
  public constructor(options: MultiConsulOptions);
  private _mergeAll(): AnyObject;
  private _onOneChange(Values: { key: string; value: AnyObject }): AnyObject;
  public load(): AnyObject;
  public getAll(): AnyObject;
  public watchAll(options: WatchAllOptions): AnyObject;
}
