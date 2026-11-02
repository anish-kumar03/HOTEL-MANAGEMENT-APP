import crypto from 'crypto';
import { query, execute, getConnection } from '../config/db.js';

export const VALID_PAYMENT_METHODS = ['CASH', 'UPI', 'CARD'];
export const VALID_PAYMENT_STATUSES = ['SUCCESS', 'PENDING', 'FAILED'];

/**
 * Generate a unique payment reference code.
 * Format: PAY-YYYYMMDD-XXXX
 * @returns {string} Unique payment reference
 */
export function generatePaymentReference() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `PAY-${dateStr}-${randomHex}`;
}

/**
 * Pure calculation function for billing totals:
 * Room Charges = Nights * Nightly Rate
 * Additional Charges = Total Additional Services Charges
 * Final Amount = Room Charges + Additional Charges
 * Paid Amount = SUM of successful payments
 * Remaining Balance = Final Amount - Paid Amount
 * 
 * @param {Object} params
 * @param {number} params.nights
 * @param {number} params.nightlyRate
 * @param {Array} [params.services]
 * @param {Array} [params.payments]
 * @returns {Object}
 */
export function calculateBillTotals({ nights, nightlyRate, services = [], payments = [] }) {
  const stayNights = Math.max(1, parseInt(nights, 10) || 1);
  const rate = parseFloat(nightlyRate) || 0;
  const roomCharges = parseFloat((stayNights * rate).toFixed(2));

  const additionalCharges = parseFloat(
    services.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0).toFixed(2)
  );

  const finalAmount = parseFloat((roomCharges + additionalCharges).toFixed(2));

  const paidAmount = parseFloat(
    payments
      .filter(p => p.payment_status === 'SUCCESS')
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
      .toFixed(2)
  );

  const remainingBalance = parseFloat(Math.max(0, finalAmount - paidAmount).toFixed(2));

  let billPaymentStatus = 'UNPAID';
  if (paidAmount >= finalAmount && finalAmount > 0) {
    billPaymentStatus = 'PAID';
  } else if (paidAmount > 0 && remainingBalance > 0) {
    billPaymentStatus = 'PARTIALLY_PAID';
  }

  return {
    nights: stayNights,
    nightlyRate: rate,
    roomCharges,
    additionalCharges,
    finalAmount,
    paidAmount,
    remainingBalance,
    billPaymentStatus
  };
}

/**
 * Calculate full reservation billing information on the server.
 * Never trusts frontend financial totals.
 * 
 * @param {number|string} reservationId
 * @returns {Promise<Object>} Calculated bill summary
 */
export async function getReservationBill(reservationId) {
  const resSql = `
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
      DATE_FORMAT(res.check_in_date, '%Y-%m-%d') AS check_in_date,
      DATE_FORMAT(res.check_out_date, '%Y-%m-%d') AS check_out_date,
      DATEDIFF(res.check_out_date, res.check_in_date) AS nights,
      res.guests_count,
      res.nightly_rate,
      res.status AS reservation_status,
      DATE_FORMAT(res.created_at, '%Y-%m-%d %H:%i') AS booking_date
    FROM reservations res
    JOIN customers c ON res.customer_id = c.id
    JOIN rooms r ON res.room_id = r.id
    WHERE res.id = ?
  `;
  const resRows = await query(resSql, [reservationId]);

  if (resRows.length === 0) {
    throw new Error(`Reservation #${reservationId} was not found.`);
  }

  const reservation = resRows[0];

  // Fetch itemized additional service charges
  const servicesSql = `
    SELECT id, service_name, amount, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS created_at
    FROM reservation_services 
    WHERE reservation_id = ? 
    ORDER BY id ASC
  `;
  let services = [];
  try {
    services = await query(servicesSql, [reservationId]);
  } catch (e) {
    // Graceful fallback if table does not yet have rows
    services = [];
  }

  // Fetch all payment records for this reservation
  const paymentsSql = `
    SELECT 
      id,
      payment_reference,
      amount,
      payment_method,
      payment_status,
      DATE_FORMAT(payment_date, '%Y-%m-%d %H:%i') AS payment_date,
      transaction_id,
      notes
    FROM payments
    WHERE reservation_id = ?
    ORDER BY id ASC
  `;
  const payments = await query(paymentsSql, [reservationId]);

  const calculation = calculateBillTotals({
    nights: reservation.nights,
    nightlyRate: reservation.nightly_rate,
    services,
    payments
  });

  return {
    reservation,
    calculation,
    services,
    payments
  };
}

/**
 * Add an itemized additional service charge to a reservation bill.
 * @param {number|string} reservationId
 * @param {Object} serviceData
 * @param {string} serviceData.serviceName
 * @param {number|string} serviceData.amount
 * @returns {Promise<number>} Inserted service ID
 */
