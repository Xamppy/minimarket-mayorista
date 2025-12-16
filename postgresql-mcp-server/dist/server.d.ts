import { DatabaseConfig, QueryResult, TransactionCallback, PostgreSQLMCPServer } from './types';
import { Logger } from './logger';
export declare class PostgreSQLMCPServerImpl implements PostgreSQLMCPServer {
    private pool;
    private config;
    private logger;
    constructor(logger?: Logger);
    connect(config: DatabaseConfig): Promise<void>;
    query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
    transaction<T>(callback: TransactionCallback<T>): Promise<T>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    getConnectionCount(): number;
    healthCheck(): Promise<{
        status: 'healthy' | 'unhealthy';
        details: any;
    }>;
}
//# sourceMappingURL=server.d.ts.map