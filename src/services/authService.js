/**
 * =============================================================================
 * HOTEL RESERVATION & MANAGEMENT SYSTEM (HRMS)
 * Administrator Authentication & Security Service
 * =============================================================================
 * 
 * Provides:
 * - Bcrypt password hashing (10 salt rounds)
 * - Constant-time bcrypt password comparison
 * - Input validation for authentication credentials
 * - MySQL admin lookup with secure in-memory fallback
 * =============================================================================
 */

import bcrypt from 'bcrypt';
import pool from '../config/db.js';
import { env } from '../config/env.js';

const BCRYPT_SALT_ROUNDS = 10;

// Pre-computed cached fallback hash for development/testing when MySQL is offline
let cachedFallbackHash = null;

async function getFallbackHash() {
  if (!cachedFallbackHash) {
    cachedFallbackHash = await bcrypt.hash(env.ADMIN.DEFAULT_PASSWORD, BCRYPT_SALT_ROUNDS);
  }
  return cachedFallbackHash;
}

/**
 * Validates authentication input fields.
 * @param {Object} credentials - { username, password }
 * @returns {Array<string>} Validation error messages
 */
export function validateLoginInput({ username, password }) {
  const errors = [];
  if (!username || !username.trim()) {
    errors.push('Please enter your username or email.');
  }
  if (!password || !password.trim()) {
    errors.push('Please enter your password.');
  }
  return errors;
}

/**
 * Hashes a plain-text password using bcrypt.
 * @param {string} plainPassword 
 * @returns {Promise<string>} Salted bcrypt hash
 */
export async function hashPassword(plainPassword) {
  if (!plainPassword || typeof plainPassword !== 'string' || plainPassword.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }
  return await bcrypt.hash(plainPassword, BCRYPT_SALT_ROUNDS);
}

/**
 * Compares a plain-text candidate password with a stored bcrypt hash.
 * @param {string} candidatePassword 
 * @param {string} storedHash 
 * @returns {Promise<boolean>} True if match, false otherwise
 */
export async function comparePassword(candidatePassword, storedHash) {
  if (!candidatePassword || !storedHash) {
    return false;
  }
  try {
    return await bcrypt.compare(candidatePassword, storedHash);
  } catch (err) {
    console.error('[AuthService Error]: Bcrypt comparison failure:', err.message);
    return false;
  }
}

/**
 * Finds an administrator by username or email from MySQL.
 * Falls back to environment administrator if database is unreachable.
 * 
 * @param {string} identifier - Username or Email
 * @returns {Promise<Object|null>} Admin record with password_hash
 */
export async function findByUsernameOrEmail(identifier) {
  if (!identifier || typeof identifier !== 'string') {
    return null;
  }

  const cleanIdentifier = identifier.trim().toLowerCase();

  try {
    const sql = `
      SELECT 
        admin_id,
        username,
        email,
        password_hash,
        created_at
      FROM admin_users
      WHERE LOWER(username) = ? OR LOWER(email) = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(sql, [cleanIdentifier, cleanIdentifier]);

    if (rows && rows.length > 0) {
      return rows[0];
    }
  } catch (error) {
    // Graceful fallback for offline testing or unmigrated local instances
    const defaultUser = env.ADMIN.DEFAULT_USERNAME.toLowerCase();
    const defaultEmail = env.ADMIN.DEFAULT_EMAIL.toLowerCase();

    if (cleanIdentifier === defaultUser || cleanIdentifier === defaultEmail) {
      const fallbackHash = await getFallbackHash();
      return {
        admin_id: 1,
        username: env.ADMIN.DEFAULT_USERNAME,
        email: env.ADMIN.DEFAULT_EMAIL,
        password_hash: fallbackHash,
        created_at: new Date()
      };
    }
  }

  // Also check default admin in case DB exists but table is empty
  const defaultUser = env.ADMIN.DEFAULT_USERNAME.toLowerCase();
  const defaultEmail = env.ADMIN.DEFAULT_EMAIL.toLowerCase();

  if (cleanIdentifier === defaultUser || cleanIdentifier === defaultEmail) {
    const fallbackHash = await getFallbackHash();
    return {
      admin_id: 1,
      username: env.ADMIN.DEFAULT_USERNAME,
      email: env.ADMIN.DEFAULT_EMAIL,
      password_hash: fallbackHash,
      created_at: new Date()
    };
  }

  return null;
}

/**
 * Authenticates an administrator using username/email and password.
 * 
 * @param {string} identifier - Username or Email
 * @param {string} password - Candidate plain-text password
 * @returns {Promise<{success: boolean, message?: string, user?: Object}>}
 */
export async function authenticate(identifier, password) {
  const validationErrors = validateLoginInput({ username: identifier, password });
  if (validationErrors.length > 0) {
    return {
      success: false,
      message: validationErrors[0]
    };
  }

  const admin = await findByUsernameOrEmail(identifier);
  if (!admin) {
    return {
      success: false,
      message: 'Invalid username or password.'
    };
  }

  const isMatch = await comparePassword(password, admin.password_hash);
  if (!isMatch) {
    return {
      success: false,
      message: 'Invalid username or password.'
    };
  }

  // Return clean sanitized user object without password_hash
  return {
    success: true,
    user: {
      admin_id: admin.admin_id,
      username: admin.username,
      email: admin.email
    }
  };
}

export default {
  validateLoginInput,
  hashPassword,
  comparePassword,
  findByUsernameOrEmail,
  authenticate
};
