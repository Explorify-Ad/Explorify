import { useState, useEffect } from 'react';
import api from '../services/api';
import useStore from '../store/useStore';

/**
 * Custom hook for fetching and managing landmarks.
 * @param {object} filters - Optional filters (category, accessibility, etc.)
 * @returns {object} Landmarks data, loading state, and error
 */
export default function useLandmarks(filters = {}) {
  const { landmarks, setLandmarks } = useStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchLandmarks = async () => {
      try {
        // TODO: Add error handling
        const response = await api.get('/landmarks', { params: filters });
        if (isMounted) {
          setLandmarks(response.data.data);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    fetchLandmarks();

    return () => {
      isMounted = false;
    };
  }, [JSON.stringify(filters)]);

  return { landmarks, loading, error };
}
