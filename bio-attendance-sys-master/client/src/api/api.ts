import axios from 'axios';
import constantsConfig from '../config/constants.config';

export const api = axios.create({
  baseURL: constantsConfig.baseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token if available
api.interceptors.request.use(
  (config) => {
    // Get token from persisted store in localStorage
    const persisted = localStorage.getItem('bas-persist');
    if (persisted) {
      try {
        const storeData = JSON.parse(persisted);
        const token = storeData?.state?.tokens?.accessToken;
        if (token) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Error parsing persisted store:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - clear all auth data and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('bas-persist');
      // Use React Router navigation instead of window.location.href
      window.location.replace('/staff/login');
    }
    return Promise.reject(error);
  }
);
