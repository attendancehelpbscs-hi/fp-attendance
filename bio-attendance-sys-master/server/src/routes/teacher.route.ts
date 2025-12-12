import { Router } from 'express';
import {
  addTeacher,
  getTeachers,
  getTeacherById,      // ✅ CORRECT - matches Document 5
  updateTeacherById,   // ✅ CORRECT - matches Document 5
  deleteTeacherById,   // ✅ CORRECT - matches Document 5
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

teacherRoute.post('/', auth, joiValidate(createTeacherSchema), addTeacher);
teacherRoute.get('/', joiValidate(paginateInputSchema, 'query'), auth, getTeachers);
teacherRoute.get('/public/assigned-sections', getPublicAssignedSections);
teacherRoute.get('/:id', auth, getTeacherById);
teacherRoute.put('/:id', auth, joiValidate(updateTeacherSchema), updateTeacherById);
teacherRoute.delete('/:id', auth, deleteTeacherById);
teacherRoute.post('/:id/approve', auth, approveOrRejectTeacher);
teacherRoute.post('/:id/send-welcome-email', auth, sendWelcomeEmail);
teacherRoute.get('/pending/list', auth, getPendingTeachers);
teacherRoute.post('/import', auth, ...importTeachers);
teacherRoute.get('/assigned-sections/:grade', auth, getAssignedSectionsForGrade);
teacherRoute.get('/assigned-sections', auth, getAllAssignedSections);

export default teacherRoute;