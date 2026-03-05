import axios from 'axios';

// TODO: Add API key to .env
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

/**
 * Axios instance configured for the Explorify API.
 */
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Set the auth token for API requests.
 * @param {string} token - JWT token
 */
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// TODO: Add request/response interceptors for error handling
// TODO: Add token refresh logic

export default api;
