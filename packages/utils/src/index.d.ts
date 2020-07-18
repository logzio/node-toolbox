export declare class Observable {
  public constructor(value: any);
  public set(value: any): void;
  public get(): void;
  public subscribe(listener: (data: any) => void): () => void;
}

type Unsubscriber = () => void;

export declare class Monitor {
  public constructor(interval: number);
  public start(invoke: (data: any) => void, newInterval?: number): void;
  public Subscribe(onChange: (data: any) => void): Unsubscriber;
  public stop(): void;
}
