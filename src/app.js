import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';

import { env } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import reservationRoutes from './routes/reservationRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import homeRoutes from './routes/homeRoutes.js';
import { requireAuth, authContext } from './middleware/authMiddleware.js';
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
// 3. SESSION MANAGEMENT & AUTHENTICATION CONTEXT
// =============================================================================

// Configure express-session with secure cookie settings
app.use(
  session({
    name: 'hrms_session_id',
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 // 24-hour administrator session
    }
  })
);

// Inject current authenticated administrator and metadata into template locals
app.use(authContext);

// =============================================================================
// 4. VIEW ENGINE CONFIGURATION (EJS)
// =============================================================================

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// =============================================================================
// 5. ROUTE MOUNTING
// =============================================================================

// Public Authentication Routes (/login, /logout)
app.use('/', authRoutes);

// Public System Health API Monitoring (/health)
app.use('/', homeRoutes);

// Protected Administrative Operations (Enforce Session Authentication)
app.use('/', requireAuth, dashboardRoutes);
app.use('/customers', requireAuth, customerRoutes);
app.use('/rooms', requireAuth, roomRoutes);
app.use('/reservations', requireAuth, reservationRoutes);
app.use('/', requireAuth, billingRoutes);
app.use('/reports', requireAuth, reportRoutes);

// =============================================================================
// 6. CENTRALIZED ERROR HANDLING
// =============================================================================

// 404 Not Found Catch-All
app.use(notFoundHandler);

// Centralized Global Error Handler (500)
app.use(globalErrorHandler);

export default app;
