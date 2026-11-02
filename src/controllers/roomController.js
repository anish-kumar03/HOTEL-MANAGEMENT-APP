import * as roomService from '../services/roomService.js';
import { VALID_CATEGORIES, VALID_STATUSES } from '../services/roomService.js';

/**
 * Validate room input payload.
 * @param {Object} data 
 * @returns {Array<string>} Validation error messages
 */
function validateRoomData({ room_number, category, capacity, price_per_night, status }) {
  const errors = [];

  if (!room_number || room_number.trim().length === 0) {
    errors.push('Room Number is required (e.g. 101, 204, A-102).');
  } else if (room_number.trim().length > 10) {
    errors.push('Room Number cannot exceed 10 characters.');
  }

  if (!category || !VALID_CATEGORIES.includes(category.trim())) {
    errors.push(`Room Category must be one of: ${VALID_CATEGORIES.join(', ')}.`);
  }

  const parsedCapacity = parseInt(capacity, 10);
  if (isNaN(parsedCapacity) || parsedCapacity < 1) {
    errors.push('Capacity must be a positive integer (at least 1 guest).');
  }

  const parsedPrice = parseFloat(price_per_night);
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    errors.push('Price Per Night must be a non-negative number.');
  }

  if (!status || !VALID_STATUSES.includes(status.trim().toUpperCase())) {
    errors.push(`Operational Status must be one of: ${VALID_STATUSES.join(', ')}.`);
  }

  return errors;
}

/**
 * List all rooms with search and category/status filtering.
 */
export async function listRooms(req, res, next) {
  try {
    const { search = '', category = '', status = '' } = req.query;
    const rooms = await roomService.getAllRooms({ search, category, status });

    res.render('rooms/index', {
      title: 'Room Management | HRMS',
      rooms,
      filters: { search, category, status },
      categories: VALID_CATEGORIES,
      statuses: VALID_STATUSES,
      successMessage: req.query.success || null,
      errorMessage: req.query.error || null
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Display form to add a new room.
 */
export function showCreateForm(req, res) {
  res.render('rooms/create', {
    title: 'Add New Room | HRMS',
    categories: VALID_CATEGORIES,
    statuses: VALID_STATUSES,
    formData: {
      capacity: 2,
      status: 'ACTIVE'
    },
    errors: []
  });
}

/**
 * Process creation of a new room.
 */
export async function createRoom(req, res, next) {
  try {
    const { room_number, category, capacity, price_per_night, status } = req.body;
    const formData = {
      room_number: room_number ? room_number.trim() : '',
      category: category ? category.trim() : '',
      capacity,
      price_per_night,
      status: status ? status.trim().toUpperCase() : 'ACTIVE'
    };

    const errors = validateRoomData(formData);

    // Prevent duplicate room numbers
    if (!errors.some(e => e.includes('Room Number'))) {
      const roomExists = await roomService.isRoomNumberTaken(formData.room_number);
      if (roomExists) {
        errors.push(`Room number "${formData.room_number}" is already registered.`);
      }
    }

    if (errors.length > 0) {
      return res.status(422).render('rooms/create', {
        title: 'Add New Room | HRMS',
        categories: VALID_CATEGORIES,
        statuses: VALID_STATUSES,
        formData,
        errors
      });
    }

    await roomService.createRoom(formData);
    res.redirect(`/rooms?success=${encodeURIComponent(`Room "${formData.room_number}" (${formData.category}) added successfully.`)}`);
  } catch (error) {
    next(error);
  }
}

/**
 * Display form to edit an existing room.
 */
export async function showEditForm(req, res, next) {
  try {
    const { id } = req.params;
    const room = await roomService.getRoomById(id);

    if (!room) {
      const error = new Error(`Room with ID #${id} was not found.`);
      error.status = 404;
      return next(error);
    }

    res.render('rooms/edit', {
      title: `Edit Room ${room.room_number} | HRMS`,
      room,
      categories: VALID_CATEGORIES,
      statuses: VALID_STATUSES,
      formData: room,
      errors: []
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Process updating an existing room.
 */
export async function updateRoom(req, res, next) {
  try {
    const { id } = req.params;
    const room = await roomService.getRoomById(id);

    if (!room) {
      const error = new Error(`Room with ID #${id} was not found.`);
      error.status = 404;
      return next(error);
    }

    const { room_number, category, capacity, price_per_night, status } = req.body;
    const formData = {
      id,
      room_number: room_number ? room_number.trim() : '',
      category: category ? category.trim() : '',
      capacity,
      price_per_night,
      status: status ? status.trim().toUpperCase() : 'ACTIVE'
    };

    const errors = validateRoomData(formData);

    // Check duplicate room number excluding current room
    if (!errors.some(e => e.includes('Room Number'))) {
      const roomExists = await roomService.isRoomNumberTaken(formData.room_number, id);
      if (roomExists) {
        errors.push(`Another room with number "${formData.room_number}" already exists.`);
      }
    }

    if (errors.length > 0) {
      return res.status(422).render('rooms/edit', {
        title: `Edit Room ${room.room_number} | HRMS`,
        room,
        categories: VALID_CATEGORIES,
        statuses: VALID_STATUSES,
        formData,
        errors
      });
    }

    await roomService.updateRoom(id, formData);
    res.redirect(`/rooms?success=${encodeURIComponent(`Room "${formData.room_number}" updated successfully.`)}`);
  } catch (error) {
    next(error);
  }
}

/**
 * Process deletion of a room.
 */
export async function deleteRoom(req, res, next) {
  try {
    const { id } = req.params;
    const room = await roomService.getRoomById(id);

    if (!room) {
      return res.redirect(`/rooms?error=${encodeURIComponent(`Room #${id} does not exist.`)}`);
    }

    try {
      await roomService.deleteRoom(id);
      res.redirect(`/rooms?success=${encodeURIComponent(`Room "${room.room_number}" was deleted successfully.`)}`);
    } catch (constraintError) {
      res.redirect(`/rooms?error=${encodeURIComponent(constraintError.message)}`);
    }
  } catch (error) {
    next(error);
  }
}

