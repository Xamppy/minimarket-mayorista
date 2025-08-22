export class Logger {
    logLevel;
    constructor(logLevel = 'info') {
        this.logLevel = logLevel;
    }
    shouldLog(level) {
        const levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
        return levels[level] >= levels[this.logLevel];
    }
    formatMessage(level, message, data, error) {
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
    debug(message, data) {
        if (this.shouldLog('debug')) {
            console.debug(this.formatMessage('debug', message, data));
        }
    }
    info(message, data) {
        if (this.shouldLog('info')) {
            console.info(this.formatMessage('info', message, data));
        }
    }
    warn(message, data, error) {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage('warn', message, data, error));
        }
    }
    error(message, error, data) {
        if (this.shouldLog('error')) {
            const errorObj = error instanceof Error ? error : new Error(String(error));
            console.error(this.formatMessage('error', message, data, errorObj));
        }
    }
    setLogLevel(level) {
        this.logLevel = level;
    }
    getLogLevel() {
        return this.logLevel;
    }
}
//# sourceMappingURL=logger.js.map