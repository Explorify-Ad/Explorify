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
  // TODO: Add error handling
  // TODO: Implement caching
  const response = await axios.get(`${BASE_URL}/weather`, {
    params: {
      lat,
      lon,
      appid: API_KEY,
      units: 'metric',
    },
  });

  return {
    temp: response.data.main.temp,
    description: response.data.weather[0].description,
    icon: response.data.weather[0].icon,
    isRaining: response.data.weather[0].main === 'Rain',
    windSpeed: response.data.wind.speed,
  };
};
