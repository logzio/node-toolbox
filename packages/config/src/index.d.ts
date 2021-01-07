interface AnyObject {
  [key: string]: any;
}

type Unsubscriber = () => void;

export declare class Config {
  public constructor(schema: AnyObject, config: AnyObject);
  public subscribe(onChange: (data: any) => void, key?: string): Unsubscriber;
  public set(value: AnyObject, key?: string, onError: (data: any) => void): void;
  public get(key?: string): any;
}
