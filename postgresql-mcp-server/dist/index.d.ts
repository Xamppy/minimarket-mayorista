#!/usr/bin/env node
import { PostgreSQLMCPServerImpl } from './server';
interface MCPRequest {
    method: string;
    params: any;
}
interface MCPResponse {
    content: Array<{
        type: string;
        text: string;
    }>;
}
declare class PostgreSQLMCPHandler {
    private dbServer;
    private logger;
    constructor();
    handleRequest(request: MCPRequest): Promise<MCPResponse>;
    getAvailableMethods(): string[];
    private handleConnect;
    private handleQuery;
    private handleTransaction;
    private handleDisconnect;
    private handleHealthCheck;
    run(): Promise<void>;
    getServer(): PostgreSQLMCPServerImpl;
}
export { PostgreSQLMCPHandler };
//# sourceMappingURL=index.d.ts.map