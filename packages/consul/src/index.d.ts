interface AnyObject {
  [key: string]: any;
}

export interface ConsulOptions {
  port?: number;
  host?: string;
  baseUrl?: string;
}

export interface ValidateConnectedOptions {
  fail?: boolean;
  timeout?: number;
  retries?: number;
  factor?: number;
  onRetry?: VoidFunction;
}

export interface WatchOptions {
  key?: string;
  backoffFactor?: number;
  backoffMax?: number;
  maxAttempts?: number;
  onChange?: VoidFunction;
  onError?: VoidFunction;
}

export interface RegisterOptions {
  meta?: AnyObject;
  checks?: AnyObject;
  address?: string;
  hostname?: string;
  serviceName?: string;
  port?: number;
  interval?: number;
  onError?: VoidFunction;
}

export declare class Consul {
  public constructor(consulOptions: ConsulOptions);
  public validateConnected(validateConnectedOptions: ValidateConnectedOptions): void;
  private parseValue(Values?: { Value?: string; key?: string }): void;
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
