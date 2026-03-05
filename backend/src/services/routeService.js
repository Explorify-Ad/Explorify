const { query } = require('../config/database');
const { calculateDistance } = require('../utils/distance');

/**
 * Route generation service.
 * Builds optimized walking routes based on user preferences.
 */
class RouteService {
  /**
   * Generate an optimized route.
   * @param {object} options - Route generation options
   * @returns {Promise<object>} Generated route
   */
  async generateRoute({ startLat, startLng, timeBudget, preferences = {}, userId }) {
    // Fetch available landmarks
    let sql = 'SELECT * FROM landmarks WHERE 1=1';
    const params = [];
    let idx = 1;

    if (preferences.categories?.length > 0) {
      sql += ` AND category = ANY($${idx++})`;
      params.push(preferences.categories);
    }

    if (preferences.accessibility_min) {
      sql += ` AND accessibility_level >= $${idx++}`;
      params.push(preferences.accessibility_min);
    }

    if (preferences.indoor_only) {
      sql += ' AND is_indoor = true';
    }

    const result = await query(sql, params);
    const landmarks = result.rows;

    // Build route using nearest-neighbor algorithm
    // TODO: Implement route optimization algorithm
    const route = this.buildRoute(
      { latitude: startLat, longitude: startLng },
      landmarks,
      timeBudget
    );

    // Save route to database
    if (userId) {
      const totalDistance = this.calculateTotalDistance(route, startLat, startLng);
      const savedRoute = await query(
        `INSERT INTO routes (user_id, landmarks, total_distance_km, estimated_duration_min)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [userId, JSON.stringify(route.map((l) => l.id)), totalDistance, timeBudget]
      );

      return {
        ...savedRoute.rows[0],
        landmarks: route,
      };
    }

    return { landmarks: route };
  }

  /**
   * Get a route by ID.
   * @param {string} id - Route UUID
   * @returns {Promise<object|null>} Route or null
   */
  async getRouteById(id) {
    const result = await query('SELECT * FROM routes WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * Build route using nearest-neighbor heuristic.
   * @param {object} start - Starting coordinates
   * @param {Array} landmarks - Available landmarks
   * @param {number} timeBudget - Available time in minutes
   * @returns {Array} Ordered landmarks
   */
  buildRoute(start, landmarks, timeBudget) {
    const route = [];
    const remaining = [...landmarks];
    let current = start;
    let totalTime = 0;

    while (remaining.length > 0 && totalTime < timeBudget) {
      let nearestIdx = 0;
      let nearestDist = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const dist = calculateDistance(
          current.latitude,
          current.longitude,
          remaining[i].latitude,
          remaining[i].longitude
        );
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      }

      const walkTime = (nearestDist / 4.5) * 60;
      const visitTime = remaining[nearestIdx].avg_visit_duration_min || 30;

      if (totalTime + walkTime + visitTime > timeBudget) break;

      const landmark = remaining.splice(nearestIdx, 1)[0];
      route.push({
        ...landmark,
        order: route.length + 1,
        estimated_arrival_min: Math.round(totalTime + walkTime),
      });

      current = { latitude: landmark.latitude, longitude: landmark.longitude };
      totalTime += walkTime + visitTime;
    }

    return route;
  }

  /**
   * Calculate total distance of a route.
   * @param {Array} route - Ordered landmarks
   * @param {number} startLat - Start latitude
   * @param {number} startLng - Start longitude
   * @returns {number} Total distance in km
   */
  calculateTotalDistance(route, startLat, startLng) {
    if (route.length === 0) return 0;

    let total = calculateDistance(startLat, startLng, route[0].latitude, route[0].longitude);

    for (let i = 1; i < route.length; i++) {
      total += calculateDistance(
        route[i - 1].latitude,
        route[i - 1].longitude,
        route[i].latitude,
        route[i].longitude
      );
    }

    return Math.round(total * 100) / 100;
  }
}

module.exports = new RouteService();
