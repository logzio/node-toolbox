interface AnyObject {
  [key: string]: any;
}

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  SILENT = 'SILENT',
}

export interface SetLogLevelColorColorOptions {
  logLevel: LogLevel;
  color: string;
}

export const Color: AnyObject;
export declare function setLogLevelColor(setLogLevelColorColorOptions: SetLogLevelColorColorOptions): void;

export interface AddLogLevelOptions {
  name: string;
  color: string;
  weight: number;
}

export declare function addLogLevel(addLogLevelOptions: AddLogLevelOptions): void;

type formatter = (...args: any[]) => void;

export interface TransportOptions {
  name?: string;
  logLevel?: LogLevel;
  formatters?: formatter[];
}

export interface ConsoleTransportOptions extends TransportOptions {
  color?: boolean;
}

export interface LogzioTransportOptions extends TransportOptions {
  host?: string;
  type?: string;
  token: string;
  metaData?: AnyObject;
}

export class Transport implements TransportOptions {
  name?: string;
  logLevel?: LogLevel;
  formatters?: formatter[];
  public constructor(transportOptions: TransportOptions);
  public close(): void;
  public logLevel(logLevel: LogLevel): void;
  public addFormatter(): void;
  public removeFormatter(): void;
}

export class ConsoleTransport extends Transport implements ConsoleTransportOptions {
  public constructor(consoleTransportOptions?: ConsoleTransportOptions);
}

export class LogzioTransport extends Transport implements LogzioTransportOptions {
  public constructor(logzioTransportOptions?: LogzioTransportOptions);
  host?: string;
  type?: string;
  token: string;
  metaData?: AnyObject;
  name?: string;
  logLevel?: LogLevel;
  formatters?: formatter[];
}

export interface LoggerOptions {
  transports?: Transport[];
  metaData?: AnyObject;
  formatters?: formatter[];
  datePattern?: string;
}

export declare class Logger {
  public constructor(loggerOptions?: LoggerOptions);
  public debug(...args: any[]): void;
  public log(...args: any[]): void;
  public info(...args: any[]): void;
  public warn(...args: any[]): void;
  public error(...args: any[]): void;
  public beautify(...args: any[]): void;
  public close(): void;
  public addTransport(transport: Transport | Transport[]): void;
  public addFormatter(formatter: formatter | formatter[]): void;
  public removeTransport(name: string): void;
  public removeFormatter(name: string): void;
}

type ReceiveLog = () => void;

export type MaskField = {
  field: string;
  length?: number;
};

interface StringValueObject {
  [from: string]: string;
}
export declare namespace formatters {
  function handleError(): ReceiveLog;
  function logSize(maxLogSizeBytes?: number): ReceiveLog;
  function maskFields(fields: MaskField[]): ReceiveLog;
  function omitFields(fields: string[]): ReceiveLog;
  function pickFields(name: string, list: string[], shouldFlat?: boolean): ReceiveLog;
  function removeCircularFields(): ReceiveLog;
  function renameFields(fields: StringValueObject): ReceiveLog;
  function sliceFields(fields: string[], maxFieldByteSize?: number): ReceiveLog;
}
