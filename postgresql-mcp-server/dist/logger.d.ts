export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    data?: any;
    error?: Error;
}
export declare class Logger {
    private logLevel;
    constructor(logLevel?: LogLevel);
    private shouldLog;
    private formatMessage;
    debug(message: string, data?: any): void;
    info(message: string, data?: any): void;
    warn(message: string, data?: any, error?: Error): void;
    error(message: string, error?: any, data?: any): void;
    setLogLevel(level: LogLevel): void;
    getLogLevel(): LogLevel;
}
//# sourceMappingURL=logger.d.ts.map