export async function addAdditionalService(reservationId, { serviceName, amount }) {
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    throw new Error('Service charge amount must be a positive number.');
  }

  if (!serviceName || serviceName.trim().length === 0) {
    throw new Error('Service name is required (e.g. Laundry, Airport Shuttle, Room Service).');
  }

  const sql = `
    INSERT INTO reservation_services (reservation_id, service_name, amount)
    VALUES (?, ?, ?)
  `;
  const result = await execute(sql, [reservationId, serviceName.trim(), parsedAmount]);
  return result.insertId;
}

/**
 * Record a payment against a reservation using an ACID InnoDB transaction.
 * - Recalculates remaining balance within transaction lock.
 * - Enforces payment <= remaining balance.
 * - Never stores card numbers or CVV.
 * 
 * @param {Object} paymentPayload
 * @param {number|string} paymentPayload.reservationId
 * @param {number|string} paymentPayload.amount
 * @param {string} paymentPayload.paymentMethod - CASH, UPI, or CARD
 * @param {string} [paymentPayload.transactionId] - Optional external payment ref (e.g. UPI Ref / Auth ID)
 * @param {string} [paymentPayload.notes]
 * @returns {Promise<Object>} Created payment record with updated balance
 */
export async function recordPayment({
  reservationId,
  amount,
  paymentMethod,
  transactionId = null,
  notes = null
}) {
  const connection = await getConnection();

  try {
    await connection.beginTransaction();

    // 1. Lock reservation row to prevent race conditions during concurrent settlements
    const [resRows] = await connection.query(
      `SELECT id, booking_code, nightly_rate, 
              DATEDIFF(check_out_date, check_in_date) AS nights 
       FROM reservations 
       WHERE id = ? 
       FOR UPDATE`,
      [reservationId]
    );

    if (resRows.length === 0) {
      throw new Error(`Reservation #${reservationId} was not found.`);
    }

    const reservation = resRows[0];
    const nights = Math.max(1, parseInt(reservation.nights, 10));
    const roomCharges = parseFloat((nights * parseFloat(reservation.nightly_rate)).toFixed(2));

    // 2. Lock and calculate additional charges
    let additionalCharges = 0;
    try {
      const [serviceRows] = await connection.query(
        `SELECT amount FROM reservation_services WHERE reservation_id = ? FOR UPDATE`,
        [reservationId]
      );
      additionalCharges = parseFloat(
        serviceRows.reduce((sum, s) => sum + parseFloat(s.amount), 0).toFixed(2)
      );
    } catch (e) {
      additionalCharges = 0;
    }

    const finalAmount = parseFloat((roomCharges + additionalCharges).toFixed(2));

    // 3. Lock and calculate all existing SUCCESS payments
    const [existingPayments] = await connection.query(
      `SELECT amount FROM payments 
       WHERE reservation_id = ? AND payment_status = 'SUCCESS' 
       FOR UPDATE`,
      [reservationId]
    );

    const previouslyPaid = parseFloat(
      existingPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0).toFixed(2)
    );

    const remainingBalance = parseFloat(Math.max(0, finalAmount - previouslyPaid).toFixed(2));

    // 4. Server-side financial validations
    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    if (remainingBalance <= 0) {
      throw new Error('This reservation bill is already fully settled (Remaining Balance is ₹0.00).');
    }

    if (payAmount > remainingBalance) {
      throw new Error(
        `Payment amount (₹${payAmount.toFixed(2)}) cannot exceed the remaining balance of ₹${remainingBalance.toFixed(2)}.`
      );
    }

    const normalizedMethod = paymentMethod.trim().toUpperCase();
    if (!VALID_PAYMENT_METHODS.includes(normalizedMethod)) {
      throw new Error(`Invalid payment method. Accepted methods: ${VALID_PAYMENT_METHODS.join(', ')}.`);
    }

    // 5. Generate unique payment reference
    const paymentRef = generatePaymentReference();

    // 6. Insert payment record (strictly without storing card numbers or CVV)
    const [insertResult] = await connection.query(
      `INSERT INTO payments 
       (payment_reference, reservation_id, amount, payment_method, payment_status, transaction_id, notes)
       VALUES (?, ?, ?, ?, 'SUCCESS', ?, ?)`,
      [
        paymentRef,
        reservationId,
        payAmount,
        normalizedMethod,
        transactionId ? transactionId.trim() : null,
        notes ? notes.trim() : null
      ]
    );

    const paymentId = insertResult.insertId;
    const newRemainingBalance = parseFloat((remainingBalance - payAmount).toFixed(2));

    // 7. If bill is now fully paid, record in reservation status history
    if (newRemainingBalance === 0) {
      await connection.query(
        `INSERT INTO reservation_status_history 
         (reservation_id, previous_status, new_status, remarks)
         VALUES (?, 'confirmed', 'confirmed', ?)`,
        [reservationId, `Bill fully settled via ${normalizedMethod} (${paymentRef}).`]
      );
    }

    await connection.commit();

    return {
      paymentId,
      paymentReference: paymentRef,
      reservationId,
      bookingCode: reservation.booking_code,
      amount: payAmount,
      paymentMethod: normalizedMethod,
      remainingBalance: newRemainingBalance,
      isFullyPaid: newRemainingBalance === 0
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Fetch a single payment receipt by ID.
 * @param {number|string} paymentId
 * @returns {Promise<Object|null>}
 */
export async function getPaymentReceipt(paymentId) {
  const sql = `
    SELECT 
      p.id,
      p.payment_reference,
      p.amount,
      p.payment_method,
      p.payment_status,
      DATE_FORMAT(p.payment_date, '%Y-%m-%d %H:%i:%s') AS payment_date,
      p.transaction_id,
      p.notes,
      res.id AS reservation_id,
      res.booking_code,
      DATE_FORMAT(res.check_in_date, '%Y-%m-%d') AS check_in_date,
      DATE_FORMAT(res.check_out_date, '%Y-%m-%d') AS check_out_date,
      DATEDIFF(res.check_out_date, res.check_in_date) AS nights,
      res.nightly_rate,
      c.id AS customer_id,
      c.name AS customer_name,
      c.email AS customer_email,
      c.phone AS customer_phone,
      r.room_number,
      r.category AS room_category
    FROM payments p
    JOIN reservations res ON p.reservation_id = res.id
    JOIN customers c ON res.customer_id = c.id
    JOIN rooms r ON res.room_id = r.id
    WHERE p.id = ?
  `;
  const rows = await query(sql, [paymentId]);
  if (rows.length === 0) return null;

  const payment = rows[0];
  // Calculate remaining balance at time of inspection
  const bill = await getReservationBill(payment.reservation_id);

  return {
    ...payment,
    billSummary: bill.calculation
  };
}

/**
 * Fetch all payments with filtering for the Payment Management directory.
 * @param {Object} [filters]
 * @param {string} [filters.method]
 * @param {string} [filters.status]
 * @param {string} [filters.search]
 * @returns {Promise<Array>}
 */
export async function getAllPayments({ method = '', status = '', search = '' } = {}) {
  let sql = `
    SELECT 
      p.id,
      p.payment_reference,
      p.reservation_id,
      res.booking_code,
      c.name AS customer_name,
      r.room_number,
      p.amount,
      p.payment_method,
      p.payment_status,
      DATE_FORMAT(p.payment_date, '%Y-%m-%d %H:%i') AS payment_date,
      p.transaction_id,
      p.notes
    FROM payments p
    JOIN reservations res ON p.reservation_id = res.id
    JOIN customers c ON res.customer_id = c.id
    JOIN rooms r ON res.room_id = r.id
    WHERE 1=1
  `;
  const params = [];

  if (method && method !== 'all') {
    sql += ` AND p.payment_method = ?`;
    params.push(method.trim().toUpperCase());
  }

  if (status && status !== 'all') {
    sql += ` AND p.payment_status = ?`;
    params.push(status.trim().toUpperCase());
  }

  if (search && search.trim() !== '') {
    const term = `%${search.trim()}%`;
    sql += ` AND (p.payment_reference LIKE ? OR res.booking_code LIKE ? OR c.name LIKE ? OR p.transaction_id LIKE ?)`;
    params.push(term, term, term, term);
  }

  sql += ` ORDER BY p.id DESC`;

  return await query(sql, params);
}

/**
 * Compute aggregate financial metrics for the payment overview dashboard.
 * @returns {Promise<Object>}
 */
export async function getBillingMetrics() {
  const paymentsQuery = `
    SELECT 
      COALESCE(SUM(CASE WHEN payment_status = 'SUCCESS' THEN amount ELSE 0 END), 0) AS total_collected,
      COUNT(id) AS total_transactions,
      COUNT(CASE WHEN payment_status = 'SUCCESS' THEN 1 END) AS successful_transactions
    FROM payments
  `;
  const paymentStats = await query(paymentsQuery);

  const reservationsQuery = `
    SELECT 
      COALESCE(SUM(DATEDIFF(check_out_date, check_in_date) * nightly_rate), 0) AS total_room_revenue
    FROM reservations
    WHERE status != 'cancelled'
  `;
  const reservationStats = await query(reservationsQuery);

  let servicesTotal = 0;
  try {
    const servicesQuery = `SELECT COALESCE(SUM(amount), 0) AS total_services FROM reservation_services`;
    const servicesStats = await query(servicesQuery);
    servicesTotal = parseFloat(servicesStats[0].total_services);
  } catch (e) {
    servicesTotal = 0;
  }

  const totalCollected = parseFloat(paymentStats[0].total_collected);
  const totalBilled = parseFloat(reservationStats[0].total_room_revenue) + servicesTotal;
  const totalOutstanding = parseFloat(Math.max(0, totalBilled - totalCollected).toFixed(2));

  return {
    totalBilled,
    totalCollected,
    totalOutstanding,
    totalTransactions: paymentStats[0].total_transactions,
    successfulTransactions: paymentStats[0].successful_transactions
  };
}
