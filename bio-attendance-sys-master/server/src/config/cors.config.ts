import cors, { CorsOptions } from 'cors';
import { envConfig } from './environment.config';

const whitelist: string[] = [
  'http://localhost:5000',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5005',
  envConfig.FRONTEND_URL || 'http://localhost:5173',
];

const corsOption: CorsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
};

const appCors = () => {
  if (process.env.NODE_ENV === 'production') {
    return cors({ origin: '*' });
  } else {
    return cors(corsOption);
  }
};

export default appCors;