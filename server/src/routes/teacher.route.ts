import { Router } from 'express';
import {
  addTeacher,
  getTeachers,
  getTeacherById,
  updateTeacherById,
  deleteTeacherById,
  approveOrRejectTeacher,
  getPendingTeachers,
  importTeachers,
  sendWelcomeEmail,
  getAssignedSectionsForGrade,
  getAllAssignedSections,
  getPublicAssignedSections,
} from '../controllers/teacher.controller';
import { createTeacherSchema, updateTeacherSchema } from '../../joi/teacher.joi';
import joiValidate from '../middlewares/joi.middleware';
import { paginateInputSchema } from '../joi/helper.joi';
import auth from '../middlewares/auth.middleware';

const teacherRoute = Router();

// ============================================================================
// CRITICAL: Route order matters in Express!
// Static routes (like /assigned-sections) MUST come BEFORE parameterized routes (/:id)
// Otherwise Express thinks 'assigned-sections' is the value for :id parameter
// ============================================================================

// 1. Public routes (no auth required)
teacherRoute.get('/public/assigned-sections', getPublicAssignedSections);

// 2. Static routes (specific paths - MUST come before /:id)
teacherRoute.get('/pending/list', auth, getPendingTeachers);
teacherRoute.post('/import', auth, ...importTeachers);
teacherRoute.get('/assigned-sections', auth, getAllAssignedSections);
teacherRoute.get('/assigned-sections/:grade', auth, getAssignedSectionsForGrade);

// 3. Collection routes (root path)
teacherRoute.post('/', auth, joiValidate(createTeacherSchema), addTeacher);
teacherRoute.get('/', joiValidate(paginateInputSchema, 'query'), auth, getTeachers);

// 4. Parameterized routes (MUST come LAST)
teacherRoute.get('/:id', auth, getTeacherById);
teacherRoute.put('/:id', auth, joiValidate(updateTeacherSchema), updateTeacherById);
teacherRoute.delete('/:id', auth, deleteTeacherById);
teacherRoute.post('/:id/approve', auth, approveOrRejectTeacher);
teacherRoute.post('/:id/send-welcome-email', auth, sendWelcomeEmail);

export default teacherRoute;