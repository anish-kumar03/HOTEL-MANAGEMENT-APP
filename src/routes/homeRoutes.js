import { Router } from 'express';
import { getHomePage, getHealthStatus } from '../controllers/homeController.js';

const router = Router();

// Homepage Verification Route
router.get('/', getHomePage);

// System Health API Route
router.get('/health', getHealthStatus);

export default router;

