import { PostgreSQLMCPHandler } from '../src/index';
import { DatabaseConfig } from '../src/types';

async function example() {
  const handler = new PostgreSQLMCPHandler();
  
  // Example database configuration
  const config: DatabaseConfig = {
    host: 'localhost',
    port: 5432,
    database: 'minimarket_pro',
    username: 'postgres',
    password: 'your_password',
    ssl: false,
    poolSize: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    maxUses: 7500
  };

  try {
    // Connect to database
    console.log('Connecting to database...');
    const connectResponse = await handler.handleRequest({
      method: 'connect',
      params: config
    });
    console.log('Connect response:', connectResponse);

    // Execute a simple query
    console.log('Executing query...');
    const queryResponse = await handler.handleRequest({
      method: 'query',
      params: {
        sql: 'SELECT NOW() as current_time, version() as version'
      }
    });
    console.log('Query response:', queryResponse);

    // Execute a transaction
    console.log('Executing transaction...');
    const transactionResponse = await handler.handleRequest({
      method: 'transaction',
      params: {
        queries: [
          {
            sql: 'SELECT COUNT(*) as user_count FROM users'
          },
          {
            sql: 'SELECT COUNT(*) as product_count FROM products'
          }
        ]
      }
    });
    console.log('Transaction response:', transactionResponse);

    // Health check
    console.log('Performing health check...');
    const healthResponse = await handler.handleRequest({
      method: 'health_check',
      params: {}
    });
    console.log('Health response:', healthResponse);

    // Disconnect
    console.log('Disconnecting...');
    const disconnectResponse = await handler.handleRequest({
      method: 'disconnect',
      params: {}
    });
    console.log('Disconnect response:', disconnectResponse);

  } catch (error) {
    console.error('Example failed:', error);
  }
}

// Run example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  example();
}