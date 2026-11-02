import { query, execute } from '../config/db.js';

export const VALID_CATEGORIES = ['Standard', 'Deluxe', 'Premium', 'Suite'];
export const VALID_STATUSES = ['ACTIVE', 'MAINTENANCE'];

/**
 * Room Service
 * Encapsulates all database operations for Room Management using parameterized SQL.
 */

/**
 * Fetch all rooms with optional filtering by room number search, category, and operational status.
 * @param {Object} [filters] - Filter parameters
 * @param {string} [filters.search] - Room number search term
 * @param {string} [filters.category] - Room category filter
 * @param {string} [filters.status] - Operational status filter
 * @returns {Promise<Array>} List of rooms
 */
export async function getAllRooms({ search = '', category = '', status = '' } = {}) {
  let sql = `
    SELECT 
      id, 
      room_number, 
      category, 
      capacity, 
      price_per_night, 
      status, 
      DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS created_at,
      DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i') AS updated_at
    FROM rooms
    WHERE 1=1
  `;
  const params = [];

  if (search && search.trim() !== '') {
    sql += ` AND room_number LIKE ?`;
    params.push(`%${search.trim()}%`);
  }

  if (category && category.trim() !== '') {
    sql += ` AND category = ?`;
    params.push(category.trim());
  }

  if (status && status.trim() !== '') {
    sql += ` AND status = ?`;
    params.push(status.trim().toUpperCase());
  }

  sql += ` ORDER BY room_number ASC`;

  return await query(sql, params);
}

/**
 * Fetch a single room by ID.
 * @param {number|string} id - Room ID
 * @returns {Promise<Object|null>} Room record or null
 */
export async function getRoomById(id) {
  const sql = `
    SELECT 
      id, 
      room_number, 
      category, 
      capacity, 
      price_per_night, 
      status, 
      DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS created_at,
      DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i') AS updated_at
    FROM rooms 
    WHERE id = ?
  `;
  const rows = await query(sql, [id]);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Check if a room number is already taken by another room.
 * @param {string} roomNumber - Room number
 * @param {number|string} [excludeId] - ID to exclude (used during updates)
 * @returns {Promise<boolean>}
 */
export async function isRoomNumberTaken(roomNumber, excludeId = null) {
  let sql = `SELECT id FROM rooms WHERE LOWER(room_number) = LOWER(?)`;
  const params = [roomNumber.trim()];

  if (excludeId) {
    sql += ` AND id != ?`;
    params.push(excludeId);
  }

  const rows = await query(sql, params);
  return rows.length > 0;
}

/**
 * Create a new room record.
 * @param {Object} data - Room payload
 * @returns {Promise<number>} New room ID
 */
export async function createRoom({ room_number, category, capacity, price_per_night, status = 'ACTIVE' }) {
  const sql = `
    INSERT INTO rooms (room_number, category, capacity, price_per_night, status) 
    VALUES (?, ?, ?, ?, ?)
  `;
  const result = await execute(sql, [
    room_number.trim(),
    category.trim(),
    parseInt(capacity, 10),
    parseFloat(price_per_night),
    status.trim().toUpperCase()
  ]);
  return result.insertId;
}

/**
 * Update an existing room record.
 * @param {number|string} id - Room ID
 * @param {Object} data - Updated room payload
 * @returns {Promise<boolean>}
 */
export async function updateRoom(id, { room_number, category, capacity, price_per_night, status }) {
  const sql = `
    UPDATE rooms 
    SET room_number = ?, category = ?, capacity = ?, price_per_night = ?, status = ?
    WHERE id = ?
  `;
  const result = await execute(sql, [
    room_number.trim(),
    category.trim(),
    parseInt(capacity, 10),
    parseFloat(price_per_night),
    status.trim().toUpperCase(),
    id
  ]);
  return result.affectedRows > 0;
}

/**
 * Check count of reservations related to this room.
 * @param {number|string} id - Room ID
 * @returns {Promise<number>} Reservation count
 */
export async function getRoomReservationCount(id) {
  const sql = `SELECT COUNT(*) AS count FROM reservations WHERE room_id = ?`;
  const rows = await query(sql, [id]);
  return rows[0].count;
}

/**
 * Delete a room record after verifying no related reservations exist.
 * @param {number|string} id - Room ID
 * @throws {Error} If room has related reservations
 * @returns {Promise<boolean>}
 */
export async function deleteRoom(id) {
  const reservationCount = await getRoomReservationCount(id);
  if (reservationCount > 0) {
    throw new Error(
      `Cannot delete room: This room has ${reservationCount} associated reservation(s).`
    );
  }

  const sql = `DELETE FROM rooms WHERE id = ?`;
  const result = await execute(sql, [id]);
  return result.affectedRows > 0;
}

