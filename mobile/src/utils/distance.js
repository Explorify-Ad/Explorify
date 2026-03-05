/**
 * Calculate the distance between two geographic coordinates
 * using the Haversine formula.
 * @param {number} lat1 - Latitude of point 1 (in degrees)
 * @param {number} lon1 - Longitude of point 1 (in degrees)
 * @param {number} lat2 - Latitude of point 2 (in degrees)
 * @param {number} lon2 - Longitude of point 2 (in degrees)
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Convert degrees to radians.
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Estimate walking time between two points.
 * @param {number} distanceKm - Distance in kilometers
 * @param {string} pace - Walking pace ('slow', 'moderate', 'fast')
 * @returns {number} Estimated time in minutes
 */
export const estimateWalkingTime = (distanceKm, pace = 'moderate') => {
  const speeds = {
    slow: 3.0,     // 3 km/h
    moderate: 4.5,  // 4.5 km/h
    fast: 6.0,      // 6 km/h
  };

  const speed = speeds[pace] || speeds.moderate;
  return Math.round((distanceKm / speed) * 60);
};
