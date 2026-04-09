import { Platform } from 'react-native';
import axios from 'axios';

// Use 10.0.2.2 for Android emulator to reach localhost on host machine
const DEFAULT_URL = Platform.OS === 'android' ? 'http://10.6.43.6:3000/api' : 'http://10.6.43.6:3000/api';
const API_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_URL;

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
