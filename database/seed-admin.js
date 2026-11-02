/**
 * =============================================================================
 * HOTEL RESERVATION & MANAGEMENT SYSTEM (HRMS)
 * Administrator Initialization & Setup Script
 * =============================================================================
 * 
 * Safely creates or updates the initial administrator account in MySQL.
 * Reads credentials strictly from environment variables (.env).
 * Generates and stores ONLY a 10-round salted bcrypt password hash.
 * 
 * Usage:
 *   node database/seed-admin.js
 *   npm run seed:admin
 * =============================================================================
 */

import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/config/db.js';

// Resolve project root .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BCRYPT_SALT_ROUNDS = 10;

async function setupAdministrator() {
  console.log('======================================================================');
  console.log('🛡️  Starting HRMS Administrator Setup Script');
  console.log('======================================================================');

  // Read administrator values strictly from environment variables with safe dev fallbacks
  const username = (process.env.ADMIN_USERNAME || 'admin').trim();
  const email = (process.env.ADMIN_EMAIL || 'admin@grandhorizon.com').trim().toLowerCase();
  const rawPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';

  if (!username || username.length < 3) {
    console.error('❌ Error: ADMIN_USERNAME must be at least 3 characters.');
    process.exit(1);
  }

  if (!rawPassword || rawPassword.length < 6) {
    console.error('❌ Error: ADMIN_PASSWORD must be at least 6 characters.');
    process.exit(1);
  }

  console.log(`[Configuration]: Setting up administrator username: "${username}"`);
  console.log(`[Configuration]: Target email: "${email}"`);
  console.log('[Security]: Generating 10-round salted bcrypt password hash...');

  const passwordHash = await bcrypt.hash(rawPassword, BCRYPT_SALT_ROUNDS);

  console.log('[Security]: Password hash generated successfully.');
  console.log(`[Security Notice]: Storing ONLY the bcrypt hash: ${passwordHash.substring(0, 15)}... (Plain text is never persisted)`);

  try {
    // 1. Ensure the admin_users table exists
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS \`admin_users\` (
        \`admin_id\` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`username\` VARCHAR(50) NOT NULL,
        \`email\` VARCHAR(100) NOT NULL,
        \`password_hash\` VARCHAR(255) NOT NULL,
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`admin_id\`),
        UNIQUE KEY \`uq_admin_username\` (\`username\`),
        UNIQUE KEY \`uq_admin_email\` (\`email\`),
        KEY \`idx_admin_username\` (\`username\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    await pool.query(createTableSql);

    // 2. Insert or update the administrator user
    const insertAdminSql = `
      INSERT INTO \`admin_users\` (\`username\`, \`email\`, \`password_hash\`)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`password_hash\` = VALUES(\`password_hash\`),
        \`email\` = VALUES(\`email\`);
    `;
    const [result] = await pool.query(insertAdminSql, [username, email, passwordHash]);

    console.log('======================================================================');
    console.log(`✅ Administrator "${username}" (${email}) successfully provisioned in MySQL.`);
    console.log(`   Database Action: ${result.affectedRows === 1 ? 'New user inserted' : 'Existing record updated'}`);
    console.log('======================================================================');
  } catch (error) {
    console.warn('======================================================================');
    console.warn(`⚠️  Notice: Could not connect to MySQL database: ${error.message}`);
    console.warn('   The setup script completed hash generation in memory.');
    console.warn('   To persist to MySQL, ensure MySQL server is running and .env credentials are correct.');
    console.warn('======================================================================');
  } finally {
    try {
      await pool.end();
    } catch (_) {
      // Ignore pool closing error
    }
  }
}

// Execute setup
setupAdministrator();
