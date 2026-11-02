/**
 * =============================================================================
 * HOTEL RESERVATION & MANAGEMENT SYSTEM (HRMS)
 * Authentication Routes
 * =============================================================================
 * 
 * Endpoints:
 * - GET  /login   - Render administrator login form
 * - POST /login   - Authenticate credentials and establish session
 * - GET  /logout  - Destroy session and redirect to login
 * - POST /logout  - Destroy session and redirect to login
 * =============================================================================
 */

import { Router } from 'express';
import authController from '../controllers/authController.js';
import { redirectIfAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Login endpoints
router.get('/login', redirectIfAuth, authController.renderLogin);
router.post('/login', redirectIfAuth, authController.processLogin);

// Logout endpoints (supports both POST from modal and GET link)
router.get('/logout', authController.logout);
router.post('/logout', authController.logout);

export default router;
