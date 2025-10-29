# Biometric Attendance System

This biometric attendance system is a time and attendance tracking system that allows staff or teachers to organize courses, manage students and mark students' attendance using their most unique physical characteristics—their fingerprints. It's built with computer vision (Python OpenCV), Flask and the MERN stack. Inspired by Gideon Idoko's original repository.

**NB**: This system has been built and tested with The DigitalPersona U.are.U 4500 scanner only. It only supports Windows OS for now.

Download and install the client for windows here: [HID DigitalPersona Client](https://drive.google.com/file/d/12QCh311WQ-_PIkMHeXqNRfTkbIWnnSdY/view?usp=sharing)

## Features

- **Student Management**: Add, edit, and manage student profiles with biometric data.
- **Course Management**: Organize and assign courses to students.
- **Biometric Attendance Marking**: Use fingerprint scanning for secure and accurate attendance tracking.
- **Manual Attendance Marking**: Option to mark attendance manually if needed.
- **Reports and Analytics**: Generate detailed reports on attendance, student performance, and audit logs.
- **User Authentication**: Secure login for staff and administrators.
- **Audit Logging**: Track all system activities for compliance and security.

## Technologies Used

- **Frontend**: React, TypeScript, Vite, SCSS
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: MySQL with Prisma ORM
- **Biometric Matching**: Python, OpenCV, Flask
- **Fingerprint Scanner**: DigitalPersona U.are.U 4500
- **Other**: JWT for authentication, Joi for validation

## Prerequisites

- Windows OS
- Node.js (v14 or higher)
- Python (v3.8 or higher)
- MySQL Database
- DigitalPersona U.are.U 4500 Scanner and Client Software

## Database Setup

1. Create a MySQL database named `bioattendancesysdb`.
2. Set up environment variables in `server/.env` with your database credentials (e.g., DB_HOST, DB_USER, DB_PASS, DB_NAME).
3. Run database migrations using Prisma: `npx prisma migrate dev`.

## Usage

- Access the React frontend at `http://localhost:3000` after starting all servers.
- Login as a staff member to manage students, courses, and attendance records.
- Use the DigitalPersona scanner for biometric attendance marking or opt for manual marking.
- Generate reports from the Reports section for attendance analytics.

## API Endpoints

The backend provides RESTful APIs for various operations. Key endpoints include:

- `POST /api/auth/login` - Staff login
- `GET /api/students` - Retrieve students
- `POST /api/students` - Add a new student
- `POST /api/attendance/mark` - Mark attendance
- `GET /api/reports/attendance` - Get attendance reports

For full API documentation, refer to the server routes and controllers.

## Project Structure

The project is divided into three sections:

1. `client` (frontend)
2. `server` (core backend)
3. `server-py` (matching backend)

## Getting Started

To start the system on Windows, open 3 terminals:

Terminal 1 - Python server:
```
cd bio-attendance-sys-master/server-py
python -m venv venv  <<< for first time use only
venv\Scripts\activate
python server.py
```

Terminal 2 - Node backend:
```
cd bio-attendance-sys-master/server
npm install <<< for first time use only
npm run generate:dev <<< for first time use only
npm run server:dev
```

Terminal 3 - React frontend:
```
cd bio-attendance-sys-master/client
npm install <<< for first time use only
npm run dev
```

## License

Distributed under the MIT License. See `LICENSE` for more information.
