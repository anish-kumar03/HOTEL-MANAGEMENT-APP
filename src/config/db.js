import mysql from 'mysql2/promise';
import { env } from './env.js';

/**
 * MySQL 8.4 LTS Database Connection Pool Configuration
 * Strictly driven by environment variables with no hardcoded credentials.
 */
const poolConfig = {
  host: env.DB.HOST,
  port: env.DB.PORT,
  user: env.DB.USER,
  password: env.DB.PASSWORD,
  database: env.DB.NAME,
  waitForConnections: true,
  connectionLimit: env.DB.CONNECTION_LIMIT,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  timezone: '+00:00', // Standardized UTC storage
  dateStrings: true   // Preserves standard ISO date format without timezone shifting
};

// Create the connection pool
export const pool = mysql.createPool(poolConfig);

/**
 * Execute a parameterized SQL query using the connection pool.
 * Automatically acquires and releases a pool connection.
 * 
 * @param {string} sql - Parameterized SQL query string (e.g. "SELECT * FROM rooms WHERE id = ?")
 * @param {Array} [params=[]] - Array of query parameters for prepared statements
 * @returns {Promise<Array>} Query result rows
 */
export async function query(sql, params = []) {
  try {
    const [rows] = await pool.query(sql, params);
    return rows;
  } catch (error) {
    console.error(`[Database Query Error]: ${error.message}`);
    console.error(`[Failed SQL]: ${sql}`);
    console.error(`[Parameters]:`, params);
    throw error;
  }
}

/**
 * Execute a prepared statement using pool.execute (for DML / insert / update).
 * 
 * @param {string} sql - Prepared SQL statement
 * @param {Array} [params=[]] - Parameter values
 * @returns {Promise<Object>} Execution result (e.g. insertId, affectedRows)
 */
export async function execute(sql, params = []) {
  try {
    const [result] = await pool.execute(sql, params);
    return result;
  } catch (error) {
    console.error(`[Database Execute Error]: ${error.message}`);
    console.error(`[Failed SQL]: ${sql}`);
    console.error(`[Parameters]:`, params);
    throw error;
  }
}

/**
 * Acquire a dedicated connection from the pool.
 * Crucial for executing multi-statement ACID transactions.
 * 
 * @returns {Promise<mysql.PoolConnection>} Dedicated connection (Must call conn.release() when finished)
 */
export async function getConnection() {
  try {
    return await pool.getConnection();
  } catch (error) {
    console.error(`[Database Connection Acquisition Failed]: ${error.message}`);
    throw error;
  }
}

/**
 * Test Database Connectivity using "SELECT 1;"
 * Performs non-destructive health verification and latency measurement.
 * 
 * @returns {Promise<{ success: boolean, message: string, latencyMs?: number, timestamp: string }>}
 */
export async function testConnection() {
  const startTime = Date.now();
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT 1 AS health_check;');
    connection.release();

    const latencyMs = Date.now() - startTime;
    return {
      success: true,
      message: 'MySQL Database connected and responsive.',
      latencyMs,
      database: env.DB.NAME,
      host: `${env.DB.HOST}:${env.DB.PORT}`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      message: `Database connection failed: ${error.message}`,
      code: error.code || 'UNKNOWN_DB_ERROR',
      latencyMs,
      database: env.DB.NAME,
      host: `${env.DB.HOST}:${env.DB.PORT}`,
      timestamp: new Date().toISOString()
    };
  }
}

export default {
  pool,
  query,
  execute,
  getConnection,
  testConnection
};

