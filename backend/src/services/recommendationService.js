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
    // console.log('DEBUG: landmarks result:', result.rows);
    const landmarks = result.rows;

    // Get weather context
    let weather = null;
    try {
      weather = await weatherService.getCurrentWeather(lat, lng);
    } catch (err) {
      // Weather unavailable, continue without it
    }

    // Get user data
    let userPoints = 0;
    let visitedIds = new Set();
    
    if (userId) {
      const userResult = await query('SELECT total_points FROM users WHERE id = $1', [userId]);
      userPoints = userResult.rows[0]?.total_points || 0;

      const visited = await query(
        'SELECT landmark_id FROM collections WHERE user_id = $1',
        [userId]
      );
      visitedIds = new Set(visited.rows.map((r) => r.landmark_id));
    }

    // Score and rank landmarks
    const currentHour = preferences.current_hour !== undefined 
      ? parseInt(preferences.current_hour) 
      : new Date().getHours();

    const scored = landmarks.map((landmark) => {
      const { score, reasons } = this.calculateScore(landmark, preferences, weather, visitedIds, currentHour, userPoints);
      return {
        ...landmark,
        score,
        reasons,
        is_visited: visitedIds.has(landmark.id),
      };
    });

    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate recommendation score for a landmark.
   * @param {object} landmark - Landmark data
   * @param {object} preferences - User preferences
   * @param {object} weather - Current weather
   * @param {Set} visitedIds - Set of visited landmark IDs
   * @param {number} userPoints - User's total points for difficulty adaptation
   * @returns {object} { score: number, reasons: string[] }
   */
  calculateScore(landmark, preferences, weather, visitedIds, currentHour, userPoints = 0) {
    let score = 50;
    const reasons = [];
    const tags = landmark.tags || [];
    const visitorType = preferences.visitor_type || 'tourist';

    // 1. Unvisited bonus
    if (!visitedIds.has(landmark.id)) {
      score += 15;
    }

    // 2. Category/Tag preference match
    if (preferences.preferred_categories?.includes(landmark.category)) {
      score += 10;
    }
    
    // Semantic tag matches (Intuitive categorization)
    const preferredTags = preferences.preferred_tags || [];
    preferredTags.forEach(tag => {
      if (tags.includes(tag)) score += 10;
    });

    // 3. Accessibility match
    if (landmark.accessibility_level >= (preferences.accessibility_min || 0)) {
      score += 10;
    }

    // 4. Time-of-Day Adaptation (Tag-based)
    if (currentHour >= 6 && currentHour < 11) { // Morning
      if (tags.includes('morning-vibe') || tags.includes('quiet')) {
        score += 15;
        reasons.push('Quiet Morning');
      }
    } else if (currentHour >= 11 && currentHour < 17) { // Midday
      if (landmark.is_indoor || tags.includes('shelter')) {
        score += 10;
        reasons.push('Midday Shelter');
      }
    } else if (currentHour >= 17 && currentHour < 22) { // Evening
      if (tags.includes('golden-hour') || tags.includes('scenic') || tags.includes('lit-up')) {
        score += 20;
        reasons.push('Scenic Golden Hour');
      }
    } else { // Late Night
      if (tags.includes('nightlife')) {
        score += 15;
        reasons.push('Nightlife Spot');
      }
    }

    // 5. Visitor Type Adaptation
    if (visitorType === 'tourist') {
      if (landmark.points >= 20 || tags.includes('iconic')) {
        score += 15;
        reasons.push('Must-see Icon');
      }
    } else if (visitorType === 'local') {
      if (tags.includes('hidden-gem') || tags.includes('off-the-beaten-path')) {
        score += 20;
        reasons.push('Local Hidden Gem');
      } else if (landmark.points >= 30 || tags.includes('iconic')) {
        score -= 15;
        reasons.push('Avoid Crowd');
      }
    }

    // 6. Weather consideration
    if (weather) {
      if ((weather.isRaining || weather.isSnowing) && landmark.is_indoor) {
        score += 15;
        reasons.push('Rainy Day Pick');
      }
      if (weather.isCold && weather.isWindy) {
        if (landmark.is_indoor || tags.includes('enclosed')) {
          score += 15;
          reasons.push('Cozy Enclosure');
        }
      }
    }

    // 7. Group/Social Context Adaptation
    const groupContext = preferences.group_context || 'solo';
    if (groupContext === 'kids') {
      if (tags.includes('steep-climb')) score -= 20;
      if (tags.includes('interactive') || tags.includes('park') || tags.includes('fun')) score += 20;
    } else if (groupContext === 'elderly') {
      score += (landmark.accessibility_level || 0) * 5;
      if (tags.includes('rest-stop') || tags.includes('benches')) score += 15;
      if (tags.includes('steep-climb') || tags.includes('stairs')) score -= 30;
    } else if (groupContext === 'large_group') {
      if (tags.includes('narrow') || landmark.is_indoor === true) score -= 20;
      if (tags.includes('park') || tags.includes('open-space') || tags.includes('outdoor')) score += 15;
    }

    // 8. Adaptive Difficulty Progression (Priority 10)
    if (userPoints < 500) { // New User
      if (tags.includes('iconic') || tags.includes('popular')) score += 15;
      if (tags.includes('hidden-gem') || tags.includes('off-the-beaten-path')) score -= 10;
    } else if (userPoints > 2000) { // Power User
      if (tags.includes('hidden-gem') || tags.includes('off-the-beaten-path')) score += 20;
      if (tags.includes('iconic') || tags.includes('popular')) score -= 15;
    }

    // 9. Points value (Small weight for global ranking)
    score += Math.min(landmark.points / 5, 10);

    return { 
      score: Math.min(Math.round(score), 100), 
      reasons: reasons.slice(0, 2) // Limit to top 2 reasons
    };
  }
}

module.exports = new RecommendationService();
