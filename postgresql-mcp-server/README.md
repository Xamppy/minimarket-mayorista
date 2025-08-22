# PostgreSQL MCP Server

A Model Context Protocol (MCP) server for PostgreSQL database connectivity, designed to replace Supabase connectivity in the MiniMarket Pro application.

## Features

- **Connection Management**: Robust connection pooling with configurable pool size
- **Query Execution**: Support for parameterized queries with proper error handling
- **Transaction Support**: Full transaction management with automatic rollback on errors
- **Health Monitoring**: Built-in health checks and connection monitoring
- **Comprehensive Logging**: Detailed logging with configurable log levels
- **Type Safety**: Full TypeScript support with strict typing
- **Error Handling**: Custom error types for different failure scenarios

## Installation

```bash
npm install
npm run build
```

## Usage

### As MCP Server

The server can be used as an MCP server through the Model Context Protocol:

```bash
npm start
```

### Configuration

The server accepts the following configuration options:

```typescript
interface DatabaseConfig {
  host: string;                    // Database host
  port: number;                    // Database port (1-65535)
  database: string;                // Database name
  username: string;                // Database username
  password: string;                // Database password
  ssl?: boolean;                   // Use SSL connection (default: false)
  poolSize?: number;               // Connection pool size (default: 10)
  connectionTimeoutMillis?: number; // Connection timeout (default: 5000)
  idleTimeoutMillis?: number;      // Idle timeout (default: 30000)
  maxUses?: number;                // Max uses per connection (default: 7500)
}
```

### Available Tools

#### connect
Connect to a PostgreSQL database.

**Parameters:**
- `host` (string): Database host
- `port` (number): Database port
- `database` (string): Database name
- `username` (string): Database username
- `password` (string): Database password
- `ssl` (boolean, optional): Use SSL connection
- `poolSize` (number, optional): Connection pool size

#### query
Execute a SQL query.

**Parameters:**
- `sql` (string): SQL query to execute
- `params` (array, optional): Query parameters

**Example:**
```json
{
  "sql": "SELECT * FROM users WHERE id = $1",
  "params": [123]
}
```

#### transaction
Execute multiple queries in a transaction.

**Parameters:**
- `queries` (array): Array of query objects with `sql` and optional `params`

**Example:**
```json
{
  "queries": [
    {
      "sql": "INSERT INTO users (name, email) VALUES ($1, $2)",
      "params": ["John Doe", "john@example.com"]
    },
    {
      "sql": "INSERT INTO profiles (user_id, full_name) VALUES ($1, $2)",
      "params": [123, "John Doe"]
    }
  ]
}
```

#### disconnect
Disconnect from the PostgreSQL database.

#### health_check
Check the health status of the database connection.

## Development

### Running Tests

```bash
npm test
npm run test:watch
```

### Development Mode

```bash
npm run dev
```

### Building

```bash
npm run build
```

## Environment Variables

- `LOG_LEVEL`: Set logging level (`debug`, `info`, `warn`, `error`)

## Error Handling

The server provides custom error types for different scenarios:

- `DatabaseConnectionError`: Connection-related errors
- `DatabaseQueryError`: Query execution errors
- `DatabaseTransactionError`: Transaction-related errors

## Logging

The server includes comprehensive logging with the following levels:

- `debug`: Detailed debugging information
- `info`: General information messages
- `warn`: Warning messages
- `error`: Error messages with stack traces

## Security Considerations

- Always use parameterized queries to prevent SQL injection
- Use SSL connections in production environments
- Implement proper authentication and authorization
- Monitor connection pool usage and limits
- Regularly update dependencies for security patches

## Performance

- Connection pooling reduces connection overhead
- Prepared statements improve query performance
- Transaction management ensures data consistency
- Health checks help identify performance issues
- Configurable timeouts prevent hanging connections

## License

MIT License