import { Router } from 'express';
import {
  listCustomers,
  showCreateForm,
  createCustomer,
  showCustomerDetails,
  showEditForm,
  updateCustomer,
  deleteCustomer
} from '../controllers/customerController.js';

const router = Router();

// Customer List & Search
router.get('/', listCustomers);

// Add Customer
router.get('/new', showCreateForm);
router.post('/', createCustomer);

// View Customer Details
router.get('/:id', showCustomerDetails);

// Edit Customer
router.get('/:id/edit', showEditForm);
router.post('/:id/edit', updateCustomer);

// Delete Customer
router.post('/:id/delete', deleteCustomer);

export default router;

