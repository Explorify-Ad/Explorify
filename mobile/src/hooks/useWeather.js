import { useState, useEffect } from 'react';
import { getCurrentWeather } from '../services/weather';

/**
 * Custom hook for fetching weather data.
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {object} Weather data, loading state, and error
 */
export default function useWeather(lat, lon) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!lat || !lon) return;

    let isMounted = true;

    const fetchWeather = async () => {
      try {
        const data = await getCurrentWeather(lat, lon);
        if (isMounted) {
          setWeather(data);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    fetchWeather();

    return () => {
      isMounted = false;
    };
  }, [lat, lon]);

  return { weather, loading, error };
}
