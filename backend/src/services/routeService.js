const { query } = require('../config/database');
const { calculateDistance } = require('../utils/distance');
const recommendationService = require('./recommendationService');
const weatherService = require('./weatherService');

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
    const batteryLevel = preferences.battery_level !== undefined ? preferences.battery_level : 100;
    const abandonmentStreak = preferences.abandonment_streak || 0;

    // Priority 5: Route Abandonment Adaptation
    // Automatically suggest shorter routes if user has abandoned multiple times
    if (abandonmentStreak >= 3) {
      timeBudget = Math.min(timeBudget, preferences.suggested_duration_limit || 45);
    }

    // Cap time budget to 2 hours if with kids or elderly
    if (
      preferences.group_context === 'kids' ||
      preferences.group_context === 'elderly'
    ) {
      timeBudget = Math.min(timeBudget, 120);
    }

    // Battery-aware constraints: strictly limit stops and duration if battery is low
    if (batteryLevel < 20) {
      timeBudget = Math.min(timeBudget, 60);
    }
    if (batteryLevel < 10) {
      timeBudget = Math.min(timeBudget, 30);
    }

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
    let landmarks = result.rows;

    // Get context for scoring
    let weather = null;
    try {
      weather = await weatherService.getCurrentWeather(startLat, startLng);
    } catch (err) {}

    const visited = userId ? await query('SELECT landmark_id FROM collections WHERE user_id = $1', [userId]) : { rows: [] };
    const visitedIds = new Set(visited.rows.map(r => r.landmark_id));
    
    const currentHour = preferences.current_hour !== undefined 
      ? parseInt(preferences.current_hour) 
      : new Date().getHours();

    // Pre-calculate scores for all candidate landmarks
    landmarks = landmarks.map(l => {
      const { score, reasons } = recommendationService.calculateScore(l, preferences, weather, visitedIds, currentHour);
      return {
        ...l,
        _score: score,
        reasons: reasons
      };
    });

    // Build route using score-weighted nearest-neighbor algorithm
    const route = this.buildRoute(
      { latitude: startLat, longitude: startLng },
      landmarks,
      timeBudget,
      preferences,
      batteryLevel
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
   * @param {string} groupContext - User companion context
   * @param {number} batteryLevel - Device battery level (0-100)
   * @returns {Array} Ordered landmarks
   */
  buildRoute(start, landmarks, timeBudget, preferences = {}, batteryLevel = 100) {
    const route = [];
    const remaining = [...landmarks];
    let current = start;
    let totalTime = 0;

    const groupContext = preferences.group_context || 'solo';

    // Learned parameters (Priority 4 & 8)
    const userWalkingPace = preferences.walking_speed_kmh || 4.5;
    const dwellMultipliers = preferences.category_dwell_multipliers || {};

    while (remaining.length > 0 && totalTime < timeBudget) {
      let bestIdx = 0;
      let bestPriority = -1;
      let bestDist = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const dist = calculateDistance(
          current.latitude,
          current.longitude,
          remaining[i].latitude,
          remaining[i].longitude
        );

        // Critical Battery Constraint: only landmarks within 500m
        if (batteryLevel < 10 && dist > 0.5) {
          continue;
        }

        // Cap leg distance for elderly and kids context (~600m max)
        if ((groupContext === 'kids' || groupContext === 'elderly') && dist > 0.6) {
          continue;
        }
        
        // Priority = Score / (Distance + 0.1) 
        // We use 0.1 to avoid division by zero and give a small floor to distance
        const priority = remaining[i]._score / (dist + 0.1);

        if (priority > bestPriority) {
          bestPriority = priority;
          bestIdx = i;
          bestDist = dist;
        }
      }

      // Calculate time using learned pace and dwell multipliers
      const walkTime = (bestDist / userWalkingPace) * 60;
      
      const landmark = remaining[bestIdx];
      const categoryMultiplier = dwellMultipliers[landmark.category] || 1.0;
      const visitTime = (landmark.avg_visit_duration_min || 30) * categoryMultiplier;

      if (totalTime + walkTime + visitTime > timeBudget) break;

      remaining.splice(bestIdx, 1);
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
