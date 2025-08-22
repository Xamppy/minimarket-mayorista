import { Pool } from 'pg';
import { DatabaseConfigSchema, DatabaseConnectionError, DatabaseQueryError, DatabaseTransactionError } from './types';
import { Logger } from './logger';
export class PostgreSQLMCPServerImpl {
    pool = null;
    config = null;
    logger;
    constructor(logger) {
        this.logger = logger || new Logger();
    }
    async connect(config) {
        try {
            // Validate configuration
            const validatedConfig = DatabaseConfigSchema.parse(config);
            this.config = validatedConfig;
            // Create connection pool
            this.pool = new Pool({
                host: validatedConfig.host,
                port: validatedConfig.port,
                database: validatedConfig.database,
                user: validatedConfig.username,
                password: validatedConfig.password,
                ssl: validatedConfig.ssl,
                max: validatedConfig.poolSize,
                connectionTimeoutMillis: validatedConfig.connectionTimeoutMillis,
                idleTimeoutMillis: validatedConfig.idleTimeoutMillis,
                maxUses: validatedConfig.maxUses
            });
            // Test connection
            const client = await this.pool.connect();
            await client.query('SELECT 1');
            client.release();
            this.logger.info('PostgreSQL MCP Server connected successfully', {
                host: validatedConfig.host,
                port: validatedConfig.port,
                database: validatedConfig.database,
                poolSize: validatedConfig.poolSize
            });
            // Set up pool event handlers
            this.pool.on('error', (err) => {
                this.logger.error('PostgreSQL pool error', err);
            });
            this.pool.on('connect', () => {
                this.logger.debug('New client connected to PostgreSQL pool');
            });
            this.pool.on('remove', () => {
                this.logger.debug('Client removed from PostgreSQL pool');
            });
        }
        catch (error) {
            this.logger.error('Failed to connect to PostgreSQL', error);
            throw new DatabaseConnectionError(`Failed to connect to PostgreSQL: ${error instanceof Error ? error.message : 'Unknown error'}`, error instanceof Error ? error : undefined);
        }
    }
    async query(sql, params) {
        if (!this.pool) {
            throw new DatabaseConnectionError('Database not connected. Call connect() first.');
        }
        const startTime = Date.now();
        let client = null;
        try {
            client = await this.pool.connect();
            const result = await client.query(sql, params);
            const duration = Date.now() - startTime;
            this.logger.debug('Query executed successfully', {
                sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
                params: params?.length || 0,
                rowCount: result.rowCount,
                duration: `${duration}ms`
            });
            return {
                rows: result.rows,
                rowCount: result.rowCount || 0,
                command: result.command,
                fields: result.fields
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error('Query execution failed', {
                sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
                params: params?.length || 0,
                duration: `${duration}ms`,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new DatabaseQueryError(`Query execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`, sql, params, error instanceof Error ? error : undefined);
        }
        finally {
            if (client) {
                client.release();
            }
        }
    }
    async transaction(callback) {
        if (!this.pool) {
            throw new DatabaseConnectionError('Database not connected. Call connect() first.');
        }
        const client = await this.pool.connect();
        const startTime = Date.now();
        try {
            await client.query('BEGIN');
            this.logger.debug('Transaction started');
            const result = await callback(client);
            await client.query('COMMIT');
            const duration = Date.now() - startTime;
            this.logger.debug('Transaction committed successfully', {
                duration: `${duration}ms`
            });
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            const duration = Date.now() - startTime;
            this.logger.error('Transaction rolled back', {
                duration: `${duration}ms`,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new DatabaseTransactionError(`Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`, error instanceof Error ? error : undefined);
        }
        finally {
            client.release();
        }
    }
    async disconnect() {
        if (this.pool) {
            try {
                await this.pool.end();
                this.pool = null;
                this.config = null;
                this.logger.info('PostgreSQL MCP Server disconnected successfully');
            }
            catch (error) {
                this.logger.error('Error during disconnect', error);
                throw new DatabaseConnectionError(`Failed to disconnect: ${error instanceof Error ? error.message : 'Unknown error'}`, error instanceof Error ? error : undefined);
            }
        }
    }
    isConnected() {
        return this.pool !== null && !this.pool.ended;
    }
    getConnectionCount() {
        if (!this.pool) {
            return 0;
        }
        return this.pool.totalCount;
    }
    // Health check method
    async healthCheck() {
        try {
            if (!this.isConnected()) {
                return {
                    status: 'unhealthy',
                    details: { error: 'Not connected to database' }
                };
            }
            const result = await this.query('SELECT NOW() as current_time, version() as version');
            return {
                status: 'healthy',
                details: {
                    connected: true,
                    totalConnections: this.getConnectionCount(),
                    currentTime: result.rows[0]?.current_time,
                    version: result.rows[0]?.version,
                    config: {
                        host: this.config?.host,
                        port: this.config?.port,
                        database: this.config?.database,
                        poolSize: this.config?.poolSize
                    }
                }
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                details: {
                    error: error instanceof Error ? error.message : 'Unknown error'
                }
            };
        }
    }
}
//# sourceMappingURL=server.js.map