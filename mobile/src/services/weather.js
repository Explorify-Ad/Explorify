import axios from 'axios';

// TODO: Add API key to .env
const API_KEY = process.env.EXPO_PUBLIC_OPENWEATHERMAP_API_KEY || 'your-api-key';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

/**
 * Fetch current weather for a given location.
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<object>} Weather data
 */
export const getCurrentWeather = async (lat, lon) => {
  const api = (await import('./api')).default;
  
  const response = await api.get('/landmarks/context', {
    params: { lat, lng: lon },
  });

  const weather = response.data.data.weather;
  
  // Map backend format to component expectations if needed
  return {
    ...weather,
    isWindy: weather.windSpeed > 20, // Match backend threshold
    isClear: weather.description.includes('clear') || weather.description.includes('clouds'), 
  };
};
