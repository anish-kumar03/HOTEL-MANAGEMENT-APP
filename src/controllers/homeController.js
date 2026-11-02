import { env } from '../config/env.js';
import { testConnection } from '../config/db.js';

/**
 * Home Controller
 * Handles introductory verification and system status endpoints.
 */
export async function getHomePage(req, res, next) {
  try {
    const dbStatus = await testConnection();

    res.render('index', {
      title: 'Hotel Reservation & Management System | Home',
      appName: env.APP_NAME,
      environment: env.NODE_ENV,
      port: env.PORT,
      dbStatus,
      modules: [
        { name: 'Customer Management', status: 'Database Schema Ready', icon: 'bi-people' },
        { name: 'Room Management', status: 'Database Schema Ready', icon: 'bi-door-open' },
        { name: 'Reservation Management', status: 'Database Schema Ready', icon: 'bi-journal-bookmark' },
        { name: 'Room Availability Engine', status: 'Database Schema Ready', icon: 'bi-calendar-check' },
        { name: 'Check-In & Check-Out', status: 'Database Schema Ready', icon: 'bi-box-arrow-in-right' },
        { name: 'Payment Management', status: 'Database Schema Ready', icon: 'bi-credit-card' },
        { name: 'Reservation Status History', status: 'Database Schema Ready', icon: 'bi-clock-history' },
        { name: 'Admin Dashboard', status: 'Next Phase', icon: 'bi-speedometer2' },
        { name: 'Billing & Invoicing', status: 'Next Phase', icon: 'bi-receipt' },
        { name: 'Reports & Analytics', status: 'Next Phase', icon: 'bi-file-earmark-bar-graph' }
      ]
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Health Check API Endpoint
 * Executes "SELECT 1;" via mysql2/promise pool and returns connection status.
 */
export async function getHealthStatus(req, res) {
  const dbStatus = await testConnection();
  const httpStatus = dbStatus.success ? 200 : 503;

  res.status(httpStatus).json({
    status: dbStatus.success ? 'UP' : 'DOWN',
    service: env.APP_NAME,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: env.NODE_ENV,
    database: {
      connected: dbStatus.success,
      targetDatabase: dbStatus.database,
      host: dbStatus.host,
      testQuery: 'SELECT 1 AS health_check;',
      latencyMs: dbStatus.latencyMs,
      message: dbStatus.message,
      ...(dbStatus.code && { errorCode: dbStatus.code })
    }
  });
}
