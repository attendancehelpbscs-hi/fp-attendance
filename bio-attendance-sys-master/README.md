# The Trackers Attendance System

The Trackers Attendance System is a comprehensive biometric attendance management solution designed for educational institutions. It empowers staff and teachers to efficiently manage student profiles, courses, and attendance records with high accuracy using advanced fingerprint technology. Built with modern web technologies and powered by computer vision techniques, this system provides secure, reliable, and user-friendly operations for streamlined attendance tracking.

**NB**: This system has been built and tested with The DigitalPersona U.are.U 4500 scanner only. It only supports Windows OS for now.

Download and install the client for windows here: [HID DigitalPersona Client](https://drive.google.com/file/d/12QCh311WQ-_PIkMHeXqNRfTkbIWnnSdY/view?usp=sharing)

## Features

### Core Features
- **Student Management**: Comprehensive student profile management with biometric enrollment, grades, and course assignments
- **Course Management**: Create and manage courses with ID numbers and grade classifications
- **Biometric Attendance Marking**: Secure fingerprint-based attendance tracking with high accuracy
- **Manual Attendance Marking**: Alternative manual attendance marking when biometric scanning is unavailable
- **Time Tracking**: IN/OUT time recording with configurable grace periods and late thresholds
- **Attendance Kiosk**: Dedicated kiosk mode for streamlined attendance marking

### Staff Management
- **Staff Profiles**: Complete staff profile management with profile pictures and biometric login
- **Authentication**: Secure login with password and optional biometric authentication
- **Password Recovery**: Forgot password and reset password functionality
- **Role-based Access**: Staff-specific access controls and permissions

### Analytics & Reporting
- **Real-time Dashboard**: Live attendance statistics, charts, and system status monitoring
- **Comprehensive Reports**: Detailed attendance reports, trends, and analytics by date ranges
- **Grade-wise Analytics**: Performance tracking by student grades and courses
- **Monthly Breakdowns**: Historical attendance data with monthly absence analysis

### Security & Compliance
- **Audit Logging**: Complete audit trail of all system activities for compliance
- **Data Privacy**: GDPR and PDPA compliant with encrypted biometric data storage
- **Secure Authentication**: JWT-based authentication with secure token management
- **Access Controls**: Granular permissions and activity monitoring

### Additional Features
- **Real-time Notifications**: Live system status and scanner connectivity monitoring
- **Responsive Design**: Mobile-friendly interface for cross-device accessibility
- **Data Export**: Export capabilities for reports and attendance data
- **System Health Monitoring**: Real-time scanner status and system diagnostics

## Technologies Used

- **Frontend**: React, TypeScript, Vite, SCSS, Chakra UI
- **Backend**: Node.js, Express.js, TypeScript, Prisma ORM
- **Database**: MySQL with Prisma ORM
- **Biometric Engine**: Python, OpenCV, DigitalPersona SDK
- **Authentication**: JWT, bcrypt for password hashing
- **Validation**: Joi for input validation
- **Email**: Nodemailer for notifications and password recovery
- **Charts**: Recharts for data visualization

## Prerequisites

- **Operating System**: Windows OS (required for DigitalPersona scanner compatibility)
- **Node.js**: v14 or higher
- **Python**: v3.8 or higher
- **Database**: MySQL Server
- **Hardware**: DigitalPersona U.are.U 4500 Fingerprint Scanner
- **Software**: DigitalPersona Client Software (download link above)

## Installation & Setup

### 1. Clone and Install Dependencies

```bash
# Install Node.js dependencies for client and server
npm install

# Install Python dependencies
cd server-py
pip install -r requirements.txt
cd ..
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

Open three terminals and run:

**Terminal 1 - Python Biometric Server:**
```bash
cd server-py
python server.py
```

**Terminal 2 - Node.js Backend:**
```bash
cd server
npm run dev
```

**Terminal 3 - React Frontend:**
```bash
cd client
npm run dev
```

Access the application at `http://localhost:5173`

## Usage Guide

### For Staff Members

1. **Login**: Use your staff credentials to log in
2. **Dashboard**: View real-time attendance statistics and system status
3. **Student Management**: Add/edit students with biometric enrollment
4. **Course Management**: Create courses and assign students
5. **Attendance Marking**:
   - Use biometric scanner for automatic marking
   - Manual marking as alternative
   - Kiosk mode for streamlined operations
6. **Reports**: Generate detailed attendance reports and analytics

### System Features

- **Real-time Monitoring**: Live scanner status and attendance tracking
- **Audit Trail**: Complete logging of all system activities
- **Responsive Design**: Works on desktop and mobile devices
- **Data Export**: Export reports and attendance data
- **Security**: Encrypted biometric data and secure authentication

## API Documentation

The system provides comprehensive REST APIs. Key endpoints include:

### Authentication
- `POST /api/auth/login` - Staff login
- `POST /api/auth/forgot-password` - Password recovery
- `POST /api/auth/reset-password` - Password reset

### Student Management
- `GET /api/students` - Retrieve students
- `POST /api/students` - Add new student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Course Management
- `GET /api/courses` - Retrieve courses
- `POST /api/courses` - Create course
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course

### Attendance
- `POST /api/attendance/mark` - Mark attendance (biometric/manual)
- `GET /api/attendance` - Get attendance records

### Reports & Analytics
- `GET /api/reports/dashboard` - Dashboard statistics
- `GET /api/reports/attendance` - Attendance reports
- `GET /api/audit` - Audit logs

For complete API documentation, see the server route files and controllers.

## Project Structure

```
bio-attendance-sys-master/
├── client/                 # React TypeScript Frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components (Home, Staff pages)
│   │   ├── api/            # API service functions
│   │   ├── lib/            # Fingerprint library integration
│   │   ├── store/          # Zustand state management
│   │   └── interfaces/     # TypeScript interfaces
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
│   │   └── interfaces/     # TypeScript interfaces
│   ├── prisma/             # Database schema and migrations
│   └── package.json
├── server-py/              # Python Biometric Matching Server
│   ├── fingerprints/       # Stored fingerprint data
│   ├── server.py           # Flask biometric server
│   └── requirements.txt
└── README.md
```

## Development

### Available Scripts

**Client (React):**
```bash
cd client
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

**Server (Node.js):**
```bash
cd server
npm run dev          # Start development server with nodemon
npm run build        # Build TypeScript
npm run start        # Start production server
npm run generate:dev # Generate Prisma client
```

**Python Server:**
```bash
cd server-py
python server.py     # Start Flask biometric server
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
3. **Python server errors**: Install required Python packages and ensure OpenCV is properly configured
4. **Build errors**: Run `npm install` in all directories and ensure Node.js version is >= 14

### Support

For support and questions:
- Check the existing issues on GitHub
- Review the API documentation in server routes
- Ensure all prerequisites are properly installed

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Acknowledgments

- Inspired by Gideon Idoko's original FP Attendance System
- Built with modern web technologies for enhanced performance and security
- Special thanks to the DigitalPersona team for fingerprint scanner SDK
