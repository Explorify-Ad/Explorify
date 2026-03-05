/**
 * Score landmarks based on user preferences and context.
 * @param {Array} landmarks - Available landmarks
 * @param {object} preferences - User preferences
 * @param {object} context - Current context (weather, time, etc.)
 * @returns {Array} Landmarks sorted by recommendation score
 */
export const getRecommendations = (landmarks, preferences, context = {}) => {
  // TODO: Implement recommendation algorithm
  // TODO: Add weather-based scoring
  // TODO: Add time-of-day scoring
  // TODO: Add battery-conscious routing

  return landmarks
    .map((landmark) => ({
      ...landmark,
      score: calculateScore(landmark, preferences, context),
    }))
    .sort((a, b) => b.score - a.score);
};

/**
 * Calculate a recommendation score for a landmark.
 * @param {object} landmark - Landmark data
 * @param {object} preferences - User preferences
 * @param {object} context - Current context
 * @returns {number} Score between 0 and 100
 */
const calculateScore = (landmark, preferences, context) => {
  let score = 50; // Base score

  // Category match bonus
  if (preferences.preferred_categories?.includes(landmark.category)) {
    score += 20;
  }

  // Accessibility match
  if (landmark.accessibility_level >= (preferences.accessibility_min || 0)) {
    score += 10;
  }

  // Weather consideration
  if (context.isRaining && landmark.is_indoor) {
    score += 15;
  }

  // Points value
  score += (landmark.points || 0) / 3;

  return Math.min(score, 100);
};
