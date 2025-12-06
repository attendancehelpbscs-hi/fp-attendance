import { Router, Request } from 'express';
import path from 'path';
import { importStudentsFromCSV, importTeachersFromCSV, getCSVTemplate } from '../controllers/import.controller';
import auth from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import multer from 'multer';

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const allowedMimeTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV or Excel files are allowed'));
    }
  },
});

const importRoute = Router();

/*
@route          POST /api/import/students (import students from CSV)
@description    Import students from a CSV file (teacher only)
@access         Private (Teacher only)
*/
importRoute.post('/import/students', auth, requireRole('TEACHER'), upload.single('file'), importStudentsFromCSV);

/*
@route          GET /api/import/template (get CSV template)
@description    Download a CSV template for student import
@access         Private
*/
importRoute.get('/import/template', auth, getCSVTemplate);

/*
@route          POST /api/admin/teachers/import (import teachers from CSV)
@description    Import teachers from a CSV file (admin only)
@access         Private (Admin only)
*/
importRoute.post('/admin/teachers/import', auth, requireRole('ADMIN'), upload.single('file'), importTeachersFromCSV);

export default importRoute;
