import * as reportService from '../services/reportService.js';
import { VALID_CATEGORIES } from '../services/roomService.js';
import { VALID_PAYMENT_METHODS, VALID_PAYMENT_STATUSES } from '../services/billingService.js';

const RESERVATION_STATUSES = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'];

/**
 * Report Controller
 * Orchestrates all 7 reports and the central reports portal.
 */

/**
 * Central Reports Portal / Directory
 */
export async function showReportsIndex(req, res, next) {
  try {
    res.render('reports/index', {
      title: 'Reporting & Analytics Portal | HRMS',
      successMessage: req.query.success || null,
      errorMessage: req.query.error || null
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Report 1: Daily Reservation Report
 */
export async function showDailyReservationReport(req, res, next) {
  try {
    const {
      startDate = '',
      endDate = '',
      status = 'all',
      category = 'all'
    } = req.query;

    const data = await reportService.getDailyReservationReport({
      startDate,
      endDate,
      status,
      category
    });

    res.render('reports/daily_reservations', {
      title: 'Daily Reservation Report | HRMS',
      records: data.records,
      summary: data.summary,
      filters: { startDate, endDate, status, category },
      categories: VALID_CATEGORIES,
      statuses: RESERVATION_STATUSES
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Report 2: Monthly Reservation Report
 */
export async function showMonthlyReservationReport(req, res, next) {
  try {
    const currentYear = new Date().getFullYear();
    const {
      year = currentYear,
      status = 'all',
      category = 'all'
    } = req.query;

    const data = await reportService.getMonthlyReservationReport({
      year,
      status,
      category
    });

    res.render('reports/monthly_reservations', {
      title: 'Monthly Reservation Report | HRMS',
      monthlyData: data.monthlyData,
      grandSummary: data.grandSummary,
      filters: { year: parseInt(year, 10), status, category },
      categories: VALID_CATEGORIES,
      statuses: RESERVATION_STATUSES,
      currentYear
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Report 3: Customer Booking Report
 */
export async function showCustomerBookingReport(req, res, next) {
  try {
    const {
      search = '',
      minBookings = 0,
      sortBy = 'spend_desc'
    } = req.query;

    const data = await reportService.getCustomerBookingReport({
      search,
      minBookings,
      sortBy
    });

    res.render('reports/customer_bookings', {
      title: 'Customer Booking Report | HRMS',
      customers: data.customers,
      summary: data.summary,
      filters: { search, minBookings, sortBy }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Report 4: Room Availability Report
 */
export async function showRoomAvailabilityReport(req, res, next) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const {
      targetDate = today,
      category = 'all',
      availabilityStatus = 'all'
    } = req.query;

    const data = await reportService.getRoomAvailabilityReport({
      targetDate,
      category,
      availabilityStatus
    });

    res.render('reports/room_availability', {
      title: 'Room Availability Report | HRMS',
      targetDate: data.targetDate,
      rooms: data.rooms,
      summary: data.summary,
      filters: { targetDate, category, availabilityStatus },
      categories: VALID_CATEGORIES,
      today
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Report 5: Monthly Revenue Report
 */
export async function showMonthlyRevenueReport(req, res, next) {
  try {
    const currentYear = new Date().getFullYear();
    const {
      year = currentYear,
      method = 'all',
      paymentStatus = 'SUCCESS'
    } = req.query;

    const data = await reportService.getMonthlyRevenueReport({
      year,
      method,
      paymentStatus
    });

    res.render('reports/monthly_revenue', {
      title: 'Monthly Revenue Report | HRMS',
      year: data.year,
      monthlyBreakdown: data.monthlyBreakdown,
      summary: data.summary,
      filters: { year: parseInt(year, 10), method, paymentStatus },
      methods: VALID_PAYMENT_METHODS,
      paymentStatuses: VALID_PAYMENT_STATUSES,
      currentYear
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Report 6: Payment History Report
 */
export async function showPaymentHistoryReport(req, res, next) {
  try {
    const {
      startDate = '',
      endDate = '',
      method = 'all',
      status = 'all',
      search = ''
    } = req.query;

    const data = await reportService.getPaymentHistoryReport({
      startDate,
      endDate,
      method,
      status,
      search
    });

    res.render('reports/payment_history', {
      title: 'Payment History Report | HRMS',
      payments: data.payments,
      summary: data.summary,
      filters: { startDate, endDate, method, status, search },
      methods: VALID_PAYMENT_METHODS,
      statuses: VALID_PAYMENT_STATUSES
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Report 7: Cancelled Reservation Report
 */
export async function showCancelledReservationReport(req, res, next) {
  try {
    const {
      startDate = '',
      endDate = '',
      category = 'all',
      search = ''
    } = req.query;

    const data = await reportService.getCancelledReservationReport({
      startDate,
      endDate,
      category,
      search
    });

    res.render('reports/cancelled_reservations', {
      title: 'Cancelled Reservation Report | HRMS',
      cancellations: data.cancellations,
      summary: data.summary,
      filters: { startDate, endDate, category, search },
      categories: VALID_CATEGORIES
    });
  } catch (error) {
    next(error);
  }
}
