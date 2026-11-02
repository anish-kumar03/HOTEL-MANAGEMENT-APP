import { Router } from 'express';
import { getHomePage, getHealthStatus } from '../controllers/homeController.js';

const router = Router();

// System Health API Route
router.get('/health', getHealthStatus);

// System Architecture & Foundation Status Route
router.get('/system-status', getHomePage);

export default router;
