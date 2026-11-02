/**
 * Database module alias for backward compatibility.
 * Re-exports from src/config/db.js.
 */
export { pool, query, execute, getConnection, testConnection } from './db.js';
export { default } from './db.js';
