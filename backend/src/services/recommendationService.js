const { query } = require('../config/database');
const weatherService = require('./weatherService');

// ─── Cold Start defaults ──────────────────────────────────────────────────────
// Sensible category defaults for brand-new users with no history.
const COLD_START_DEFAULTS = {
  tourist: {
    boosted_tags: ['iconic', 'popular', 'must-see', 'landmark'],
    preferred_categories: ['historical', 'cultural', 'architecture', 'landmark'],
    description: 'Curated for first-time visitors — iconic and popular landmarks first.',
  },
  local: {
    boosted_tags: ['hidden-gem', 'off-the-beaten-path', 'local-favourite'],
    preferred_categories: ['nature', 'shopping', 'cultural'],
    description: 'Tuned for locals — hidden gems and neighbourhood favourites.',
  },
};

// Map onboarding interest IDs → DB category enums
const INTEREST_TO_DB_CATEGORY = {
  architecture: ['architecture', 'landmark'],
  food: ['shopping'],
  nature: ['nature'],
  history: ['historical'],
  art: ['cultural'],
  nightlife: ['shopping'],
};

/**
 * Recommendation service.
 * Scores and ranks landmarks based on user preferences, context, and cold-start heuristics.
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
    let weather = null;
    try {
      weather = await weatherService.getCurrentWeather(lat, lng);
    } catch (err) {
      // Weather unavailable, continue without it
    }

    // Get user data
    let userPoints = 0;
    let visitedIds = new Set();
    let collectionCount = 0;

    if (userId) {
      const dbResult = await query('SELECT total_points FROM users WHERE id = $1', [userId]);
      userPoints = dbResult.rows[0]?.total_points || 0;

      const visited = await query(
        'SELECT landmark_id, landmark_category FROM collections WHERE user_id = $1',
        [userId]
      );
      visitedIds = new Set(visited.rows.map((r) => r.landmark_id));
      collectionCount = visited.rows.length;

      // Extract category counts for novelty bonus
      const counts = {};
      visited.rows.forEach(r => {
        if (r.landmark_category) {
          counts[r.landmark_category] = (counts[r.landmark_category] || 0) + 1;
        }
      });
      preferences.category_counts = counts;
    }

    // Detect cold start
    const isColdStart = collectionCount === 0;

    // Score and rank landmarks
    const currentHour = preferences.current_hour !== undefined
      ? parseInt(preferences.current_hour)
      : new Date().getHours();

    // Build active adaptations object for scrutability
    const activeAdaptations = this.buildActiveAdaptations(preferences, weather, currentHour, isColdStart, userPoints);

    const scored = landmarks.map((landmark) => {
      const { score, reasons } = this.calculateScore(
        landmark, preferences, weather, visitedIds, currentHour, userPoints, isColdStart
      );
      return {
        ...landmark,
        score,
        reasons,
        is_visited: visitedIds.has(landmark.id),
      };
    });

    const sorted = scored.sort((a, b) => b.score - a.score);

    // Attach the active adaptations metadata to the first result for the client
    if (sorted.length > 0) {
      sorted[0]._activeAdaptations = activeAdaptations;
    }

    return sorted;
  }

  /**
   * Build active adaptations summary for scrutability.
   */
  buildActiveAdaptations(preferences, weather, currentHour, isColdStart, userPoints) {
    const adaptations = [];
    const visitorType = preferences.visitor_type || 'tourist';

    // Cold start
    if (isColdStart) {
      const defaults = COLD_START_DEFAULTS[visitorType] || COLD_START_DEFAULTS.tourist;
      adaptations.push({
        feature: 'cold_start',
        label: '🆕 New Explorer Mode',
        detail: defaults.description,
        active: true,
      });
    }

    // Time-of-day
    let timeSlot = 'Day';
    if (currentHour >= 6 && currentHour < 11) timeSlot = 'Morning';
    else if (currentHour >= 11 && currentHour < 17) timeSlot = 'Midday';
    else if (currentHour >= 17 && currentHour < 22) timeSlot = 'Evening';
    else timeSlot = 'Night';

    adaptations.push({
      feature: 'time_of_day',
      label: `🕐 ${timeSlot} Mode`,
      detail: `Scoring adjusted for ${timeSlot.toLowerCase()} exploration (${currentHour}:00).`,
      active: true,
    });

    // Weather
    if (weather) {
      let weatherDesc = `${Math.round(weather.temp)}°C`;
      if (weather.isRaining) weatherDesc += ' — Rainy, prioritising indoor spots';
      else if (weather.isCold && weather.isWindy) weatherDesc += ' — Cold & windy, favouring sheltered spots';
      else if (weather.isHot) weatherDesc += ' — Hot, shaded spots boosted';
      else if (weather.isClear) weatherDesc += ' — Clear skies, outdoor spots boosted';
      else weatherDesc += ` — ${weather.description}`;

      adaptations.push({
        feature: 'weather',
        label: weather.isRaining ? '🌧️ Weather Adapted' : weather.isClear ? '☀️ Weather Adapted' : '🌤️ Weather Adapted',
        detail: weatherDesc,
        active: true,
      });
    }

    // Visitor type
    adaptations.push({
      feature: 'visitor_type',
      label: visitorType === 'tourist' ? '✈️ Tourist Profile' : '🏡 Local Profile',
      detail: visitorType === 'tourist'
        ? 'Boosting iconic, must-see landmarks.'
        : 'Surfacing hidden gems and off-beat spots.',
      active: true,
    });

    // Expedition Member-Based Adaptiveness (New)
    if (preferences.is_expedition) {
      adaptations.push({
        feature: 'expedition_sync',
        label: '🤝 Expedition Synced',
        detail: `Route curated for the collective preferences of ${preferences.member_count} participants.`,
        active: true,
      });

      if (preferences.high_accessibility_needed) {
        adaptations.push({
          feature: 'accessibility_lock',
          label: '♿ Access Locked',
          detail: 'A participant requires high accessibility. Hard routes are filtered out.',
          active: true,
        });
      }
    }

    // Difficulty
    let diffLabel;
    if (userPoints >= 2000) diffLabel = '🏆 Power Explorer — all tiers unlocked';
    else if (userPoints >= 500) diffLabel = '⭐ Intermediate — discovered tier unlocked';
    else diffLabel = '🌱 Beginner — public landmarks prioritised';

    adaptations.push({
      feature: 'difficulty',
      label: '📊 Adaptive Difficulty',
      detail: diffLabel,
      active: true,
    });

    // Interests / categories
    if (preferences.preferred_categories?.length > 0 || preferences.interests?.length > 0) {
      const cats = preferences.preferred_categories || preferences.interests || [];
      adaptations.push({
        feature: 'interests',
        label: '🎯 Interest Match',
        detail: `Boosting: ${cats.join(', ')}`,
        active: true,
      });
    }

    // Battery
    if (preferences.battery_level !== undefined && preferences.battery_level < 20) {
      adaptations.push({
        feature: 'battery',
        label: '🔋 Low Battery Mode',
        detail: `Battery at ${preferences.battery_level}% — shorter routes favoured.`,
        active: true,
      });
    }

    // Group context
    if (preferences.group_context && preferences.group_context !== 'solo') {
      const groupLabels = {
        kids: '👶 With Kids — interactive, accessible spots',
        elderly: '🧓 With Elderly — rest stops, minimal stairs',
        large_group: '👥 Large Group — open spaces preferred',
      };
      adaptations.push({
        feature: 'group_context',
        label: '👥 Group Mode',
        detail: groupLabels[preferences.group_context] || `Group: ${preferences.group_context}`,
        active: true,
      });
    }

    return adaptations;
  }

  /**
   * Calculate recommendation score for a landmark.
   * Returns { score, reasons[] } where reasons are human-readable scrutability strings.
   */
  calculateScore(landmark, preferences, weather, visitedIds, currentHour, userPoints = 0, isColdStart = false) {
    let score = 50;
    const reasons = [];
    const tags = landmark.tags || [];
    const visitorType = preferences.visitor_type || 'tourist';

    // ── Cold Start Heuristics ──────────────────────────────────────────────────
    if (isColdStart) {
      const defaults = COLD_START_DEFAULTS[visitorType] || COLD_START_DEFAULTS.tourist;

      // Boost landmarks whose tags match the cold-start profile
      const tagMatches = defaults.boosted_tags.filter(t => tags.includes(t));
      if (tagMatches.length > 0) {
        score += 10 * tagMatches.length;
        reasons.push('🆕 Beginner Pick');
      }

      // Boost categories that map to onboarding interests
      const onboardingInterests = preferences.interests || [];
      const onboardingDbCats = onboardingInterests.flatMap(i => INTEREST_TO_DB_CATEGORY[i] || []);
      if (onboardingDbCats.includes(landmark.category)) {
        score += 15;
        reasons.push('🎯 Matches Your Interests');
      }

      // Prefer public-tier landmarks for cold-start users (easy wins)
      if (landmark.tier === 'public' || (landmark.points || 10) <= 15) {
        score += 10;
        reasons.push('⭐ Easy First Visit');
      }

      // Penalize hidden/hard landmarks for new users
      if (landmark.tier === 'hidden' || (landmark.points || 10) > 25) {
        score -= 15;
      }
    }

    // 1. Unvisited bonus
    if (!visitedIds.has(landmark.id)) {
      score += 15;
      if (!isColdStart) reasons.push('🆕 Not Yet Visited');
    }

    // 2. Category/Tag preference match
    if (preferences.preferred_categories?.includes(landmark.category)) {
      score += 10;
      if (!isColdStart) reasons.push('🎯 Category Match');
    }

    // Semantic tag matches
    const preferredTags = preferences.preferred_tags || [];
    preferredTags.forEach(tag => {
      if (tags.includes(tag)) score += 10;
    });

    // 3. Accessibility match
    if (landmark.accessibility_level >= (preferences.accessibility_min || 0)) {
      score += 10;
    }

    if (preferences.is_expedition && preferences.high_accessibility_needed) {
      if (landmark.accessibility_level < 3 || tags.includes('steep-climb') || tags.includes('stairs')) {
        score -= 50; // Severe penalty for inaccessible routes
        reasons.push('🚫 Hard to Access for Group');
      } else if (landmark.accessibility_level >= 4) {
        score += 15;
        reasons.push('♿ Safe for Everyone');
      }
    }

    // 4. Time-of-Day Adaptation
    if (currentHour >= 6 && currentHour < 11) {
      if (tags.includes('morning-vibe') || tags.includes('quiet')) {
        score += 15;
        reasons.push('🌅 Quiet Morning');
      }
    } else if (currentHour >= 11 && currentHour < 17) {
      if (landmark.is_indoor || tags.includes('shelter')) {
        score += 10;
        reasons.push('☀️ Midday Shelter');
      }
    } else if (currentHour >= 17 && currentHour < 22) {
      if (tags.includes('golden-hour') || tags.includes('scenic') || tags.includes('lit-up')) {
        score += 20;
        reasons.push('🌇 Scenic Golden Hour');
      }
    } else {
      if (tags.includes('nightlife')) {
        score += 15;
        reasons.push('🌃 Nightlife Spot');
      }
    }

    // 5. Visitor Type Adaptation
    if (visitorType === 'tourist') {
      if (landmark.points >= 20 || tags.includes('iconic')) {
        score += 15;
        reasons.push('🗺️ Must-see Icon');
      }
    } else if (visitorType === 'local') {
      if (tags.includes('hidden-gem') || tags.includes('off-the-beaten-path')) {
        score += 20;
        reasons.push('💎 Local Hidden Gem');
      } else if (landmark.points >= 30 || tags.includes('iconic')) {
        score -= 15;
        reasons.push('🚫 Avoid Crowds');
      }
    }

    // 6. Weather consideration
    if (weather) {
      if ((weather.isRaining || weather.isSnowing) && landmark.is_indoor) {
        score += 15;
        reasons.push('🌧️ Rainy Day Pick');
      }
      if (weather.isCold && weather.isWindy) {
        if (landmark.is_indoor || tags.includes('enclosed')) {
          score += 15;
          reasons.push('❄️ Sheltered Spot');
        }
      }
      if (weather.isClear && !landmark.is_indoor) {
        score += 5;
        reasons.push('☀️ Great Weather Match');
      }
    }

    // 7. Group/Social Context Adaptation
    const groupContext = preferences.group_context || 'solo';
    if (groupContext === 'kids') {
      if (tags.includes('steep-climb')) score -= 20;
      if (tags.includes('interactive') || tags.includes('park') || tags.includes('fun')) {
        score += 20;
        reasons.push('👶 Kid-Friendly');
      }
    } else if (groupContext === 'elderly') {
      score += (landmark.accessibility_level || 0) * 5;
      if (tags.includes('rest-stop') || tags.includes('benches')) {
        score += 15;
        reasons.push('🧓 Rest-Stop Nearby');
      }
      if (tags.includes('steep-climb') || tags.includes('stairs')) score -= 30;
    } else if (groupContext === 'large_group') {
      if (tags.includes('narrow') || landmark.is_indoor === true) score -= 20;
      if (tags.includes('park') || tags.includes('open-space') || tags.includes('outdoor')) {
        score += 15;
        reasons.push('👥 Open Space');
      }
    }

    // 8. Adaptive Difficulty Progression
    if (!isColdStart) {
      if (userPoints < 500) {
        if (tags.includes('iconic') || tags.includes('popular')) score += 15;
        if (tags.includes('hidden-gem') || tags.includes('off-the-beaten-path')) score -= 10;
      } else if (userPoints > 2000) {
        if (tags.includes('hidden-gem') || tags.includes('off-the-beaten-path')) {
          score += 20;
          reasons.push('🏆 Challenge Unlocked');
        }
        if (tags.includes('iconic') || tags.includes('popular')) score -= 15;
      }
    }

    // 9. Novelty bonus — boost under-visited categories
    if (preferences.category_counts && Object.keys(preferences.category_counts).length > 0) {
      const counts = preferences.category_counts;
      const catCount = counts[landmark.category] || 0;
      const maxCount = Math.max(...Object.values(counts), 1);
      const novelty = (1 - catCount / maxCount) * 15;
      if (novelty > 8) {
        score += novelty;
        reasons.push('🔄 New Category for You');
      }
    }

    // 10. Points value (Small weight for global ranking)
    score += Math.min(landmark.points / 5, 10);

    return {
      score: Math.min(Math.round(score), 100),
      reasons: reasons.slice(0, 3), // Top 3 reasons for scrutability
    };
  }
}

module.exports = new RecommendationService();
