import app from './app.js';
import { env } from './config/env.js';
import { testConnection } from './config/db.js';

// Start HTTP server listener
const server = app.listen(env.PORT, async () => {
  console.log('='.repeat(70));
  console.log(`🏨  ${env.APP_NAME}`);
  console.log(`🚀  Server running in [${env.NODE_ENV.toUpperCase()}] mode`);
  console.log(`🌐  Local URL:   ${env.APP_URL}`);
  console.log(`🩺  Health API:  ${env.APP_URL}/health`);
  console.log('='.repeat(70));

  // Perform non-blocking database pool health verification
  const dbStatus = await testConnection();
  if (dbStatus.success) {
    console.log(`✅  Database:   ${dbStatus.message}`);
  } else {
    console.warn(`⚠️   Database:   ${dbStatus.message}`);
  }
  console.log('='.repeat(70));
});

// Handle unhandled Promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception thrown:', error);
  process.exit(1);
});

// Graceful shutdown handling
const shutdown = (signal) => {
  console.log(`\n${signal} received. Initiating graceful shutdown...`);
  server.close(() => {
    console.log('HTTP server closed. Exiting process.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

