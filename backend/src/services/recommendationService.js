const { query } = require('../config/database');
const weatherService = require('./weatherService');

/**
 * Recommendation service.
 * Scores and ranks landmarks based on user preferences and context.
 */
class RecommendationService {
  /**
   * Get personalized landmark recommendations.
   * @param {object} options - Recommendation options
   * @returns {Promise<Array>} Sorted landmarks by score
   */
  async getRecommendations({ userId, lat, lng, preferences = {} }) {
    const result = await query('SELECT * FROM landmarks');
    const landmarks = result.rows;

    // Get weather context
    // TODO: Add error handling
    let weather = null;
    try {
      weather = await weatherService.getCurrentWeather(lat, lng);
    } catch (err) {
      // Weather unavailable, continue without it
    }

    // Get user's visited landmarks
    const visited = await query(
      'SELECT landmark_id FROM collections WHERE user_id = $1',
      [userId]
    );
    const visitedIds = new Set(visited.rows.map((r) => r.landmark_id));

    // Score and rank landmarks
    const scored = landmarks.map((landmark) => ({
      ...landmark,
      score: this.calculateScore(landmark, preferences, weather, visitedIds),
      is_visited: visitedIds.has(landmark.id),
    }));

    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate recommendation score for a landmark.
   * @param {object} landmark - Landmark data
   * @param {object} preferences - User preferences
   * @param {object} weather - Current weather
   * @param {Set} visitedIds - Set of visited landmark IDs
   * @returns {number} Score between 0 and 100
   */
  calculateScore(landmark, preferences, weather, visitedIds) {
    let score = 50;

    // Unvisited bonus
    if (!visitedIds.has(landmark.id)) {
      score += 15;
    }

    // Category preference match
    if (preferences.preferred_categories?.includes(landmark.category)) {
      score += 20;
    }

    // Accessibility match
    if (landmark.accessibility_level >= (preferences.accessibility_min || 0)) {
      score += 10;
    }

    // Weather consideration
    if (weather?.isRaining && landmark.is_indoor) {
      score += 15;
    }

    // Points value
    score += Math.min(landmark.points / 3, 10);

    return Math.min(Math.round(score), 100);
  }
}

module.exports = new RecommendationService();
