export enum LogLevel {
  DEBUG= 'DEBUG',
  INFO= 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface ChangeLogLevelColor {
  logLevel: LogLevel,
  color: string
}

export declare function changeLogLevelColor (changeLogLevelColor: ChangeLogLevelColor) : void

export interface TransportOptions {
  name?: string
  LogLevel?: LogLevel
  formatters?: object[]
}

export declare class Transport {
  public constructor(TransportOptions);
  public debug(any): void
  public log(any): void
  public info(any): void
  public warn(any): void
  public error(any): void
  public beautify(any): void
  public close(): void
  public logLevel(LogLevel): void
  public addTransport(Transport): void
  public addFormatter(): void
  public removeTransport(): void
  public removeFormatter(): void
}

interface ConsoleTransportOptions extends TransportOptions {
  colorizeLog?: boolean
}

export declare class ConsoleTransport extends Transport {
  public constructor(consoleTransportOptions: ConsoleTransportOptions);
}

interface LogzioTransportOptions extends TransportOptions {
  host?: string,
  type?: string,
  token: string
  metaData?: object
}

export declare class LogzioTransport extends Transport {
  public constructor(logzioTransportOptions: LogzioTransportOptions);
}

export interface LoggerOptions {
  transports?: Transport[]
  metaData?: object
  formatters?: object[]
  datePattern?: string
  logLevel?: LogLevel
}

export declare class Logger {
  public constructor(loggerOptions?: LoggerOptions);
  public debug(any): void
  public log(any): void
  public info(any): void
  public warn(any): void
  public error(any): void
  public beautify(any): void
  public close(): void
  public logLevel(logLevel: LogLevel): void
  public addTransport(transport: Transport): void
  public addFormatter(object: object): void
  public removeTransport(id: string): void
  public removeFormatter(object: object): void
}
