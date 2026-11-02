import { Router } from 'express';
import {
  listReservations,
  showCreateForm,
  createReservation,
  showReservationDetails,
  checkIn,
  checkOut,
  cancel,
  checkAvailabilityApi
} from '../controllers/reservationController.js';

const router = Router();

// API endpoint for dynamic room availability and live quote calculation
router.get('/api/availability', checkAvailabilityApi);

// Reservations List & Filter
router.get('/', listReservations);

// Create New Reservation
router.get('/new', showCreateForm);
router.post('/', createReservation);

// View Reservation Details Folio
router.get('/:id', showReservationDetails);

// Lifecycle Operations
router.post('/:id/checkin', checkIn);
router.post('/:id/checkout', checkOut);
router.post('/:id/cancel', cancel);

export default router;
