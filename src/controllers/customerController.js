import * as customerService from '../services/customerService.js';

/**
 * Validate customer input payload.
 * @param {Object} data 
 * @returns {Array<string>} Validation error messages
 */
function validateCustomerData({ name, email, phone }) {
  const errors = [];

  if (!name || name.trim().length < 2) {
    errors.push('Full Name is required and must be at least 2 characters long.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email.trim())) {
    errors.push('A valid email address is required.');
  }

  const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
  if (!phone || phone.trim().length < 7) {
    errors.push('A valid phone number (at least 7 digits) is required.');
  }

  return errors;
}

/**
 * List all customers with optional search term.
 */
export async function listCustomers(req, res, next) {
  try {
    const search = req.query.search || '';
    const customers = await customerService.getAllCustomers(search);

    res.render('customers/index', {
      title: 'Customer Management | HRMS',
      customers,
      search,
      successMessage: req.query.success || null,
      errorMessage: req.query.error || null
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Display form to add a new customer.
 */
export function showCreateForm(req, res) {
  res.render('customers/create', {
    title: 'Add New Customer | HRMS',
    formData: {},
    errors: []
  });
}

/**
 * Process creation of a new customer.
 */
export async function createCustomer(req, res, next) {
  try {
    const { name, email, phone, address } = req.body;
    const formData = { name, email, phone, address };
    const errors = validateCustomerData(formData);

    // Check for duplicate email and phone
    if (!errors.some(e => e.includes('email'))) {
      const emailExists = await customerService.isEmailTaken(email);
      if (emailExists) {
        errors.push(`A customer with email "${email.trim()}" already exists.`);
      }
    }

    if (!errors.some(e => e.includes('phone'))) {
      const phoneExists = await customerService.isPhoneTaken(phone);
      if (phoneExists) {
        errors.push(`A customer with phone number "${phone.trim()}" already exists.`);
      }
    }

    if (errors.length > 0) {
      return res.status(422).render('customers/create', {
        title: 'Add New Customer | HRMS',
        formData,
        errors
      });
    }

    const newId = await customerService.createCustomer(formData);
    res.redirect(`/customers?success=${encodeURIComponent(`Customer "${name.trim()}" created successfully.`)}`);
  } catch (error) {
    next(error);
  }
}

/**
 * Show customer profile and linked reservations history.
 */
export async function showCustomerDetails(req, res, next) {
  try {
    const { id } = req.params;
    const customer = await customerService.getCustomerById(id);

    if (!customer) {
      const error = new Error(`Customer with ID #${id} was not found.`);
      error.status = 404;
      return next(error);
    }

    const reservations = await customerService.getCustomerReservations(id);

    res.render('customers/show', {
      title: `Customer: ${customer.name} | HRMS`,
      customer,
      reservations,
      successMessage: req.query.success || null,
      errorMessage: req.query.error || null
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Display form to edit an existing customer.
 */
export async function showEditForm(req, res, next) {
  try {
    const { id } = req.params;
    const customer = await customerService.getCustomerById(id);

    if (!customer) {
      const error = new Error(`Customer with ID #${id} was not found.`);
      error.status = 404;
      return next(error);
    }

    res.render('customers/edit', {
      title: `Edit Customer #${customer.id} | HRMS`,
      customer,
      formData: customer,
      errors: []
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Process updating an existing customer.
 */
export async function updateCustomer(req, res, next) {
  try {
    const { id } = req.params;
    const customer = await customerService.getCustomerById(id);

    if (!customer) {
      const error = new Error(`Customer with ID #${id} was not found.`);
      error.status = 404;
      return next(error);
    }

    const { name, email, phone, address } = req.body;
    const formData = { id, name, email, phone, address };
    const errors = validateCustomerData(formData);

    // Check for duplicate email and phone excluding current customer
    if (!errors.some(e => e.includes('email'))) {
      const emailExists = await customerService.isEmailTaken(email, id);
      if (emailExists) {
        errors.push(`Another customer with email "${email.trim()}" already exists.`);
      }
    }

    if (!errors.some(e => e.includes('phone'))) {
      const phoneExists = await customerService.isPhoneTaken(phone, id);
      if (phoneExists) {
        errors.push(`Another customer with phone number "${phone.trim()}" already exists.`);
      }
    }

    if (errors.length > 0) {
      return res.status(422).render('customers/edit', {
        title: `Edit Customer #${id} | HRMS`,
        customer,
        formData,
        errors
      });
    }

    await customerService.updateCustomer(id, formData);
    res.redirect(`/customers/${id}?success=${encodeURIComponent('Customer profile updated successfully.')}`);
  } catch (error) {
    next(error);
  }
}

/**
 * Process deletion of a customer.
 */
export async function deleteCustomer(req, res, next) {
  try {
    const { id } = req.params;
    const customer = await customerService.getCustomerById(id);

    if (!customer) {
      return res.redirect(`/customers?error=${encodeURIComponent(`Customer #${id} does not exist.`)}`);
    }

    try {
      await customerService.deleteCustomer(id);
      res.redirect(`/customers?success=${encodeURIComponent(`Customer "${customer.name}" (#${id}) was deleted successfully.`)}`);
    } catch (constraintError) {
      res.redirect(`/customers?error=${encodeURIComponent(constraintError.message)}`);
    }
  } catch (error) {
    next(error);
  }
}

