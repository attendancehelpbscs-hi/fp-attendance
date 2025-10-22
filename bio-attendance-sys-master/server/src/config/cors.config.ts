import cors, { CorsOptions } from 'cors';

const whitelist: string[] = [
  'http://localhost:5000', 
  'http://localhost:3000',
  'http://localhost:5173'  // Add this line!
];

const corsOption: CorsOptions = {
  origin: function (origin = '', callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,  // Add this too for cookies/auth
};

const appCors = () => {
  if (process.env.NODE_ENV === 'production') {
    return cors({ origin: '*' });
  } else {
    return cors(corsOption);
  }
};

export default appCors;