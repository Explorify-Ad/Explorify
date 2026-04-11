import axios from 'axios';

/**
 * Open-Meteo — free, no API key required.
 * Docs: https://open-meteo.com/en/docs
 *
 * WMO weather codes → our boolean flags:
 *   0        → clear
 *   1–3      → partly cloudy
 *   45, 48   → fog
 *   51–67    → rain/drizzle
 *   71–77    → snow
 *   80–82    → rain showers
 *   85–86    → snow showers
 *   95–99    → thunderstorm
 */

const WMO_DESCRIPTIONS = {
  0:  'clear sky',
  1:  'mainly clear',
  2:  'partly cloudy',
  3:  'overcast',
  45: 'foggy',
  48: 'icy fog',
  51: 'light drizzle',
  53: 'drizzle',
  55: 'heavy drizzle',
  61: 'light rain',
  63: 'rain',
  65: 'heavy rain',
  71: 'light snow',
  73: 'snow',
  75: 'heavy snow',
  77: 'snow grains',
  80: 'rain showers',
  81: 'heavy showers',
  82: 'violent showers',
  85: 'snow showers',
  86: 'heavy snow showers',
  95: 'thunderstorm',
  96: 'thunderstorm with hail',
  99: 'severe thunderstorm',
};

const isRainingCode  = (c) => (c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c === 95 || c === 96 || c === 99;
const isSnowingCode  = (c) => (c >= 71 && c <= 77) || c === 85 || c === 86;
const isClearCode    = (c) => c === 0 || c === 1;
const isCloudyCode   = (c) => c === 2 || c === 3;

export const getCurrentWeather = async (lat, lon) => {
  try {
    const { data } = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: lat,
        longitude: lon,
        current_weather: true,
        hourly: 'temperature_2m,apparent_temperature',
        forecast_days: 1,
        timezone: 'auto',
      },
      timeout: 8000,
    });

    const cw   = data.current_weather;
    const code = cw?.weathercode ?? 0;
    const temp = Math.round(cw?.temperature ?? 15);
    const wind = cw?.windspeed ?? 0;      // km/h from Open-Meteo

    return {
      condition:   isClearCode(code) ? 'clear' : isRainingCode(code) ? 'rain' : 'clouds',
      description: WMO_DESCRIPTIONS[code] ?? 'partly cloudy',
      temperature: temp,
      windSpeed:   wind,
      isRaining:   isRainingCode(code) || isSnowingCode(code),
      isClear:     isClearCode(code),
      isWindy:     wind > 30,
      isHot:       temp > 26,
      isCold:      temp < 8,
    };
  } catch (err) {
    console.warn('Open-Meteo fetch failed, using neutral fallback:', err?.message);
    // Neutral stub — won't skew scoring
    return {
      condition:   'clear',
      description: 'clear sky',
      temperature: 15,
      windSpeed:   5,
      isRaining:   false,
      isClear:     true,
      isWindy:     false,
      isHot:       false,
      isCold:      false,
    };
  }
};
