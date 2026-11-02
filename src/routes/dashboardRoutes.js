import { Router } from 'express';
import { showDashboard, getDashboardApi } from '../controllers/dashboardController.js';

const router = Router();

// Admin Dashboard Routes
router.get('/', showDashboard);
router.get('/dashboard', showDashboard);
router.get('/api/dashboard/stats', getDashboardApi);

export default router;

