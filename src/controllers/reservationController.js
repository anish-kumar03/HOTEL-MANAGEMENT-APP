import * as reservationService from '../services/reservationService.js';
import * as customerService from '../services/customerService.js';
import * as roomService from '../services/roomService.js';

/**
 * Validate reservation input dates and guest constraints.
 * @param {Object} data 
 * @returns {Array<string>} Validation error messages
 */
export function validateReservationDates({ checkInDate, checkOutDate, guestsCount }) {
  const errors = [];

  if (!checkInDate) {
    errors.push('Check-In Date is required.');
  }

  if (!checkOutDate) {
    errors.push('Check-Out Date is required.');
  }

  if (checkInDate && checkOutDate) {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (checkInDate < todayStr) {
      errors.push(`Check-In Date cannot be in the past (minimum date is today: ${todayStr}).`);
    }

    if (checkOutDate <= checkInDate) {
      errors.push('Check-Out Date must be after the Check-In Date (at least 1 night stay required).');
    }
  }

  const guests = parseInt(guestsCount, 10);
  if (isNaN(guests) || guests < 1) {
    errors.push('Number of guests must be at least 1.');
  }

  return errors;
}

/**
 * List all reservations with filters and search.
 */
export async function listReservations(req, res, next) {
  try {
    const { status = 'all', search = '' } = req.query;
    let reservations = [];
    let dbError = null;

    try {
      reservations = await reservationService.getAllReservations({ status, search });
    } catch (err) {
      dbError = `Database connection notice: ${err.message}`;
    }

    res.render('reservations/index', {
      title: 'Reservation Management | HRMS',
      reservations,
      filters: { status, search },
      successMessage: req.query.success || null,
      errorMessage: req.query.error || dbError
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Display form to create a new reservation.
 */
export async function showCreateForm(req, res, next) {
  try {
    let customers = [];
    let rooms = [];
    let dbError = null;

    try {
      [customers, rooms] = await Promise.all([
        customerService.getAllCustomers(),
        roomService.getAllRooms({ status: 'ACTIVE' })
      ]);
    } catch (err) {
      dbError = `Database connection notice: ${err.message}`;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    res.render('reservations/create', {
      title: 'Create New Reservation | HRMS',
      customers,
      rooms,
      todayStr,
      formData: {
        checkInDate: todayStr,
        checkOutDate: tomorrowStr,
        guestsCount: 1,
        customerId: req.query.customer_id || '',
        roomId: req.query.room_id || ''
      },
      errors: dbError ? [dbError] : []
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Process creation of a new reservation using transactions.
 */
export async function createReservation(req, res, next) {
  try {
    const {
      customerId,
      roomId,
      checkInDate,
      checkOutDate,
      guestsCount,
      specialRequests,
      status = 'confirmed'
    } = req.body;

    const formData = {
      customerId,
      roomId,
      checkInDate,
      checkOutDate,
      guestsCount,
      specialRequests,
      status
    };

    const errors = validateReservationDates({ checkInDate, checkOutDate, guestsCount });

    if (!customerId) {
      errors.push('Please select a customer.');
    }

    if (!roomId) {
      errors.push('Please select a room.');
    }

    if (errors.length > 0) {
      const [customers, rooms] = await Promise.all([
        customerService.getAllCustomers(),
        roomService.getAllRooms({ status: 'ACTIVE' })
      ]);
      const todayStr = new Date().toISOString().slice(0, 10);

      return res.status(422).render('reservations/create', {
        title: 'Create New Reservation | HRMS',
        customers,
        rooms,
        todayStr,
        formData,
        errors
      });
    }

    // Call service which acquires transaction & SELECT ... FOR UPDATE
    const result = await reservationService.createReservation({
      customerId,
      roomId,
      checkInDate,
      checkOutDate,
      guestsCount,
      specialRequests,
      status
    });

    res.redirect(
      `/reservations/${result.reservationId}?success=${encodeURIComponent(
        `Reservation ${result.bookingCode} confirmed! Total amount: ₹${result.totalAmount.toFixed(2)} (${result.nights} nights).`
      )}`
    );
  } catch (error) {
    // Render error on form with preserved inputs
    try {
      const [customers, rooms] = await Promise.all([
        customerService.getAllCustomers(),
        roomService.getAllRooms({ status: 'ACTIVE' })
      ]);
      const todayStr = new Date().toISOString().slice(0, 10);

      res.status(422).render('reservations/create', {
        title: 'Create New Reservation | HRMS',
        customers,
        rooms,
        todayStr,
        formData: req.body,
        errors: [error.message]
      });
    } catch (fetchError) {
      next(fetchError);
    }
  }
}

/**
 * Display full reservation details and status history.
 */
export async function showReservationDetails(req, res, next) {
  try {
    const { id } = req.params;
    const reservation = await reservationService.getReservationById(id);

    if (!reservation) {
      const error = new Error(`Reservation with ID #${id} was not found.`);
      error.status = 404;
      return next(error);
    }

    const statusHistory = await reservationService.getReservationStatusHistory(id);

    res.render('reservations/show', {
      title: `Booking: ${reservation.booking_code} | HRMS`,
      reservation,
      statusHistory,
      successMessage: req.query.success || null,
      errorMessage: req.query.error || null
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Handle Guest Check-In action.
 */
export async function checkIn(req, res) {
  const { id } = req.params;
  try {
    await reservationService.processCheckIn(id);
    res.redirect(`/reservations/${id}?success=${encodeURIComponent('Guest successfully checked in.')}`);
  } catch (error) {
    res.redirect(`/reservations/${id}?error=${encodeURIComponent(error.message)}`);
  }
}

/**
 * Handle Guest Check-Out action.
 */
export async function checkOut(req, res) {
  const { id } = req.params;
  try {
    await reservationService.processCheckOut(id);
    res.redirect(`/reservations/${id}?success=${encodeURIComponent('Guest successfully checked out.')}`);
  } catch (error) {
    res.redirect(`/reservations/${id}?error=${encodeURIComponent(error.message)}`);
  }
}

/**
 * Handle Reservation Cancellation action.
 */
export async function cancel(req, res) {
  const { id } = req.params;
  const reason = req.body.reason || 'Reservation cancelled by front desk.';
  try {
    await reservationService.cancelReservation(id, reason);
    res.redirect(`/reservations/${id}?success=${encodeURIComponent('Reservation cancelled. Room availability released.')}`);
  } catch (error) {
    res.redirect(`/reservations/${id}?error=${encodeURIComponent(error.message)}`);
  }
}

/**
 * API Endpoint: Live Room Availability Check & Price Calculation.
 */
export async function checkAvailabilityApi(req, res) {
  try {
    const { room_id, check_in, check_out } = req.query;

    if (!room_id || !check_in || !check_out) {
      return res.status(400).json({ error: 'Missing room_id, check_in, or check_out parameters.' });
    }

    const room = await roomService.getRoomById(room_id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    const availability = await reservationService.checkRoomAvailability(room_id, check_in, check_out);
    const nights = reservationService.calculateNights(check_in, check_out);
    const pricePerNight = parseFloat(room.price_per_night);
    const totalAmount = nights > 0 ? nights * pricePerNight : 0;

    res.json({
      roomId: room.id,
      roomNumber: room.room_number,
      category: room.category,
      capacity: room.capacity,
      operationalStatus: room.status,
      pricePerNight,
      nights,
      totalAmount,
      available: availability.available && room.status === 'ACTIVE',
      conflictingReservation: availability.conflictingReservation || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
