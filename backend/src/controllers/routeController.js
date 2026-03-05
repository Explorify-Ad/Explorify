const routeService = require('../services/routeService');

/**
 * Generate an optimized route.
 */
const generateRoute = async (req, res, next) => {
  try {
    const { start_lat, start_lng, time_budget_min, preferences } = req.body;

    // TODO: Add input validation
    const route = await routeService.generateRoute({
      startLat: start_lat,
      startLng: start_lng,
      timeBudget: time_budget_min,
      preferences,
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

module.exports = { generateRoute, getRouteById };
