import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export class Logger {
  private static logPath: string | null = null;
  private static stream: fs.WriteStream | null = null;

  private static getLogPath(): string {
    if (!this.logPath) {
      const userDataPath = app?.getPath?.('userData') || process.cwd();
      this.logPath = path.join(userDataPath, 'netsentinel.log');
    }
    return this.logPath;
  }

  private static writeToFile(message: string): void {
    try {
      if (!this.stream) {
        this.stream = fs.createWriteStream(this.getLogPath(), { flags: 'a' });
      }
      this.stream.write(message + '\n');
    } catch {
      // Silently fail - don't crash logger because of file write error
    }
  }

  private static formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
  }

  static debug(message: string): void {
    const msg = this.formatMessage(LogLevel.DEBUG, message);
    console.debug(msg);
    this.writeToFile(msg);
  }

  static info(message: string): void {
    const msg = this.formatMessage(LogLevel.INFO, message);
    console.info(msg);
    this.writeToFile(msg);
  }

  static warn(message: string): void {
    const msg = this.formatMessage(LogLevel.WARN, message);
    console.warn(msg);
    this.writeToFile(msg);
  }

  static error(message: string, error?: Error): void {
    const errMsg = error ? `${message}: ${error.message}\n${error.stack}` : message;
    const msg = this.formatMessage(LogLevel.ERROR, errMsg);
    console.error(msg);
    this.writeToFile(msg);
  }
}
