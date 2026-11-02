import { env } from '../config/env.js';

/**
 * 404 Not Found Middleware
 * Intercepts requests that did not match any registered routes.
 */
export function notFoundHandler(req, res, next) {
  const error = new Error(`Resource Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
}

/**
 * Centralized Global Error Handler Middleware
 * Handles all operational and programmer errors gracefully.
 */
export function globalErrorHandler(err, req, res, next) {
  const statusCode = err.status || 500;
  const message = err.message || 'Internal Server Error';

  // Log error details for server diagnostics
  console.error(`[Error] ${statusCode} - ${req.method} ${req.originalUrl}:`, err.stack || err);

  // If request expects JSON, respond with JSON payload
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(statusCode).json({
      success: false,
      status: statusCode,
      message,
      ...(env.isDevelopment && { stack: err.stack })
    });
  }

  // Otherwise, render user-friendly HTML error template
  res.status(statusCode).render('error', {
    title: `${statusCode} - ${message}`,
    statusCode,
    message,
    stack: env.isDevelopment ? err.stack : null,
    path: req.originalUrl
  });
}

