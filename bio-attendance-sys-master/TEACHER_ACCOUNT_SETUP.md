# Teacher Account System Setup Guide

This guide explains how to set up and use the new teacher account system in the Bio Attendance System.

## Overview

The system now supports two user roles:
- **Admin**: Can manage teacher accounts and view student information (read-only)
- **Teacher**: Can manage their own students and import student data

## Setup Instructions

### 1. Database Migration

1. First, apply the database schema changes:
   ```bash
   cd server
   npx prisma migrate dev --name add-teacher-roles
   ```

2. Update existing staff accounts to have the ADMIN role:
   ```bash
   node update-roles.js
   ```

### 2. Server Configuration

1. Install the required dependencies for CSV import:
   ```bash
   npm install multer csv-parser
   ```

2. Create an uploads directory for file uploads:
   ```bash
   mkdir -p uploads
   ```

3. Start the server:
   ```bash
   npm run dev
   ```

## Usage Instructions

### Admin Functions

1. **Create Teacher Accounts**
   - Endpoint: `POST /api/teacher/create`
   - Required fields: firstName, lastName, email, password
   - Only admins can create teacher accounts

2. **View All Teachers**
   - Endpoint: `GET /api/teachers`
   - Supports pagination with page and per_page query parameters

3. **Update Teacher Accounts**
   - Endpoint: `PUT /api/teacher/:id`
   - Can update firstName, lastName, email, and password

4. **Delete Teacher Accounts**
   - Endpoint: `DELETE /api/teacher/:id`
   - Can only delete teachers with no associated students

5. **View Student Information**
   - Endpoint: `GET /api/students/staff/:staff_id`
   - Read-only access to all student information

### Teacher Functions

1. **Manage Students**
   - Create students: `POST /api/student`
   - Update students: `PUT /api/student/:id`
   - Delete students: `DELETE /api/student/:id`
   - View students: `GET /api/students/staff/:staff_id`

2. **Import Students from CSV**
   - Endpoint: `POST /api/import/students`
   - Upload a CSV file with student data
   - Required columns: name, matric_no, grade
   - Download template: `GET /api/import/template`

3. **Manage Student Fingerprints**
   - Enroll fingerprints: `POST /api/student/fingerprint/enroll`
   - View fingerprints: `GET /api/student/:student_id/fingerprints`
   - Delete fingerprints: `DELETE /api/student/fingerprint/:fingerprint_id`

## CSV Import Format

The CSV file for importing students should have the following columns:
- name: Student's full name
- matric_no: Student's unique matriculation number
- grade: Student's grade level

Example:
```
name,matric_no,grade
John Doe,2023001,Grade 10
Jane Smith,2023002,Grade 10
```

## Frontend Implementation

To complete the implementation, you'll need to update the frontend to:

1. Handle the role information returned from the login endpoint
2. Show/hide features based on user role
3. Add UI components for teacher management (admin only)
4. Add a CSV import interface for teachers
5. Update the student management interface to respect role permissions

## Security Notes

- Passwords are hashed before storing in the database
- Role-based access control is enforced at the API level
- Teachers can only access their own students
- Admins have read-only access to student data
