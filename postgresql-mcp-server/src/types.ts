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

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

// Query result interface
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  command: string;
  fields?: any[];
}

// Transaction callback type
export type TransactionCallback<T> = (client: any) => Promise<T>;

// MCP Server interface
export interface PostgreSQLMCPServer {
  connect(config: DatabaseConfig): Promise<void>;
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  transaction<T>(callback: TransactionCallback<T>): Promise<T>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getConnectionCount(): number;
}

// Error types
export class DatabaseConnectionError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'DatabaseConnectionError';
  }
}

export class DatabaseQueryError extends Error {
  constructor(message: string, public query?: string, public params?: any[], public cause?: Error) {
    super(message);
    this.name = 'DatabaseQueryError';
  }
}

export class DatabaseTransactionError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'DatabaseTransactionError';
  }
}