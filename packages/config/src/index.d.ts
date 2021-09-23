interface AnyObject {
  [key: string]: any;
}

type Unsubscriber = () => void;

export interface SubscribeOptions {
  onChange: VoidFunction;
  key?: string;
}
export interface SetOptions {
  value: AnyObject;
  key?: string;
  onError?: VoidFunction;
}

export declare class Config {
  public constructor(schema: AnyObject, config?: AnyObject);
  public subscribe(subscribeOptions: SubscribeOptions): Unsubscriber;
  public setSchema(schema: AnyObject, config?: AnyObject): void;
  public set(setOptions: SetOptions): void;
  public get(key?: string): any;
}
