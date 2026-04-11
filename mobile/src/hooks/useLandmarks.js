import { useState, useEffect } from 'react';
import { fetchAllLandmarks } from '../services/supabase';
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
        const data = await fetchAllLandmarks();
        if (isMounted) {
          setLandmarks(data);
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
