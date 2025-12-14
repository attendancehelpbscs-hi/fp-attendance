import { Router } from 'express';
import {
  getAllHolidays,
  getHoliday,
  addHoliday,
  editHoliday,
  removeHoliday,
} from '../controllers/holiday.controller';
import auth from '../middlewares/auth.middleware';

const router = Router();

// All holiday routes require authentication
router.use(auth);

// GET /api/holidays - Get all holidays
router.get('/', getAllHolidays);

// GET /api/holidays/:id - Get holiday by ID
router.get('/:id', getHoliday);

// POST /api/holidays - Create new holiday (admin only)
router.post('/', addHoliday);

// PUT /api/holidays/:id - Update holiday (admin only)
router.put('/:id', editHoliday);

// DELETE /api/holidays/:id - Delete holiday (admin only)
router.delete('/:id', removeHoliday);

export default router;