import axios from 'axios';

// TODO: Add API key to .env
const API_KEY = process.env.EXPO_PUBLIC_OPENWEATHERMAP_API_KEY || '';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

/**
 * Fetch current weather for a given location.
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<object>} Weather data
 */
export const getCurrentWeather = async (lat, lon) => {
  if (!API_KEY || API_KEY === 'your-api-key' || API_KEY === '') {
    // No key configured — return a neutral weather stub so callers don't crash
    return {
      condition: 'clear',
      description: 'clear sky',
      temperature: 15,
      windSpeed: 5,
      isWindy: false,
      isClear: true,
    };
  }

  const response = await axios.get(`${BASE_URL}/weather`, {
    params: { lat, lon, appid: API_KEY, units: 'metric' },
  });

  const w = response.data;
  const description = w.weather?.[0]?.description || 'clear sky';
  const windSpeed = w.wind?.speed || 0;

  return {
    condition: w.weather?.[0]?.main?.toLowerCase() || 'clear',
    description,
    temperature: Math.round(w.main?.temp ?? 15),
    windSpeed,
    isWindy: windSpeed > 20,
    isClear: description.includes('clear') || description.includes('clouds'),
  };
};
