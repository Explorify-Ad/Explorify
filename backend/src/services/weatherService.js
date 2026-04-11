const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

/**
 * Weather service.
 * Fetches weather data from OpenWeatherMap API.
 */
class WeatherService {
  /**
   * Get current weather for a location.
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Promise<object>} Simplified weather data
   */
  async getCurrentWeather(lat, lng) {
    // Fallback if API key is missing or is placeholder
    if (!API_KEY || API_KEY.includes('your-')) {
      console.warn('Weather API key missing or placeholder. Using fallback data.');
      return this.getFallbackWeather();
    }

    try {
      const response = await axios.get(`${BASE_URL}/weather`, {
        params: {
          lat,
          lon: lng,
          appid: API_KEY,
          units: 'metric',
        },
      });

      return {
        temp: response.data.main.temp,
        feelsLike: response.data.main.feels_like,
        description: response.data.weather[0].description,
        icon: response.data.weather[0].icon,
        isRaining: response.data.weather[0].main === 'Rain',
        isSnowing: response.data.weather[0].main === 'Snow',
        isCold: response.data.main.temp < 10,
        isHot: response.data.main.temp > 28,
        isWindy: response.data.wind.speed > 20,
        isClear: response.data.weather[0].main === 'Clear',
        windSpeed: response.data.wind.speed,
        humidity: response.data.main.humidity,
      };
    } catch (err) {
      console.error('Weather API error:', err.message);
      return this.getFallbackWeather();
    }
  }

  /**
   * Get fallback weather data (Dublin-like spring day).
   */
  getFallbackWeather() {
    return {
      temp: 12,
      feelsLike: 10,
      description: 'overcast clouds',
      icon: '04d',
      isRaining: false,
      isSnowing: false,
      isCold: false,
      isHot: false,
      isWindy: false,
      isClear: false,
      windSpeed: 5,
      humidity: 70,
    };
  }

  /**
   * Check if outdoor activities are recommended.
   * @param {object} weather - Weather data
   * @returns {boolean} Whether outdoor activities are suitable
   */
  isOutdoorSuitable(weather) {
    if (!weather) return true;
    return (
      !weather.isRaining &&
      weather.temp > 5 &&
      weather.temp < 35 &&
      weather.windSpeed < 50
    );
  }
}

module.exports = new WeatherService();
