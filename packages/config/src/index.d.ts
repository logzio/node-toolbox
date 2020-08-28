interface AnyObject {
  [key: string]: any;
}

export interface ConfigOptions {
  schema: AnyObject;
  defaults?: AnyObject;
  overrides?: AnyObject;
}

export type SubscribeOptions = {
  key?: string;
  onChange: (data: any) => void;
};

export type SetOptions = {
  value: AnyObject;
  key?: string;
  onError: (data: any) => void;
};

type Unsubscriber = () => void;

export declare class Config {
  public constructor(loggerOptions: ConfigOptions);
  public subscribe(subscribeOptions: SubscribeOptions): Unsubscriber;
  public set(setOptions: SetOptions): void;
  public get(key?: string): any;
}
