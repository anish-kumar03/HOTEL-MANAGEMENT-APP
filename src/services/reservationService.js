import crypto from 'crypto';
import { query, execute, getConnection } from '../config/db.js';

/**
 * Reservation Service
 * Implements room availability checking, booking calculation, and transactional
 * reservation creation with InnoDB row-level locking (SELECT ... FOR UPDATE).
 */

/**
 * Generate a unique, human-readable booking code.
 * Format: RES-YYYYMMDD-XXXX (e.g. RES-20261102-A8F2)
 * @returns {string} Unique booking reference
 */
export function generateBookingCode() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `RES-${dateStr}-${randomSuffix}`;
}

/**
 * Calculate the number of nights between check-in and check-out dates.
 * @param {string} checkInDate - ISO Date (YYYY-MM-DD)
 * @param {string} checkOutDate - ISO Date (YYYY-MM-DD)
 * @returns {number} Number of nights
 */
export function calculateNights(checkInDate, checkOutDate) {
  const start = new Date(checkInDate);
  const end = new Date(checkOutDate);
  const diffTime = end.getTime() - start.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if a room is available for the given date range.
 * Overlap condition:
 *   existing_check_in < requested_check_out AND existing_check_out > requested_check_in
 * Excludes cancelled and checked-out reservations.
 * 
 * @param {number|string} roomId - Room ID
 * @param {string} checkInDate - Check-in date (YYYY-MM-DD)
 * @param {string} checkOutDate - Check-out date (YYYY-MM-DD)
 * @param {number|string} [excludeReservationId] - Exclude this reservation (for updates)
 * @returns {Promise<{ available: boolean, conflictingReservation?: Object }>}
 */
export async function checkRoomAvailability(roomId, checkInDate, checkOutDate, excludeReservationId = null) {
  let sql = `
    SELECT 
      id, 
      booking_code, 
      DATE_FORMAT(check_in_date, '%Y-%m-%d') AS check_in_date, 
      DATE_FORMAT(check_out_date, '%Y-%m-%d') AS check_out_date, 
      status
    FROM reservations
    WHERE room_id = ?
      AND status IN ('pending', 'confirmed', 'checked_in')
      AND check_in_date < ?
      AND check_out_date > ?
  `;
  const params = [roomId, checkOutDate, checkInDate];

  if (excludeReservationId) {
    sql += ` AND id != ?`;
    params.push(excludeReservationId);
  }

  const rows = await query(sql, params);
  if (rows.length > 0) {
    return { available: false, conflictingReservation: rows[0] };
  }
  return { available: true };
}

/**
 * Get all rooms that are ACTIVE and have no overlapping reservations for the specified dates.
 * @param {string} checkInDate 
 * @param {string} checkOutDate 
 * @param {number} [guestsCount=1]
 * @returns {Promise<Array>} List of available rooms
 */
export async function getAvailableRooms(checkInDate, checkOutDate, guestsCount = 1) {
  const sql = `
    SELECT 
      r.id,
      r.room_number,
      r.category,
      r.capacity,
      r.price_per_night,
      r.status
    FROM rooms r
    WHERE r.status = 'ACTIVE'
      AND r.capacity >= ?
      AND r.id NOT IN (
        SELECT res.room_id 
        FROM reservations res
        WHERE res.status IN ('pending', 'confirmed', 'checked_in')
          AND res.check_in_date < ?
          AND res.check_out_date > ?
      )
    ORDER BY r.category ASC, r.room_number ASC
  `;
  return await query(sql, [guestsCount, checkOutDate, checkInDate]);
}

/**
 * Create a new reservation atomically using an InnoDB transaction.
 * Locks the room with `SELECT ... FOR UPDATE` to prevent race conditions.
 * 
 * @param {Object} bookingData
 * @param {number|string} bookingData.customerId
 * @param {number|string} bookingData.roomId
 * @param {string} bookingData.checkInDate
 * @param {string} bookingData.checkOutDate
 * @param {number} bookingData.guestsCount
 * @param {string} [bookingData.specialRequests]
 * @param {string} [bookingData.status='confirmed']
 * @returns {Promise<Object>} Created reservation summary
 */
export async function createReservation({
  customerId,
  roomId,
  checkInDate,
  checkOutDate,
  guestsCount,
  specialRequests = '',
  status = 'confirmed'
}) {
  const connection = await getConnection();

  try {
    await connection.beginTransaction();

    // 1. Verify customer exists
    const [customerRows] = await connection.query(
      `SELECT id, name, email FROM customers WHERE id = ?`,
      [customerId]
    );
    if (customerRows.length === 0) {
      throw new Error(`Customer with ID #${customerId} does not exist.`);
    }

    // 2. Lock the room record using SELECT ... FOR UPDATE to eliminate double bookings
    const [roomRows] = await connection.query(
      `SELECT id, room_number, category, capacity, price_per_night, status 
       FROM rooms 
       WHERE id = ? 
       FOR UPDATE`,
      [roomId]
    );

    if (roomRows.length === 0) {
      throw new Error(`Room with ID #${roomId} does not exist.`);
    }

    const room = roomRows[0];

    // 3. Validate operational status
    if (room.status !== 'ACTIVE') {
      throw new Error(`Room "${room.room_number}" is currently in MAINTENANCE and cannot be reserved.`);
    }

    // 4. Validate capacity
    const guests = parseInt(guestsCount, 10);
    if (guests > room.capacity) {
      throw new Error(
        `Number of guests (${guests}) exceeds capacity of Room ${room.room_number} (Max: ${room.capacity} guests).`
      );
    }

    // 5. Evaluate date overlap constraint under the active lock
    const [conflicts] = await connection.query(
      `SELECT id, booking_code, 
              DATE_FORMAT(check_in_date, '%Y-%m-%d') AS check_in_date, 
              DATE_FORMAT(check_out_date, '%Y-%m-%d') AS check_out_date 
       FROM reservations 
       WHERE room_id = ? 
         AND status IN ('pending', 'confirmed', 'checked_in')
         AND check_in_date < ? 
         AND check_out_date > ?`,
      [roomId, checkOutDate, checkInDate]
    );

    if (conflicts.length > 0) {
      const conflict = conflicts[0];
      throw new Error(
        `Room "${room.room_number}" is not available for the selected dates. Conflicting active reservation: ${conflict.booking_code} (${conflict.check_in_date} to ${conflict.check_out_date}).`
      );
    }

    // 6. Calculate nights and total amount
    const nights = calculateNights(checkInDate, checkOutDate);
    const nightlyRate = parseFloat(room.price_per_night);
    const totalAmount = nights * nightlyRate;

    // 7. Generate unique booking code
    let bookingCode = generateBookingCode();
    // Ensure code uniqueness in the rare event of collision
    const [existingCode] = await connection.query(
      `SELECT id FROM reservations WHERE booking_code = ?`,
      [bookingCode]
    );
    if (existingCode.length > 0) {
      bookingCode = `${bookingCode}-${Math.floor(Math.random() * 100)}`;
    }

    // 8. Insert reservation record with price snapshot
    const [insertResult] = await connection.query(
      `INSERT INTO reservations 
       (booking_code, customer_id, room_id, check_in_date, check_out_date, guests_count, nightly_rate, total_amount, status, special_requests)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bookingCode,
        customerId,
        roomId,
        checkInDate,
        checkOutDate,
        guests,
        nightlyRate,
        totalAmount,
        status,
        specialRequests ? specialRequests.trim() : null
      ]
    );

    const reservationId = insertResult.insertId;

    // 9. Record initial status in reservation_status_history
    await connection.query(
      `INSERT INTO reservation_status_history 
       (reservation_id, previous_status, new_status, remarks)
       VALUES (?, NULL, ?, ?)`,
      [reservationId, status, 'Reservation booked successfully.']
    );

    // Commit the transaction
    await connection.commit();

    return {
      reservationId,
      bookingCode,
      customerName: customerRows[0].name,
      roomNumber: room.room_number,
      nights,
      nightlyRate,
      totalAmount
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Fetch all reservations with optional status or search filter.
 * @param {Object} [filters]
 * @param {string} [filters.status]
 * @param {string} [filters.search]
 * @returns {Promise<Array>} List of reservations
 */
export async function getAllReservations({ status = '', search = '' } = {}) {
  let sql = `
    SELECT 
      res.id,
      res.booking_code,
      res.customer_id,
      c.name AS customer_name,
      c.phone AS customer_phone,
      c.email AS customer_email,
      res.room_id,
      r.room_number,
      r.category AS room_category,
      DATE_FORMAT(res.check_in_date, '%Y-%m-%d') AS check_in_date,
      DATE_FORMAT(res.check_out_date, '%Y-%m-%d') AS check_out_date,
      DATEDIFF(res.check_out_date, res.check_in_date) AS nights,
      res.guests_count,
      res.nightly_rate,
      res.total_amount,
      res.status,
      DATE_FORMAT(res.created_at, '%Y-%m-%d %H:%i') AS booking_date
    FROM reservations res
    JOIN customers c ON res.customer_id = c.id
    JOIN rooms r ON res.room_id = r.id
    WHERE 1=1
  `;
  const params = [];

  if (status && status !== 'all') {
    sql += ` AND res.status = ?`;
    params.push(status.trim());
  }

  if (search && search.trim() !== '') {
    const term = `%${search.trim()}%`;
    sql += ` AND (res.booking_code LIKE ? OR c.name LIKE ? OR r.room_number LIKE ?)`;
    params.push(term, term, term);
  }

  sql += ` ORDER BY res.id DESC`;

  return await query(sql, params);
}

/**
 * Fetch full reservation details by ID.
 * @param {number|string} id - Reservation ID
 * @returns {Promise<Object|null>}
 */
export async function getReservationById(id) {
  const sql = `
    SELECT 
      res.id,
      res.booking_code,
      res.customer_id,
      c.name AS customer_name,
      c.email AS customer_email,
      c.phone AS customer_phone,
      c.address AS customer_address,
      res.room_id,
      r.room_number,
      r.category AS room_category,
      r.capacity AS room_capacity,
      r.status AS room_operational_status,
      DATE_FORMAT(res.check_in_date, '%Y-%m-%d') AS check_in_date,
      DATE_FORMAT(res.check_out_date, '%Y-%m-%d') AS check_out_date,
      DATEDIFF(res.check_out_date, res.check_in_date) AS nights,
      res.guests_count,
      res.nightly_rate,
      res.total_amount,
      res.status,
      res.special_requests,
      DATE_FORMAT(res.created_at, '%Y-%m-%d %H:%i') AS created_at,
      DATE_FORMAT(res.updated_at, '%Y-%m-%d %H:%i') AS updated_at
    FROM reservations res
    JOIN customers c ON res.customer_id = c.id
    JOIN rooms r ON res.room_id = r.id
    WHERE res.id = ?
  `;
  const rows = await query(sql, [id]);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Fetch the status transition history for a reservation.
 * @param {number|string} reservationId
 * @returns {Promise<Array>} Status history entries
 */
export async function getReservationStatusHistory(reservationId) {
  const sql = `
    SELECT 
      id,
      previous_status,
      new_status,
      DATE_FORMAT(change_timestamp, '%Y-%m-%d %H:%i:%s') AS change_timestamp,
      remarks
    FROM reservation_status_history
    WHERE reservation_id = ?
    ORDER BY id ASC
  `;
  return await query(sql, [reservationId]);
}

/**
 * Update the status of a reservation and record an entry in status history.
 * @param {number|string} id - Reservation ID
 * @param {string} newStatus - Target status
 * @param {string} remarks - Audit remark
 * @returns {Promise<boolean>}
 */
export async function updateReservationStatus(id, newStatus, remarks = '') {
  const connection = await getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT id, status FROM reservations WHERE id = ? FOR UPDATE`,
      [id]
    );

    if (rows.length === 0) {
      throw new Error(`Reservation #${id} not found.`);
    }

    const previousStatus = rows[0].status;

    if (previousStatus === newStatus) {
      await connection.rollback();
      return true;
    }

    // Update status in reservations table
    await connection.query(
      `UPDATE reservations SET status = ? WHERE id = ?`,
      [newStatus, id]
    );

    // Insert history record
    await connection.query(
      `INSERT INTO reservation_status_history 
       (reservation_id, previous_status, new_status, remarks)
       VALUES (?, ?, ?, ?)`,
      [id, previousStatus, newStatus, remarks]
    );

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Process guest Check-In.
 * @param {number|string} id - Reservation ID
 */
export async function processCheckIn(id) {
  const reservation = await getReservationById(id);
  if (!reservation) {
    throw new Error(`Reservation #${id} not found.`);
  }

  if (reservation.status === 'checked_in') {
    throw new Error(`Guest is already checked in.`);
  }

  if (['cancelled', 'checked_out', 'no_show'].includes(reservation.status)) {
    throw new Error(`Cannot check in a reservation with status "${reservation.status}".`);
  }

  return await updateReservationStatus(id, 'checked_in', 'Front-desk guest check-in completed.');
}

/**
 * Process guest Check-Out.
 * @param {number|string} id - Reservation ID
 */
export async function processCheckOut(id) {
  const reservation = await getReservationById(id);
  if (!reservation) {
    throw new Error(`Reservation #${id} not found.`);
  }

  if (reservation.status !== 'checked_in') {
    throw new Error(`Only currently checked-in reservations can be checked out (current status: ${reservation.status}).`);
  }

  return await updateReservationStatus(id, 'checked_out', 'Front-desk guest check-out completed.');
}

/**
 * Cancel a reservation.
 * @param {number|string} id - Reservation ID
 * @param {string} [reason] - Optional cancellation reason
 */
export async function cancelReservation(id, reason = 'Cancelled by administrator/guest request.') {
  const reservation = await getReservationById(id);
  if (!reservation) {
    throw new Error(`Reservation #${id} not found.`);
  }

  if (reservation.status === 'cancelled') {
    throw new Error(`Reservation is already cancelled.`);
  }

  if (reservation.status === 'checked_out') {
    throw new Error(`Cannot cancel an already completed and checked-out reservation.`);
  }

  return await updateReservationStatus(id, 'cancelled', reason);
}

