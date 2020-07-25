export declare class Observable {
  public constructor(value: any);
  public set(value: any): void;
  public get(): void;
  public subscribe(listener: (data: any) => void): () => void;
}

type Unsubscriber = () => void;

export type MonitorOptions = {
  interval?: number;
  afterFinish?: boolean;
  monitor?: (data: any) => void;
};

export type StartOptions = {
  monitor?: (data: any) => void;
  afterFinish?: boolean;
  interval?: number;
  onCall?: (data: any) => void;
};

export declare class Monitor {
  public constructor(monitorOptions: MonitorOptions);
  public start(startOptions: StartOptions): void;
  public subscribe(onChange: (data: any) => void): Unsubscriber;
  public unsubscribe(onChange: (data: any) => void): void;
  public stop(): void;
  public destroy(): void;
}
