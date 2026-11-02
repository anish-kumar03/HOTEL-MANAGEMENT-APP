import { Router } from 'express';
import {
  listRooms,
  showCreateForm,
  createRoom,
  showEditForm,
  updateRoom,
  deleteRoom
} from '../controllers/roomController.js';

const router = Router();

// Room List, Search & Filtering
router.get('/', listRooms);

// Add Room
router.get('/new', showCreateForm);
router.post('/', createRoom);

// Edit Room
router.get('/:id/edit', showEditForm);
router.post('/:id/edit', updateRoom);

// Delete Room
router.post('/:id/delete', deleteRoom);

export default router;

