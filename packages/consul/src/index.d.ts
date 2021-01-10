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
  key?: string;
  value: AnyObject;
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
  watchOptions?: WatchOptionsInner;
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
  id?: string;
  name?: string;
  port?: number;
}
export interface RegisterOptions {
  registerData: RegisterData;
  registerRetryOptions?: RegisterRetryOptions;
}

export interface RegisterIntervalOptions extends RegisterOptions {
  interval: number;
  onError?: VoidFunction;
}
export declare class Consul {
  public constructor(consulOptions: ConsulOptions);
  public validateConnected(validateOptions: ValidateOptions): void;
  private buildKey(key: string): { key: string; value: AnyObject };
  public get(key?: string): AnyObject;
  public set(keyValueOptions: KeyValueOptions): void;
  public keys(key?: string): AnyObject;
  public merge(keyValueOptions: KeyValueOptions): AnyObject;
  public watch(watchOptions?: WatchOptions): void;
  public register(registerOptions: RegisterOptions): void;
  public registerInterval(registerIntervalOptions: RegisterIntervalOptions): void;
  public close(): void;
}
interface MultiConsulOptions extends ConsulOptions {
  paths: string[];
}
export declare class MultiConsul extends Consul {
  public constructor(multiConsulOptions: MultiConsulOptions);
  private _mergeAll(): AnyObject;
  private _onOneChange(Values: { key: string; value: AnyObject }): AnyObject;
  public load(): AnyObject;
  public getAll(): AnyObject;
  public watchAll(onChange: VoidFunction): AnyObject;
}
