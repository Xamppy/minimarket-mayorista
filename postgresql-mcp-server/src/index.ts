#!/usr/bin/env node

import { PostgreSQLMCPServerImpl } from './server';
import { Logger } from './logger';
import { DatabaseConfig } from './types';

// Simple interface for testing and development
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

class PostgreSQLMCPHandler {
  private dbServer: PostgreSQLMCPServerImpl;
  private logger: Logger;

  constructor() {
    this.logger = new Logger((process.env.LOG_LEVEL as any) || 'info');
    this.dbServer = new PostgreSQLMCPServerImpl(this.logger);
  }

  // Handle MCP-style requests
  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    const { method, params } = request;

    try {
      switch (method) {
        case 'connect':
          return await this.handleConnect(params as DatabaseConfig);
        
        case 'query':
          return await this.handleQuery(params as { sql: string; params?: any[] });
        
        case 'transaction':
          return await this.handleTransaction(params as { queries: Array<{ sql: string; params?: any[] }> });
        
        case 'disconnect':
          return await this.handleDisconnect();
        
        case 'health_check':
          return await this.handleHealthCheck();
        
        default:
          throw new Error(`Unknown method: ${method}`);
      }
    } catch (error) {
      this.logger.error(`Request execution failed: ${method}`, error);
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        ]
      };
    }
  }

  // List available methods
  getAvailableMethods(): string[] {
    return ['connect', 'query', 'transaction', 'disconnect', 'health_check'];
  }

  private async handleConnect(config: DatabaseConfig): Promise<MCPResponse> {
    await this.dbServer.connect(config);
    return {
      content: [
        {
          type: 'text',
          text: `Successfully connected to PostgreSQL database at ${config.host}:${config.port}/${config.database}`
        }
      ]
    };
  }

  private async handleQuery(args: { sql: string; params?: any[] }): Promise<MCPResponse> {
    const result = await this.dbServer.query(args.sql, args.params);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            rowCount: result.rowCount,
            command: result.command,
            rows: result.rows
          }, null, 2)
        }
      ]
    };
  }

  private async handleTransaction(args: { queries: Array<{ sql: string; params?: any[] }> }): Promise<MCPResponse> {
    const results = await this.dbServer.transaction(async (client) => {
      const queryResults = [];
      for (const query of args.queries) {
        const result = await client.query(query.sql, query.params);
        queryResults.push({
          rowCount: result.rowCount,
          command: result.command,
          rows: result.rows
        });
      }
      return queryResults;
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2)
        }
      ]
    };
  }

  private async handleDisconnect(): Promise<MCPResponse> {
    await this.dbServer.disconnect();
    return {
      content: [
        {
          type: 'text',
          text: 'Successfully disconnected from PostgreSQL database'
        }
      ]
    };
  }

  private async handleHealthCheck(): Promise<MCPResponse> {
    const health = await this.dbServer.healthCheck();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(health, null, 2)
        }
      ]
    };
  }

  async run(): Promise<void> {
    this.logger.info('PostgreSQL MCP Server started');
    this.logger.info('Available methods:', this.getAvailableMethods());
    
    // Keep the process running
    process.stdin.resume();
  }

  // Expose the server instance for external use
  getServer(): PostgreSQLMCPServerImpl {
    return this.dbServer;
  }
}

// Export for use as a module
export { PostgreSQLMCPHandler };

// Start the server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const handler = new PostgreSQLMCPHandler();
  handler.run().catch((error) => {
    console.error('Failed to start PostgreSQL MCP Server:', error);
    process.exit(1);
  });
}