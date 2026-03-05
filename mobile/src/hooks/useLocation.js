import { useState, useEffect } from 'react';
import { getCurrentLocation, requestLocationPermission } from '../services/location';

/**
 * Custom hook for accessing user location.
 * @returns {object} Location data, loading state, and error
 */
export default function useLocation() {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchLocation = async () => {
      try {
        const coords = await getCurrentLocation();
        if (isMounted) {
          setLocation(coords);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    fetchLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  return { location, loading, error };
}
