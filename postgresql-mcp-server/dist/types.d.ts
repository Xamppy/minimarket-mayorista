import { z } from 'zod';
export declare const DatabaseConfigSchema: z.ZodObject<{
    host: z.ZodString;
    port: z.ZodNumber;
    database: z.ZodString;
    username: z.ZodString;
    password: z.ZodString;
    ssl: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    poolSize: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    connectionTimeoutMillis: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    idleTimeoutMillis: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    maxUses: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl: boolean;
    poolSize: number;
    connectionTimeoutMillis: number;
    idleTimeoutMillis: number;
    maxUses: number;
}, {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: boolean | undefined;
    poolSize?: number | undefined;
    connectionTimeoutMillis?: number | undefined;
    idleTimeoutMillis?: number | undefined;
    maxUses?: number | undefined;
}>;
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
export interface QueryResult<T = any> {
    rows: T[];
    rowCount: number;
    command: string;
    fields?: any[];
}
export type TransactionCallback<T> = (client: any) => Promise<T>;
export interface PostgreSQLMCPServer {
    connect(config: DatabaseConfig): Promise<void>;
    query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
    transaction<T>(callback: TransactionCallback<T>): Promise<T>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    getConnectionCount(): number;
}
export declare class DatabaseConnectionError extends Error {
    cause?: Error | undefined;
    constructor(message: string, cause?: Error | undefined);
}
export declare class DatabaseQueryError extends Error {
    query?: string | undefined;
    params?: any[] | undefined;
    cause?: Error | undefined;
    constructor(message: string, query?: string | undefined, params?: any[] | undefined, cause?: Error | undefined);
}
export declare class DatabaseTransactionError extends Error {
    cause?: Error | undefined;
    constructor(message: string, cause?: Error | undefined);
}
//# sourceMappingURL=types.d.ts.map