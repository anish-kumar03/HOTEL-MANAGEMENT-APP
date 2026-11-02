import { Router } from 'express';
import {
  listPayments,
  showRecordPaymentForm,
  processPayment,
  showPaymentHistory,
  showInvoiceDetails,
  addServiceCharge,
  showPaymentReceipt
} from '../controllers/billingController.js';

const router = Router();

// Payment Directory & Management
router.get('/payments', listPayments);

// Payment History Ledger
router.get('/payments/history', showPaymentHistory);

// Record New Payment
router.get('/payments/new', showRecordPaymentForm);
router.post('/payments', processPayment);

// Printable Payment Receipt
router.get('/payments/:id/receipt', showPaymentReceipt);

// Invoice Details
router.get('/reservations/:id/invoice', showInvoiceDetails);

// Add Additional Service Charge to Reservation
router.post('/reservations/:id/services', addServiceCharge);

export default router;
