# The Trackers Attendance System

The Trackers Attendance System is a comprehensive biometric attendance management solution designed for educational institutions. It empowers staff and teachers to efficiently manage student profiles, courses, and attendance records with high accuracy using advanced fingerprint technology. Built with modern web technologies and powered by computer vision techniques, this system provides secure, reliable, and user-friendly operations for streamlined attendance tracking.

**NB**: This system has been built and tested with The DigitalPersona U.are.U 4500 scanner only. It only supports Windows OS for now.

Download and install the client for windows here: [HID DigitalPersona Client](https://drive.google.com/file/d/12QCh311WQ-_PIkMHeXqNRfTkbIWnnSdY/view?usp=sharing)

## Features

### Core Features
- **Multi-User System**: Support for Admin, Teacher, and Student roles with role-based access control
- **Student Management**: Comprehensive student profile management with biometric fingerprint enrollment, grades, matriculation numbers, and course assignments
- **Course Management**: Create and manage courses with unique course codes, grade classifications, and student enrollments
- **Biometric Attendance Marking**: Secure fingerprint-based attendance tracking using DigitalPersona U.are.U 4500 scanner
- **Manual Attendance Marking**: Alternative manual attendance marking with time tracking (IN/OUT) and session types (AM/PM)
- **Attendance Kiosk**: Dedicated kiosk mode for streamlined self-service attendance marking
- **Fingerprint Enrollment**: Multi-finger biometric registration with encrypted storage and integrity verification

### User Management
- **Staff Administration**: Complete staff profile management with profile pictures, biometric login, and configurable settings (grace periods, school start time, late thresholds)
- **Teacher Management**: Dedicated teacher accounts with separate login system and course assignments
- **Authentication System**: Secure login with password authentication, JWT tokens, and optional biometric authentication
- **Password Management**: Forgot password, reset password, and secure password hashing with bcrypt

### Analytics & Reporting
- **Real-time Dashboard**: Live attendance statistics, interactive charts using Recharts, and system status monitoring
- **Comprehensive Reports**: Detailed attendance reports with filtering by date ranges, courses, and grades
- **Student Reports**: Individual student attendance history and performance tracking
- **Export Capabilities**: PDF reports, Excel exports, and CSV data export functionality
- **Grade-wise Analytics**: Performance tracking and analytics by student grades and course assignments

### Security & Compliance
- **Audit Logging**: Complete audit trail of all system activities with detailed action logging
- **Data Encryption**: AES-256 encrypted biometric fingerprint data storage with SHA-256 hash verification
- **Secure Authentication**: JWT-based authentication with secure token management and session handling
- **Input Validation**: Comprehensive input validation using Joi schemas
- **Rate Limiting**: API rate limiting and security headers with Helmet
- **Data Privacy**: Secure handling of sensitive biometric and personal data

### Additional Features
- **Real-time Monitoring**: Live system status, scanner connectivity, and hardware diagnostics
- **Responsive Design**: Mobile-friendly interface built with Chakra UI for cross-device accessibility
- **Data Import**: Bulk student import functionality with CSV parsing and validation
- **Email Notifications**: Automated email notifications for password recovery and system alerts
- **System Health Monitoring**: Real-time scanner status, database connectivity, and system diagnostics
- **Settings Management**: Configurable system settings for grace periods, school timings, and attendance policies

## Technologies Used

- **Frontend**: React 18, TypeScript, Vite, Chakra UI, TanStack React Query, Zustand, Axios, Recharts, Lucide React
- **Backend**: Node.js, Express.js, TypeScript, Prisma ORM, MySQL2
- **Database**: MySQL with Prisma ORM and database migrations
- **Biometric Engine**: DigitalPersona U.are.U 4500 SDK with JavaScript integration
- **Authentication**: JWT (jsonwebtoken), bcryptjs for password hashing
- **Validation**: Joi for comprehensive input validation with auto-generated schemas
- **Email**: Nodemailer for notifications and password recovery
- **Charts & Visualization**: Recharts for interactive data visualization
- **File Processing**: Multer for file uploads, ExcelJS and CSV-parser for data import/export
- **Security**: Helmet for security headers, CORS, XSS protection, rate limiting
- **Development Tools**: ESLint, Prettier, TypeScript, Nodemon, Prisma Studio
- **Additional Libraries**: Day.js for date handling, Jimp for image processing, PDFKit for report generation

## Prerequisites

- **Operating System**: Windows OS (required for DigitalPersona scanner compatibility)
- **Node.js**: v16 or higher (LTS recommended)
- **Database**: MySQL Server 8.0 or higher
- **Hardware**: DigitalPersona U.are.U 4500 Fingerprint Scanner
- **Software**: DigitalPersona Client Software (download link above)

## Installation & Setup

### 1. Clone and Install Dependencies

```bash
# Install Node.js dependencies for client and server
npm install
```

### 2. Database Setup

1. Install and start MySQL Server
2. Create a database named `bioattendancesysdb`
3. Copy `server/.env.example` to `server/.env` and configure your database credentials:
   ```env
   DB_HOST=localhost
   DB_USER=your_username
   DB_PASS=your_password
   DB_NAME=bioattendancesysdb
   JWT_SECRET=your_jwt_secret
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_email_password
   ```
4. Run database migrations:
   ```bash
   cd server
   npx prisma generate
   npx prisma db push
   ```

### 3. Create Admin User

```bash
cd server
node create_admin.js
```

### 4. Start the System

Open two terminals and run:

**Terminal 1 - Node.js Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - React Frontend:**
```bash
cd client
npm run dev
```

Access the application at `http://localhost:5173`

## Usage Guide

### For Administrators

1. **Login**: Access the admin panel with administrator credentials
2. **Staff Management**: Create and manage staff accounts (admins and teachers) with role assignments
3. **Teacher Management**: Oversee teacher accounts, assignments, and permissions
4. **System Settings**: Configure global settings like grace periods, school timings, and attendance policies
5. **Audit Monitoring**: Review system audit logs and user activities
6. **Reports & Analytics**: Access comprehensive system-wide reports and analytics

### For Teachers

1. **Login**: Use teacher-specific login credentials
2. **Course Management**: Create and manage courses assigned to you
3. **Student Management**: Add and manage students enrolled in your courses
4. **Biometric Enrollment**: Register student fingerprints using the DigitalPersona scanner
5. **Attendance Marking**:
   - Biometric scanning for secure attendance marking
   - Manual attendance marking when needed
   - Kiosk mode for student self-service
6. **Reports**: Generate attendance reports for your courses and students

### For Students

1. **Attendance Kiosk**: Use the dedicated kiosk for self-service attendance marking
2. **Biometric Verification**: Place registered finger on scanner for instant verification
3. **Time Tracking**: Automatic IN/OUT time recording with session tracking (AM/PM)

### System Features

- **Multi-Role Access Control**: Different interfaces and permissions for admins, teachers, and students
- **Real-time Monitoring**: Live scanner status, attendance tracking, and system health
- **Audit Trail**: Complete logging of all system activities for compliance
- **Responsive Design**: Mobile-friendly interface for cross-device accessibility
- **Data Import/Export**: Bulk operations with CSV import and Excel/PDF export
- **Security**: Encrypted biometric data, JWT authentication, and secure password management

## API Documentation

The system provides comprehensive REST APIs organized by functionality. All endpoints require appropriate authentication and authorization.

### Authentication & User Management
- `POST /api/auth/staff/login` - Staff/Admin login with email/password
- `POST /api/auth/staff/logout` - Staff logout
- `POST /api/auth/staff/refresh` - Refresh JWT token
- `POST /api/auth/staff/forgot-password` - Request password reset email
- `POST /api/auth/staff/reset-password` - Reset password with token
- `POST /api/auth/staff/fingerprint-login` - Biometric login for staff
- `POST /api/teachers/login` - Teacher login
- `POST /api/teachers/register` - Register new teacher account

### Staff Management
- `GET /api/staff` - Get all staff members
- `GET /api/staff/:id` - Get staff member details
- `POST /api/staff` - Create new staff member
- `PUT /api/staff/:id` - Update staff member
- `DELETE /api/staff/:id` - Delete staff member
- `PUT /api/staff/:id/profile` - Update staff profile and settings

### Student Management
- `GET /api/students` - Retrieve students with filtering and pagination
- `GET /api/students/:id` - Get student details
- `POST /api/students` - Add new student with biometric enrollment
- `PUT /api/students/:id` - Update student information
- `DELETE /api/students/:id` - Delete student
- `POST /api/students/import` - Bulk import students from CSV
- `POST /api/students/:id/fingerprint` - Enroll/update student fingerprint

### Course Management
- `GET /api/courses` - Retrieve courses with filtering
- `GET /api/courses/:id` - Get course details
- `POST /api/courses` - Create new course
- `PUT /api/courses/:id` - Update course information
- `DELETE /api/courses/:id` - Delete course
- `POST /api/courses/:id/students` - Enroll students in course
- `DELETE /api/courses/:id/students/:studentId` - Unenroll student from course

### Attendance Management
- `GET /api/attendance` - Get attendance records with filtering
- `POST /api/attendance/mark` - Mark attendance (biometric/manual)
- `POST /api/attendance/manual` - Manual attendance marking
- `GET /api/attendance/kiosk` - Get kiosk attendance data
- `POST /api/attendance/kiosk/mark` - Mark attendance via kiosk
- `GET /api/attendance/students/:id` - Get student attendance history

### Reports & Analytics
- `GET /api/reports/dashboard` - Dashboard statistics and charts
- `GET /api/reports/attendance` - Detailed attendance reports
- `GET /api/reports/students/:id` - Individual student reports
- `POST /api/reports/export` - Export reports (PDF/Excel)
- `GET /api/audit` - Audit logs with filtering

### System & Utilities
- `GET /api/health` - System health check
- `GET /api/import/template` - Download student import template
- `POST /api/import/students` - Import students from file

For complete API documentation with request/response schemas, see the server route files in `server/src/routes/` and corresponding controllers in `server/src/controllers/`.

## Project Structure

```
bio-attendance-sys-master/
├── client/                 # React TypeScript Frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components (Home, Staff pages)
│   │   ├── api/            # API service functions
│   │   ├── store/          # Zustand state management
│   │   ├── interfaces/     # TypeScript interfaces
│   │   ├── helpers/        # Utility helper functions
│   │   ├── layouts/        # Layout components
│   │   ├── styles/         # SCSS stylesheets
│   │   └── config/         # Configuration files
│   ├── public/             # Static assets
│   └── package.json
├── server/                 # Node.js Express Backend
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   ├── services/       # Business logic services
│   │   ├── routes/         # API route definitions
│   │   ├── middlewares/    # Express middlewares
│   │   ├── helpers/        # Utility functions
│   │   ├── joi/            # Input validation schemas
│   │   ├── interfaces/     # TypeScript interfaces
│   │   ├── config/         # Configuration files
│   │   └── db/             # Database connection
│   ├── prisma/             # Database schema and migrations
│   └── package.json
├── requirements.txt        # Python dependencies for biometric processing
└── README.md
```

## Development

### Available Scripts

**Client (React):**
```bash
cd client
npm run dev          # Start Vite development server
npm run build        # Build for production with TypeScript compilation
npm run preview      # Preview production build locally
npm run postinstall  # Apply patches after installation
npm run lint:check   # Check ESLint rules
npm run lint:fix     # Auto-fix ESLint issues
```

**Server (Node.js):**
```bash
cd server
npm run server:dev   # Start development server with nodemon
npm run server:test  # Start test server
npm run server:prod  # Start production server
npm run start        # Start production server (compiled)
npm run build        # Compile TypeScript to JavaScript
npm run lint:check   # Check ESLint rules
npm run lint:fix     # Auto-fix ESLint issues
npm run studio       # Open Prisma Studio for database management
npm run seed         # Run database seeding
npm run migrate:dev  # Run Prisma migrations in development
npm run migrate:prod # Run Prisma migrations in production
npm run generate:dev # Generate Prisma client for development
npm run generate:prod # Generate Prisma client for production
npm run server:docs  # Generate and serve Prisma documentation
```


### Environment Variables

Create `.env` files in the respective directories:

**server/.env:**
```env
DB_HOST=localhost
DB_USER=root
DB_PASS=password
DB_NAME=bioattendancesysdb
JWT_SECRET=your_jwt_secret_here
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### Common Issues

1. **Scanner not detected**: Ensure DigitalPersona client is installed and scanner is connected
2. **Database connection failed**: Check MySQL server is running and credentials are correct
3. **Fingerprint enrollment failed**: Verify scanner connection and ensure proper finger placement
4. **Build errors**: Run `npm install` in all directories and ensure Node.js version is >= 16
5. **Prisma errors**: Run `npx prisma generate` and `npx prisma db push` after schema changes

### Support

For support and questions:
- Check the existing issues on GitHub
- Review the API documentation in server routes
- Ensure all prerequisites are properly installed

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Acknowledgments

- Inspired by Gideon Idoko's original Fingerprint Attendance System
- Built with modern web technologies for enhanced performance and security
- Special thanks to the DigitalPersona team for fingerprint scanner SDK
