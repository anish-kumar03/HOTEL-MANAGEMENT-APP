import * as billingService from '../services/billingService.js';
import * as reservationService from '../services/reservationService.js';
import { VALID_PAYMENT_METHODS, VALID_PAYMENT_STATUSES } from '../services/billingService.js';

/**
 * 1. Payment Management Directory (Overview & Transactions)
 */
export async function listPayments(req, res, next) {
  try {
    const { method = 'all', status = 'all', search = '' } = req.query;
    let payments = [];
    let metrics = { totalBilled: 0, totalCollected: 0, totalOutstanding: 0, totalTransactions: 0 };
    let dbError = null;

    try {
      [payments, metrics] = await Promise.all([
        billingService.getAllPayments({ method, status, search }),
        billingService.getBillingMetrics()
      ]);
    } catch (err) {
      dbError = `Database notice: ${err.message}`;
    }

    res.render('payments/index', {
      title: 'Payment & Billing Management | HRMS',
      payments,
      metrics,
      filters: { method, status, search },
      methods: VALID_PAYMENT_METHODS,
      statuses: VALID_PAYMENT_STATUSES,
      successMessage: req.query.success || null,
      errorMessage: req.query.error || dbError
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 2. Form to Record Payment
 */
export async function showRecordPaymentForm(req, res, next) {
  try {
    const reservationId = req.query.reservation_id || '';
    let selectedBill = null;
    let reservations = [];

    try {
      reservations = await reservationService.getAllReservations({ status: 'all' });
      if (reservationId) {
        selectedBill = await billingService.getReservationBill(reservationId);
      }
    } catch (e) {
      // Graceful fallback
    }

    res.render('payments/create', {
      title: 'Record Payment | HRMS',
      reservations,
      selectedReservationId: reservationId,
      selectedBill,
      methods: VALID_PAYMENT_METHODS,
      formData: {
        reservationId,
        amount: selectedBill ? selectedBill.calculation.remainingBalance : '',
        paymentMethod: 'CASH',
        transactionId: '',
        notes: ''
      },
      errors: []
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Process Recording a Payment
 */
export async function processPayment(req, res, next) {
  try {
    const { reservationId, amount, paymentMethod, transactionId, notes } = req.body;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.redirect(
        `/payments/new?reservation_id=${reservationId}&error=${encodeURIComponent(
          'Payment amount must be a valid positive number.'
        )}`
      );
    }

    const result = await billingService.recordPayment({
      reservationId,
      amount: parsedAmount,
      paymentMethod,
      transactionId,
      notes
    });

    res.redirect(
      `/payments/${result.paymentId}/receipt?success=${encodeURIComponent(
        `Payment of ₹${result.amount.toFixed(2)} recorded successfully via ${result.paymentMethod}!`
      )}`
    );
  } catch (error) {
    const resId = req.body.reservationId || '';
    res.redirect(
      `/payments/new?${resId ? 'reservation_id=' + resId + '&' : ''}error=${encodeURIComponent(
        error.message
      )}`
    );
  }
}

/**
 * 3. Payment History View
 */
export async function showPaymentHistory(req, res, next) {
  try {
    const { reservation_id = '', method = 'all', status = 'all' } = req.query;
    let payments = [];
    let reservation = null;
    let dbError = null;

    try {
      if (reservation_id) {
        reservation = await reservationService.getReservationById(reservation_id);
        payments = await billingService.getAllPayments({ method, status });
        payments = payments.filter(p => String(p.reservation_id) === String(reservation_id));
      } else {
        payments = await billingService.getAllPayments({ method, status });
      }
    } catch (err) {
      dbError = `Database notice: ${err.message}`;
    }

    res.render('payments/history', {
      title: 'Payment History Ledger | HRMS',
      payments,
      reservation,
      reservationId: reservation_id,
      methods: VALID_PAYMENT_METHODS,
      statuses: VALID_PAYMENT_STATUSES,
      filters: { method, status },
      successMessage: req.query.success || null,
      errorMessage: req.query.error || dbError
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 4. Invoice Details View
 */
export async function showInvoiceDetails(req, res, next) {
  try {
    const { id } = req.params; // Reservation ID
    const bill = await billingService.getReservationBill(id);

    res.render('billing/invoice', {
      title: `Invoice: ${bill.reservation.booking_code} | HRMS`,
      bill,
      successMessage: req.query.success || null,
      errorMessage: req.query.error || null
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add an Additional Service Charge to a Reservation Bill
 */
export async function addServiceCharge(req, res, next) {
  try {
    const { id } = req.params; // Reservation ID
    const { serviceName, amount } = req.body;

    await billingService.addAdditionalService(id, { serviceName, amount });
    res.redirect(`/reservations/${id}/invoice?success=${encodeURIComponent('Additional service charge added to bill.')}`);
  } catch (error) {
    res.redirect(`/reservations/${req.params.id}/invoice?error=${encodeURIComponent(error.message)}`);
  }
}

/**
 * 5. Printable Payment Receipt View
 */
export async function showPaymentReceipt(req, res, next) {
  try {
    const { id } = req.params; // Payment ID
    const receipt = await billingService.getPaymentReceipt(id);

    if (!receipt) {
      const error = new Error(`Payment Receipt #${id} was not found.`);
      error.status = 404;
      return next(error);
    }

    res.render('payments/receipt', {
      title: `Receipt: ${receipt.payment_reference} | HRMS`,
      receipt,
      successMessage: req.query.success || null
    });
  } catch (error) {
    next(error);
  }
}
