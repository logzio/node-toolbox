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

export interface RegisterOptionsInner {
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
  data: RegisterData;
  validateRegisteredInterval?: number;
  onError?: VoidFunction;
  registerOptions?: RegisterOptionsInner;
}
export declare class Consul {
  public constructor(consulOptions: ConsulOptions);
  public validateConnected(validateOptions: ValidateOptions): void;
  private buildKey(key: string): { key: string; value: AnyObject };
  public get(key?: string): AnyObject;
  public set(key: string, value: AnyObject): void;
  public keys(key?: string): AnyObject;
  public merge(key: string, values: AnyObject): AnyObject;
  public watch(watchOptions: WatchOptions): void;
  public register(registerOptions: RegisterOptions): void;
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
