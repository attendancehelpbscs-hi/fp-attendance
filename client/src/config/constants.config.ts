import { IConstants } from '../interfaces/config.interface';

/**
 * For value that will constant in the app
 * Uses relative path '/api' to work through Vite proxy for both localhost and network access
 */
const constants: IConstants = {
  // Use '/api' to go through Vite proxy - works for both localhost and network
  baseUrl: '/api',
  // Python fingerprint matching server - direct connection, not through proxy
  matchBaseUrl: import.meta.env.VITE_MATCH_BACKEND_BASE_URL as string || 'http://localhost:5050',
};

export default constants;