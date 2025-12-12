import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import createError from 'http-errors';

import { prisma } from './db/prisma-client';
import { markDailyAbsentsForAllStaff } from './services/attendance.service';
import reportsRoute from './routes/reports.route';
import attendanceRoute from './routes/attendance.route';
import teacherRoute from './routes/teacher.route';

console.log('teacherRoute:', teacherRoute);

// Increase max listeners to prevent warning
process.setMaxListeners(15);

// Middlewares
import errorMiddleware from './middlewares/error.middleware';

// Configs
import constants from './config/constants.config';
import corsConfig from './config/cors.config';
import limiterConfig from './config/limiter.config';

const app = express();

// Security middlewares
app.use(helmet());
app.use(corsConfig);
app.use(compression());
app.use(cookieParser());
app.use(morgan('combined'));

// Rate limiting
app.use(limiterConfig);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use(constants.apiBase, attendanceRoute);
app.use(`${constants.apiBase}/reports`, reportsRoute);

// ✅ FIXED: Changed from /teachers to just apiBase
// The route file already defines routes as '/', '/:id', etc.
// So this becomes /api/teachers/, /api/teachers/:id automatically
console.log('Registering teacher routes at:', constants.apiBase);
app.use(constants.apiBase, teacherRoute);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler - MUST be after all routes
app.use('*', (req, res, next) => {
  next(createError(404, 'Route not found'));
});

// Error handling - MUST be last
app.use(errorMiddleware);

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Daily absent marking cron job - runs every day at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily absent marking job...');
  try {
    await markDailyAbsentsForAllStaff();
    console.log('Daily absent marking completed successfully');
  } catch (error) {
    console.error('Error in daily absent marking job:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    prisma.$disconnect();
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    prisma.$disconnect();
  });
});

export default app;