export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  error?: Error;
}

export class Logger {
  private logLevel: LogLevel;

  constructor(logLevel: LogLevel = 'info') {
    this.logLevel = logLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    return levels[level] >= levels[this.logLevel];
  }

  private formatMessage(level: LogLevel, message: string, data?: any, error?: Error): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    let formattedMessage = `${prefix} ${message}`;
    
    if (data) {
      formattedMessage += ` | Data: ${JSON.stringify(data, null, 2)}`;
    }
    
    if (error) {
      formattedMessage += ` | Error: ${error.message}`;
      if (error.stack) {
        formattedMessage += `\nStack: ${error.stack}`;
      }
    }
    
    return formattedMessage;
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, data));
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, data));
    }
  }

  warn(message: string, data?: any, error?: Error): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, data, error));
    }
  }

  error(message: string, error?: any, data?: any): void {
    if (this.shouldLog('error')) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      console.error(this.formatMessage('error', message, data, errorObj));
    }
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  getLogLevel(): LogLevel {
    return this.logLevel;
  }
}