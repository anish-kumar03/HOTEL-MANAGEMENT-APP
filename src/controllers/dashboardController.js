import * as dashboardService from '../services/dashboardService.js';
import { testConnection } from '../config/db.js';

/**
 * Dashboard Controller
 * Orchestrates live admin dashboard data, aggregate metrics, and Chart.js datasets.
 */

export async function showDashboard(req, res, next) {
  try {
    let stats = {
      totalRooms: 0,
      activeRooms: 0,
      currentlyOccupiedRooms: 0,
      availableRoomsToday: 0,
      totalRegisteredCustomers: 0,
      totalReservations: 0,
      todayCheckIns: 0,
      todayCheckOuts: 0,
      monthlyRevenue: 0,
      pendingPaymentAmount: 0
    };

    let charts = {
      monthlyRevenueChart: { labels: [], datasets: [] },
      roomCategoryChart: { labels: [], datasets: [] },
      monthlyReservationsChart: { labels: [], datasets: [] }
    };

    let activities = {
      recentReservations: [],
      recentPayments: []
    };

    let dbNotice = null;

    try {
      [stats, charts, activities] = await Promise.all([
        dashboardService.getDashboardStatistics(),
        dashboardService.getChartData(),
        dashboardService.getRecentActivity()
      ]);
    } catch (err) {
      dbNotice = `Database notice: ${err.message}`;
    }

    res.render('dashboard/index', {
      title: 'Admin Dashboard | Hotel Reservation & Management System',
      stats,
      charts,
      activities,
      dbNotice,
      successMessage: req.query.success || null,
      errorMessage: req.query.error || null
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Dashboard JSON API for live chart data refresh
 */
export async function getDashboardApi(req, res, next) {
  try {
    const [stats, charts] = await Promise.all([
      dashboardService.getDashboardStatistics(),
      dashboardService.getChartData()
    ]);

    res.json({
      success: true,
      stats,
      charts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

