import { z } from 'zod';
// Database configuration schema
export const DatabaseConfigSchema = z.object({
    host: z.string(),
    port: z.number().min(1).max(65535),
    database: z.string(),
    username: z.string(),
    password: z.string(),
    ssl: z.boolean().optional().default(false),
    poolSize: z.number().min(1).max(100).optional().default(10),
    connectionTimeoutMillis: z.number().optional().default(5000),
    idleTimeoutMillis: z.number().optional().default(30000),
    maxUses: z.number().optional().default(7500)
});
// Error types
export class DatabaseConnectionError extends Error {
    cause;
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = 'DatabaseConnectionError';
    }
}
export class DatabaseQueryError extends Error {
    query;
    params;
    cause;
    constructor(message, query, params, cause) {
        super(message);
        this.query = query;
        this.params = params;
        this.cause = cause;
        this.name = 'DatabaseQueryError';
    }
}
export class DatabaseTransactionError extends Error {
    cause;
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = 'DatabaseTransactionError';
    }
}
//# sourceMappingURL=types.js.map