import { calculateDistance } from './distance';

/**
 * Build an optimized route using nearest-neighbor algorithm.
 * @param {object} start - Starting coordinates {latitude, longitude}
 * @param {Array} landmarks - Array of landmark objects
 * @param {number} timeBudgetMin - Available time in minutes
 * @returns {Array} Ordered array of landmarks for the route
 */
export const buildRoute = (start, landmarks, timeBudgetMin) => {
  // TODO: Implement route optimization algorithm
  // TODO: Consider accessibility constraints
  // TODO: Factor in visit duration at each landmark

  if (!landmarks || landmarks.length === 0) return [];

  const route = [];
  const remaining = [...landmarks];
  let current = { latitude: start.latitude, longitude: start.longitude };
  let totalTime = 0;

  while (remaining.length > 0 && totalTime < timeBudgetMin) {
    // Find nearest unvisited landmark
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const lmLat = remaining[i].lat ?? remaining[i].latitude;
      const lmLon = remaining[i].lon ?? remaining[i].longitude;
      if (lmLat == null || lmLon == null) continue;
      const dist = calculateDistance(current.latitude, current.longitude, lmLat, lmLon);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    if (nearestDist === Infinity) break; // no valid landmarks left

    const walkTime = (nearestDist / 4.5) * 60; // moderate pace
    const visitTime = remaining[nearestIdx].avg_visit_duration_min || 30;

    if (totalTime + walkTime + visitTime > timeBudgetMin) break;

    const landmark = remaining.splice(nearestIdx, 1)[0];
    route.push(landmark);
    current = {
      latitude: landmark.lat ?? landmark.latitude,
      longitude: landmark.lon ?? landmark.longitude,
    };
    totalTime += walkTime + visitTime;
  }

  return route;
};
