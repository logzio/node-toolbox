/* eslint-disable no-unused-vars */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface AnyObject {
  [key: string]: any;
}

export interface ChangeLogLevelColorOptions {
  logLevel: LogLevel;
  color: string;
}

export declare function changeLogLevelColor(changeLogLevelColorOptions: ChangeLogLevelColorOptions): void;

export interface LoggerOptions {
  transports?: Transport[];
  metaData?: AnyObject;
  formatters?: void[];
  datePattern?: string;
  logLevel?: LogLevel;
}

export declare class Logger {
  public constructor(loggerOptions: LoggerOptions);
  public debug(): void;
  public log(): void;
  public info(): void;
  public warn(): void;
  public error(): void;
  public beautify(): void;
  public close(): void;
  public logLevel(logLevel: LogLevel): void;
  public addTransport(transport: Transport): void;
  public addFormatter(formatter: void[]): void;
  public removeTransport(id: string): void;
  public removeFormatter(formatter: void): void;
}

export interface TransportOptions {
  name?: string;
  LogLevel?: LogLevel;
  formatters?: void[];
}

export interface ConsoleTransportOptions extends TransportOptions {
  colorizeLog?: boolean;
}

export interface LogzioTransportOptions extends TransportOptions {
  host?: string;
  type?: string;
  token: string;
  metaData?: AnyObject;
}

export declare namespace transports {
  class Transport {
    public constructor(transportOptions: TransportOptions);
    public debug(): void;
    public log(): void;
    public info(): void;
    public warn(): void;
    public error(): void;
    public beautify(): void;
    public close(): void;
    public logLevel(logLevel: LogLevel): void;
    public addTransport(transport?: Transport): void;
    public addFormatter(): void;
    public removeTransport(): void;
    public removeFormatter(): void;
  }

  class ConsoleTransport extends Transport {
    public constructor(consoleTransportOptions: ConsoleTransportOptions);
  }

  class LogzioTransport extends Transport {
    public constructor(logzioTransportOptions: LogzioTransportOptions);
  }
}

type ReceiveLog = () => void;

export type MaskField = {
  field: string;
  length?: number;
};
export type RenameField = {
  from: string;
  to: string;
};
export declare namespace formatters {
  function handleError(): ReceiveLog;
  function logSize(maxLogSizeBytes: number): ReceiveLog;
  function maskFields(fields: MaskField[]): ReceiveLog;
  function omitFields(fields: string[]): ReceiveLog;
  function pickFieldsOfProperty(name: string, list: string[], shouldFlat?: boolean): ReceiveLog;
  function removeCircularFields(): ReceiveLog;
  function renameFields(fields: RenameField[]): ReceiveLog;
  function sliceFields(fields: string[], maxFieldByteSize: number): ReceiveLog;
}
