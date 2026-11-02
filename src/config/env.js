import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Validated Environment Configuration
 * Centralized access to all environment variables with defaults.
 */
export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 3000,
  APP_NAME: process.env.APP_NAME || 'Hotel Reservation & Management System',
  APP_URL: process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`,
  SESSION_SECRET: process.env.SESSION_SECRET || 'default_insecure_session_secret',
  
  // Administrator Setup Credentials (Used by seed script)
  ADMIN: {
    DEFAULT_USERNAME: process.env.ADMIN_USERNAME || 'admin',
    DEFAULT_EMAIL: process.env.ADMIN_EMAIL || 'admin@grandhorizon.com',
    DEFAULT_PASSWORD: process.env.ADMIN_PASSWORD || 'Admin@12345'
  },
  
  // Database Configuration (Never hardcoded)
  DB: {
    HOST: process.env.DB_HOST || 'localhost',
    PORT: parseInt(process.env.DB_PORT, 10) || 3306,
    USER: process.env.DB_USER || 'root',
    PASSWORD: process.env.DB_PASSWORD || '',
    NAME: process.env.DB_NAME || 'hotel_reservation_db',
    CONNECTION_LIMIT: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10
  },
  
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production'
};

export default env;

