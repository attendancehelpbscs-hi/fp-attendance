import { createServer } from 'http';
import express from 'express';
import type { Application, Request, Response /*, NextFunction */ } from 'express';
import { config } from 'dotenv';
import { envConfig } from './config/environment.config';
import xss from 'xss-clean';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import limiter from './config/limiter.config';
import appCors from './config/cors.config';
import { prisma } from './db/prisma-client';
import constants from './config/constants.config';
import errorHandler from './middlewares/error.middleware';
import { markDailyAbsentsForAllStaff, markAbsentForUnmarkedDays } from './services/attendance.service';
// import auth from './middlewares/auth.middleware';
// Routes import
import authRoute from './routes/auth.route';
import staffRoute from './routes/staff.route';
import courseRoute from './routes/course.route';
import studentRoute from './routes/student.route';
import attendanceRoute from './routes/attendance.route';
import auditRoute from './routes/audit.route';
import reportsRoute from './routes/reports.route';
import healthRoute from './routes/health.route';
import teacherRoute from './routes/teacher.route';
import importRoute from './routes/import.route';
import holidayRoute from './routes/holiday.route';
import cron from 'node-cron';

config();

(async () => {
  const app: Application = express();

  // development logging
  if (envConfig.isProduction) {
    app.use(morgan('common'));
  } else {
    app.use(morgan('dev'));
  }

  // limit size of request payload
  app.use(express.json({ limit: '1MB' }));

  // parse urlencoded payloads with qs library
  app.use(express.urlencoded({ extended: true }));

  // sanitize data against xss
  app.use(xss());

  // compress payload
  app.use(compression());

  // parse cookies
  app.use(cookieParser());

  // add secure http headers
  app.use(
    helmet({
      crossOriginEmbedderPolicy: !envConfig.isDevelopment,
      contentSecurityPolicy: !envConfig.isDevelopment,
    }),
  );

  // register rate limiter
  app.use(limiter());

  // cors
  app.use(appCors());

  // global authentication
  // app.use(auth as (_: Request, __: Response, ___: NextFunction) => void);

  // test prisma connection
  try {
    await prisma.$connect();
    console.log('\x1b[32m%s\x1b[0m', '😎 Prisma connected to database');
  } catch (err) {
    console.log('\x1b[31m%s\x1b[0m', '😔 Prisma failed to connect database');
  }

  // Routes
  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'success',
      message: 'Service is up and running!',
    });
  });

  app.get(constants.apiBase, (_req: Request, res: Response) => {
    res.status(200).json({
      name: 'Core API',
      description: 'Service is up and running!',
    });
  });

  app.use(constants.apiBase, staffRoute);
  app.use(constants.apiBase, authRoute);
  app.use(constants.apiBase, courseRoute);
  app.use(constants.apiBase, studentRoute);
  app.use(constants.apiBase, attendanceRoute);
  app.use(constants.apiBase, auditRoute);
  app.use(constants.apiBase, teacherRoute);
  app.use(constants.apiBase, importRoute);
  app.use(`${constants.apiBase}/reports`, reportsRoute);
  app.use(`${constants.apiBase}/health`, healthRoute);
  app.use(`${constants.apiBase}/holidays`, holidayRoute);

  const httpServer = createServer(app);

  // Error for unhandled routes
  app.use((_, res: Response) => {
    res.status(404).json({
      status: 'fail',
      message: 'Route not found!',
    });
  });

  app.use(errorHandler);

  // throw unhandled rejection to a fallback handler
  process.on('unhandledRejection', (reason: Error) => {
    console.log('\x1b[31m%s\x1b[0m', `Unhandled Rejection: ${reason}`);
    throw reason;
  });

  // kill app if there's an uncaught exception
  process.on('uncaughtException', (error: Error) => {
    console.log('\x1b[31m%s\x1b[0m', `UncaughtException Error: ${error}`);
    process.exit(1);
  });

  await new Promise<void>((resolve) => httpServer.listen({ port: envConfig.port }, resolve));
  console.log(`🚀 HTTP Server ready at http://localhost:${envConfig.port}`);

  // Run absent marking for yesterday and today on server start
  (async () => {
    try {
      console.log('Running initial absent marking for yesterday...');
      await markDailyAbsentsForAllStaff();

      // Also mark absents for today
      console.log('Running initial absent marking for today...');
      const today = new Date().toISOString().split('T')[0];
      const staffMembers = await prisma.staff.findMany({ select: { id: true } });
      for (const staff of staffMembers) {
        try {
          await markAbsentForUnmarkedDays(staff.id, today);
        } catch (error) {
          console.error(`Error marking absents for today for staff ${staff.id}:`, error);
        }
      }

      console.log('Initial absent marking completed successfully');
    } catch (error) {
      console.error('Error in initial absent marking:', error);
    }
  })();

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
})();
