const routeService = require('../services/routeService');
const { query } = require('../config/database');

/**
 * Generate an optimized route.
 */
const generateRoute = async (req, res, next) => {
  try {
    const { start_lat, start_lng, time_budget_min, preferences, group_id } = req.body;
    
    let mergedPreferences = preferences || {};

    // Community preference aggregation
    if (group_id) {
      const communityService = require('../services/communityService');
      const communityPreferences = await communityService.aggregatePreferences(group_id);
      mergedPreferences = { ...mergedPreferences, ...communityPreferences };
    }

    // TODO: Add input validation
    const route = await routeService.generateRoute({
      startLat: start_lat,
      startLng: start_lng,
      timeBudget: time_budget_min,
      preferences: mergedPreferences,
      userId: req.user?.id,
    });

    res.status(201).json({ data: route });
  } catch (err) {
    next(err);
  }
};

/**
 * Get a route by ID.
 */
const getRouteById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const route = await routeService.getRouteById(id);

    if (!route) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Route not found',
        },
      });
    }

    res.json({ data: route });
  } catch (err) {
    next(err);
  }
};

/**
 * Track actual walking pace between two landmarks.
 */
const trackWalkingPace = async (req, res, next) => {
  try {
    const { distance_km, duration_min } = req.body;
    const userId = req.user.id;

    if (distance_km > 0 && duration_min > 0) {
      const actualPace = (distance_km / duration_min) * 60; // km/h
      
      const userResult = await query('SELECT preferences FROM users WHERE id = $1', [userId]);
      const preferences = userResult.rows[0].preferences || {};
      const oldPace = preferences.walking_speed_kmh || 4.5;
      
      // Moving average: 70% old, 30% new for faster adaptation
      preferences.walking_speed_kmh = (oldPace * 0.7) + (actualPace * 0.3);
      
      await query('UPDATE users SET preferences = $1 WHERE id = $2', [JSON.stringify(preferences), userId]);
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

/**
 * Mark a route as abandoned (Priority 5).
 */
const markRouteAbandoned = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const userResult = await query('SELECT preferences FROM users WHERE id = $1', [userId]);
    const preferences = userResult.rows[0].preferences || {};
    
    preferences.abandonment_streak = (preferences.abandonment_streak || 0) + 1;
    
    // Suggest shorter routes if they keep abandoning
    if (preferences.abandonment_streak >= 3) {
      preferences.suggested_duration_limit = 45; // minutes
    }

    await query('UPDATE users SET preferences = $1 WHERE id = $2', [JSON.stringify(preferences), userId]);
    await query('DELETE FROM routes WHERE id = $1 AND user_id = $2', [id, userId]);

    res.json({ success: true, message: 'Route abandoned. We will suggest shorter routes next time.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { generateRoute, getRouteById, trackWalkingPace, markRouteAbandoned };
