import { Router } from 'express';
import {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  getSingleStudent,
  getStudentsFingerprints,
  checkFingerprintUniqueness,
  // NEW: Multi-fingerprint enrollment endpoints
  getStudentFingerprints,
  enrollStudentFingerprint,
  deleteStudentFingerprint,
  checkFingerprintUniquenessMulti,
} from '../controllers/student.controller';
import { createStudentSchema, updateStudentSchema } from '../joi/student.joi';
import joiValidate from '../middlewares/joi.middleware';
import { paginateInputSchema } from '../joi/helper.joi';
import auth from '../middlewares/auth.middleware';

const studentRoute = Router();

// Existing routes
studentRoute.get('/students/staff/:staff_id', joiValidate(paginateInputSchema, 'query'), auth, getStudents);
studentRoute.get('/student/:id', getSingleStudent);
studentRoute.post('/student', joiValidate(createStudentSchema), auth, createStudent);
studentRoute.put('/student/:id', joiValidate(updateStudentSchema), auth, updateStudent);
studentRoute.delete('/student/:id', auth, deleteStudent);
studentRoute.get('/students/fingerprints/:staff_id', auth, getStudentsFingerprints);
studentRoute.post('/student/check-fingerprint', auth, checkFingerprintUniqueness);

// ============================================================================
// NEW: Multi-Fingerprint Enrollment Routes
// ============================================================================

/*
@route        GET /api/student/:student_id/fingerprints
@description  Get all enrolled fingerprints for a specific student
@access       Private
*/
studentRoute.get('/student/:student_id/fingerprints', auth, getStudentFingerprints);

/*
@route        POST /api/student/fingerprint/enroll
@description  Enroll a new fingerprint for a student
@access       Private
*/
studentRoute.post('/student/fingerprint/enroll', auth, enrollStudentFingerprint);

/*
@route        DELETE /api/student/fingerprint/:fingerprint_id
@description  Delete a specific fingerprint
@access       Private
*/
studentRoute.delete('/student/fingerprint/:fingerprint_id', auth, deleteStudentFingerprint);

/*
@route        POST /api/student/check-fingerprint-multi
@description  Check if fingerprint is unique across ALL enrolled fingerprints
@access       Private
*/
studentRoute.post('/student/check-fingerprint-multi', auth, checkFingerprintUniquenessMulti);

export default studentRoute;