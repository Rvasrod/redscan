export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export class Logger {
  private static formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
  }

  static debug(message: string): void {
    console.debug(this.formatMessage(LogLevel.DEBUG, message));
  }

  static info(message: string): void {
    console.info(this.formatMessage(LogLevel.INFO, message));
  }

  static warn(message: string): void {
    console.warn(this.formatMessage(LogLevel.WARN, message));
  }

  static error(message: string, error?: Error): void {
    const errMsg = error ? `${message}: ${error.message}\n${error.stack}` : message;
    console.error(this.formatMessage(LogLevel.ERROR, errMsg));
  }
}
