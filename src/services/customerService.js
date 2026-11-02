import { query, execute } from '../config/db.js';

/**
 * Customer Service
 * Encapsulates all database operations for Customer Management using parameterized SQL.
 */

/**
 * Fetch all customers with optional search filtering by name, email, or phone.
 * @param {string} [search] - Keyword to search against name, email, or phone
 * @returns {Promise<Array>} List of customers
 */
export async function getAllCustomers(search = '') {
  let sql = `
    SELECT 
      id, 
      name, 
      email, 
      phone, 
      address, 
      DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS registration_date,
      created_at
    FROM customers
  `;
  const params = [];

  if (search && search.trim() !== '') {
    const term = `%${search.trim()}%`;
    sql += ` WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?`;
    params.push(term, term, term);
  }

  sql += ` ORDER BY id DESC`;

  return await query(sql, params);
}

/**
 * Fetch a single customer by ID.
 * @param {number|string} id - Customer ID
 * @returns {Promise<Object|null>} Customer record or null
 */
export async function getCustomerById(id) {
  const sql = `
    SELECT 
      id, 
      name, 
      email, 
      phone, 
      address, 
      DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS registration_date,
      created_at,
      updated_at
    FROM customers 
    WHERE id = ?
  `;
  const rows = await query(sql, [id]);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Check if an email already belongs to another customer.
 * @param {string} email - Email address
 * @param {number|string} [excludeId] - ID to exclude (used during updates)
 * @returns {Promise<boolean>}
 */
export async function isEmailTaken(email, excludeId = null) {
  let sql = `SELECT id FROM customers WHERE LOWER(email) = LOWER(?)`;
  const params = [email.trim()];

  if (excludeId) {
    sql += ` AND id != ?`;
    params.push(excludeId);
  }

  const rows = await query(sql, params);
  return rows.length > 0;
}

/**
 * Check if a phone number already belongs to another customer.
 * @param {string} phone - Phone number
 * @param {number|string} [excludeId] - ID to exclude (used during updates)
 * @returns {Promise<boolean>}
 */
export async function isPhoneTaken(phone, excludeId = null) {
  let sql = `SELECT id FROM customers WHERE phone = ?`;
  const params = [phone.trim()];

  if (excludeId) {
    sql += ` AND id != ?`;
    params.push(excludeId);
  }

  const rows = await query(sql, params);
  return rows.length > 0;
}

/**
 * Create a new customer record.
 * @param {Object} data - Customer payload
 * @returns {Promise<number>} New customer ID
 */
export async function createCustomer({ name, email, phone, address }) {
  const sql = `
    INSERT INTO customers (name, email, phone, address) 
    VALUES (?, ?, ?, ?)
  `;
  const result = await execute(sql, [
    name.trim(),
    email.trim().toLowerCase(),
    phone.trim(),
    address ? address.trim() : null
  ]);
  return result.insertId;
}

/**
 * Update an existing customer record.
 * @param {number|string} id - Customer ID
 * @param {Object} data - Updated customer payload
 * @returns {Promise<boolean>}
 */
export async function updateCustomer(id, { name, email, phone, address }) {
  const sql = `
    UPDATE customers 
    SET name = ?, email = ?, phone = ?, address = ?
    WHERE id = ?
  `;
  const result = await execute(sql, [
    name.trim(),
    email.trim().toLowerCase(),
    phone.trim(),
    address ? address.trim() : null,
    id
  ]);
  return result.affectedRows > 0;
}

/**
 * Check count of reservations related to this customer.
 * @param {number|string} id - Customer ID
 * @returns {Promise<number>} Reservation count
 */
export async function getCustomerReservationCount(id) {
  const sql = `SELECT COUNT(*) AS count FROM reservations WHERE customer_id = ?`;
  const rows = await query(sql, [id]);
  return rows[0].count;
}

/**
 * Fetch reservations associated with a customer.
 * @param {number|string} customerId - Customer ID
 * @returns {Promise<Array>}
 */
export async function getCustomerReservations(customerId) {
  const sql = `
    SELECT 
      res.id,
      res.booking_code,
      res.room_id,
      r.room_number,
      r.category AS room_category,
      DATE_FORMAT(res.check_in_date, '%Y-%m-%d') AS check_in_date,
      DATE_FORMAT(res.check_out_date, '%Y-%m-%d') AS check_out_date,
      res.nightly_rate,
      res.total_amount,
      res.status
    FROM reservations res
    JOIN rooms r ON res.room_id = r.id
    WHERE res.customer_id = ?
    ORDER BY res.id DESC
  `;
  return await query(sql, [customerId]);
}

/**
 * Delete a customer record after verifying no related reservations exist.
 * @param {number|string} id - Customer ID
 * @throws {Error} If customer has related reservations
 * @returns {Promise<boolean>}
 */
export async function deleteCustomer(id) {
  const reservationCount = await getCustomerReservationCount(id);
  if (reservationCount > 0) {
    throw new Error(
      `Cannot delete customer: This customer has ${reservationCount} associated reservation(s).`
    );
  }

  const sql = `DELETE FROM customers WHERE id = ?`;
  const result = await execute(sql, [id]);
  return result.affectedRows > 0;
}
