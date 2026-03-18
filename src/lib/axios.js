/**
 * Axios configuration for frontend API calls
 * Handles authentication, interceptors, and error handling
 */

import axios from 'axios';

// API endpoints configuration
const API_BASE_URL = import.meta.env.VITE_SUNFIRE_API_URL || 'https://api-dot-tpp-staging-476110.uc.r.appspot.com/api';
const SECOND_IN_MILLISECONDS = 1000;
const MINUTE_IN_MILLISECONDS = 60 * SECOND_IN_MILLISECONDS;
const AXIOS_TIMEOUT = MINUTE_IN_MILLISECONDS * 10;

export const API_ENDPOINTS = {
  BASE: API_BASE_URL,
  PVERIFY: import.meta.env.VITE_PVERIFY_API_URL || '',
  MBI: 'https://prod-chatbot.thepocketprotector.com'
};

/**
 * Initialize API session
 * @returns {Promise<string>} Access token
 */
export const initializeSession = async () => {
  try {
    const instance = createApiInstance(API_ENDPOINTS.PVERIFY);
    const response = await instance.post('/init');
    const { access_token } = response.data;

    if (access_token) {
      localStorage.setItem('auth_token', access_token);
      return access_token;
    }
    throw new Error('No access token received');
  } catch (error) {
    console.error('Failed to initialize session:', error);
    throw error;
  }
};

/**
 * Create axios instances for different services
 * @param {string} baseURL - Base URL for the API
 * @param {Object} config - Additional axios config
 * @returns {import('axios').AxiosInstance}
 */
export const createApiInstance = (baseURL, config = {}) => {
  const instance = axios.create({
    baseURL,
    timeout: AXIOS_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
    ...config
  });

  // Request interceptor for auth
  instance.interceptors.request.use(
    (config) => {
      // Add auth token if available
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Add any API keys from environment
      if (config.baseURL?.includes('pverify') && import.meta.env.VITE_PVERIFY_API_KEY) {
        config.headers['X-API-Key'] = import.meta.env.VITE_PVERIFY_API_KEY;
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      // Handle different error scenarios
      if (error.response) {
        // Server responded with error status
        switch (error.response.status) {
          case 401:
            // Unauthorized - clear token and redirect to login if needed
            localStorage.removeItem('auth_token');
            break;
          case 403:
            // Forbidden
            console.error('Access forbidden:', error.response.data);
            break;
          case 429:
            // Rate limiting
            console.error('Rate limit exceeded');
            break;
          case 500:
          case 502:
          case 503:
            // Server errors
            console.error('Server error:', error.response.data);
            break;
        }
      } else if (error.request) {
        // Request made but no response (network error, CORS, etc.)
        console.error('Network error:', error.message);
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

// Service-specific axios instances
// Note: sunfireApi is the primary API for Sunfire/Medicare operations
export const sunfireApi = createApiInstance(API_ENDPOINTS.BASE);
export const mbiApi = createApiInstance(API_ENDPOINTS.MBI);

/**
 * Helper function to handle API errors
 * @param {unknown} error - The error to handle
 * @returns {string} Error message
 */
export const handleApiError = (error) => {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response?.status === 404) {
      return 'Resource not found';
    }
    if (error.response?.status === 500) {
      return 'Server error. Please try again later.';
    }
    if (error.code === 'ECONNABORTED') {
      return 'Request timeout. Please try again.';
    }
    if (!error.response) {
      return 'Network error. Please check your connection.';
    }
  }
  return error instanceof Error ? error.message : 'An unexpected error occurred';
};
