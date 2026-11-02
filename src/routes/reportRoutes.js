import { Router } from 'express';
import {
  showReportsIndex,
  showDailyReservationReport,
  showMonthlyReservationReport,
  showCustomerBookingReport,
  showRoomAvailabilityReport,
  showMonthlyRevenueReport,
  showPaymentHistoryReport,
  showCancelledReservationReport
} from '../controllers/reportController.js';

const router = Router();

// Central Reports Catalog
router.get('/', showReportsIndex);

// 1. Daily Reservation Report
router.get('/daily-reservations', showDailyReservationReport);

// 2. Monthly Reservation Report
router.get('/monthly-reservations', showMonthlyReservationReport);

// 3. Customer Booking Report
router.get('/customer-bookings', showCustomerBookingReport);

// 4. Room Availability Report
router.get('/room-availability', showRoomAvailabilityReport);

// 5. Monthly Revenue Report
router.get('/monthly-revenue', showMonthlyRevenueReport);

// 6. Payment History Report
router.get('/payment-history', showPaymentHistoryReport);

// 7. Cancelled Reservation Report
router.get('/cancelled-reservations', showCancelledReservationReport);

export default router;

