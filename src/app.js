import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env.js';
import homeRoutes from './routes/homeRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import reservationRoutes from './routes/reservationRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import { notFoundHandler, globalErrorHandler } from './middleware/errorHandler.js';

// Resolve directory paths for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express application
const app = express();

// =============================================================================
// 1. SECURITY & LOGGING MIDDLEWARE
// =============================================================================

// Helmet HTTP Security Headers (configured to allow Bootstrap & Font CDNs)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"]
      }
    }
  })
);

// HTTP Request Logging via Morgan
if (env.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// =============================================================================
// 2. REQUEST BODY PARSING & STATIC ASSETS
// =============================================================================

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded form data (extended for nested objects)
app.use(express.urlencoded({ extended: true }));

// Serve static assets from src/public
app.use(express.static(path.join(__dirname, 'public')));

// =============================================================================
// 3. VIEW ENGINE CONFIGURATION (EJS)
// =============================================================================

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// =============================================================================
// 4. ROUTE MOUNTING
// =============================================================================

// Mount Application Routes
app.use('/', homeRoutes);
app.use('/customers', customerRoutes);
app.use('/rooms', roomRoutes);
app.use('/reservations', reservationRoutes);
app.use('/', billingRoutes);

// =============================================================================
// 5. CENTRALIZED ERROR HANDLING
// =============================================================================

// 404 Not Found Catch-All
app.use(notFoundHandler);

// Centralized Global Error Handler (500)
app.use(globalErrorHandler);

export default app;

