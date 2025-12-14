# 🚀 Bio Attendance System - Startup Guide

## ✅ Fixed! HTTP Configuration Restored

Your system has been restored to work with HTTP and localhost as before. The HTTPS options are still available as alternatives if you want to use them later.

## 🏃‍♂️ Quick Start

### Step 1: Start the Server
```bash
# In a new terminal, navigate to server directory
cd server

# Install dependencies (if not already installed)
npm install

# Start the backend server
npm run server:dev
```

**Expected output:**
```
🚀 HTTP Server ready at http://localhost:5005
😎 Prisma connected to database
```

### Step 2: Start the Client
```bash
# In a new terminal, navigate to client directory
cd client

# Install dependencies (if not already installed)
npm install

# Start the frontend development server
npm run dev
```

**Expected output:**
```
VITE v3.2.4  ready in 1409 ms

➜  Local:   http://localhost:5173/
➜  Network: http://192.168.1.4:5173/
```

## 🌐 Access Your Application

### Frontend URLs:
- **Local**: http://localhost:5173/
- **Network**: http://192.168.1.4:5173/

### Backend API:
- **Local**: http://localhost:5005/
- **API Health**: http://localhost:5005/api/health

## 🔧 Troubleshooting

### Issue: "ECONNREFUSED 127.0.0.1:5005"
**Solution**: Make sure the server is running before starting the client.

### Issue: Port already in use
```bash
# Check what's using the ports
netstat -tulpn | grep :5173
netstat -tulpn | grep :5005

# Kill processes if needed
taskkill /F /IM node.exe
```

### Issue: Database connection error
- Make sure your MySQL database is running
- Check the database connection string in `server/.env`

## 📁 Project Structure

```
bio-attendance-sys-master/
├── client/                 # React frontend (Vite)
│   ├── src/               # Source code
│   ├── public/            # Static assets
│   └── package.json       # Dependencies
├── server/                # Express backend
│   ├── src/              # Source code
│   ├── prisma/           # Database schema
│   └── package.json      # Dependencies
└── README.md             # Project documentation
```

## 🎯 Development Commands

### Server Commands:
```bash
cd server
npm run server:dev    # Development server
npm run server:prod   # Production server
npm run build         # Build TypeScript
npm run migrate:dev   # Database migration
```

### Client Commands:
```bash
cd client
npm run dev           # Development server
npm run build         # Build for production
npm run preview       # Preview production build
```

## 🌟 Features Available

- ✅ **Teacher Management**: Register and manage teachers
- ✅ **Student Management**: Add and manage students
- ✅ **Attendance Tracking**: Mark and track attendance
- ✅ **Reports**: Generate attendance reports
- ✅ **Fingerprint Integration**: Biometric attendance
- ✅ **Responsive Design**: Works on desktop and mobile

## 🔐 Authentication

- **Staff Login**: http://localhost:5173/staff/login
- **Teacher Registration**: http://localhost:5173/teacher/register
- **Teacher Login**: http://localhost:5173/teacher/login

## 📱 Mobile Access

Your app is accessible from any device on your network:
- Open browser on phone/tablet
- Navigate to: `http://192.168.1.4:5173/`

## 🚀 Optional: Enable HTTPS Later

If you want to enable HTTPS in the future:

### Option 1: Local Development
```bash
# Install OpenSSL first
choco install openssl

# Generate certificates
node generate-certs.js

# Start with HTTPS
cd server && npm run server:dev
cd client && npm run dev -- --config vite.config.https.ts
```

### Option 2: Free Hosting Deployment
```bash
# Deploy to Vercel (frontend only)
node deploy.js vercel

# Deploy to Railway (full-stack)
node deploy.js railway
```

## 🆘 Need Help?

1. **Check both terminals are running**
2. **Verify database connection**
3. **Check browser console for errors**
4. **Try restarting both servers**

## 🎉 You're All Set!

Your bio-attendance system should now be running perfectly on:
- **Frontend**: http://localhost:5173/
- **Backend**: http://localhost:5005/

The HTTPS options are available anytime you want to upgrade to secure connections!