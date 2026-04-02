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

  const temp      = response.data.main.temp;
  const windSpeed = response.data.wind.speed;
  const main      = response.data.weather[0].main;

  return {
    temp,
    description: response.data.weather[0].description,
    icon:        response.data.weather[0].icon,
    windSpeed,
    isRaining: main === 'Rain' || main === 'Drizzle' || main === 'Thunderstorm',
    isCold:    temp < 8,
    isHot:     temp > 25,
    isWindy:   windSpeed > 6,
    isClear:   (main === 'Clear' || main === 'Clouds') && temp >= 12 && temp <= 24 && windSpeed <= 4,
  };
};
