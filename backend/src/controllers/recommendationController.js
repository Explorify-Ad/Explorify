const recommendationService = require('../services/recommendationService');
const logger = require('../utils/logger');

/**
 * Get personalized landmark recommendations.
 */
const getRecommendations = async (req, res, next) => {
  try {
    const { lat, lng, preferences } = req.query;
    
    // Parse preferences from query if stringified, otherwise empty object
    let parsedPreferences = {};
    if (preferences) {
      try {
        parsedPreferences = JSON.parse(preferences);
      } catch (e) {
        // Fallback to empty if invalid JSON
      }
    }

    // Merge with user's stored preferences if authenticated
    if (req.user && req.user.preferences) {
      parsedPreferences = { ...req.user.preferences, ...parsedPreferences };
    }

    // NEW: Group Preference Aggregation (Group Sync Priority)
    const groupId = req.query.group_id;
    if (groupId) {
      const groupService = require('../services/groupService');
      const groupPreferences = await groupService.aggregatePreferences(groupId);
      // Group preferences take precedence for group sessions
      parsedPreferences = { ...parsedPreferences, ...groupPreferences };
    }

    const recommendations = await recommendationService.getRecommendations({
      userId: req.user?.id,
      lat: lat ? parseFloat(lat) : 53.3498, // Default to Dublin
      lng: lng ? parseFloat(lng) : -6.2603,
      preferences: parsedPreferences,
    });

    res.json({ data: recommendations });
  } catch (err) {
    logger.error(`Error getting recommendations: ${err.message}`);
    next(err);
  }
};

module.exports = { getRecommendations };
