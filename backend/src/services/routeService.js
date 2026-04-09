const { query } = require('../config/database');
const { calculateDistance } = require('../utils/distance');
const recommendationService = require('./recommendationService');
const weatherService = require('./weatherService');

// Maps backend DB category enum → normalised app category name
const BACKEND_TO_APP_CAT = {
  historical:   'History',
  cultural:     'Art',
  nature:       'Nature',
  shopping:     'Food',
  sports:       'Architecture',
  architecture: 'Architecture',
  landmark:     'Architecture',
};

// Map onboarding interest IDs → DB category enums (for cold start)
const INTEREST_TO_DB_CATEGORY = {
  architecture: ['architecture', 'landmark'],
  food: ['shopping'],
  nature: ['nature'],
  history: ['historical'],
  art: ['cultural'],
  nightlife: ['shopping'],
};

// ─── Time-of-day category weights ────────────────────────────────────────────
const TIME_WINDOWS = [
  { // Morning  05:00–10:59
    hours: [5, 6, 7, 8, 9, 10],
    weights: { nature: 0.30, shopping: 0.25, historical: 0.10, cultural: 0.10, architecture: 0.05, landmark: 0.05, sports: 0.15 },
  },
  { // Midday  11:00–15:59
    hours: [11, 12, 13, 14, 15],
    weights: { cultural: 0.35, historical: 0.30, architecture: 0.20, landmark: 0.10, shopping: 0.05, nature: 0.00, sports: 0.00 },
  },
  { // Evening  16:00–21:59
    hours: [16, 17, 18, 19, 20, 21],
    weights: { architecture: 0.30, landmark: 0.25, historical: 0.15, cultural: 0.15, shopping: 0.10, nature: 0.05, sports: 0.00 },
  },
  { // Night  22:00–04:59
    hours: [22, 23, 0, 1, 2, 3, 4],
    weights: { shopping: 0.30, cultural: 0.25, landmark: 0.20, architecture: 0.15, historical: 0.05, nature: 0.05, sports: 0.00 },
  },
];

function getTimeOfDayBonus(category, hour) {
  const window = TIME_WINDOWS.find((w) => w.hours.includes(hour));
  return window ? (window.weights[category] ?? 0) : 0;
}

// ─── Weather scoring ──────────────────────────────────────────────────────────

function getWeatherBonus(landmark, weather) {
  if (!weather) return { bonus: 0, reason: null };
  const { isRaining, isCold, isHot, isWindy, isClear } = weather;
  const indoor = landmark.is_indoor;
  let bonus = 0;
  let reason = null;

  if (isRaining) {
    bonus += indoor ? 0.30 : -0.30;
    if (indoor) reason = '🌧️ Indoor shelter';
  }
  if (isCold && isWindy) {
    bonus += indoor ? 0.20 : -0.20;
    if (indoor && !reason) reason = '❄️ Protected from wind';
  }
  if (isHot) {
    bonus += indoor ? 0.15 : (landmark.category === 'nature' ? 0.05 : -0.10);
    if (!reason && indoor) reason = '🥵 Cool retreat';
  }
  if (isClear) {
    bonus += indoor ? -0.05 : 0.10;
    if (!reason && !indoor) reason = '☀️ Great weather match';
  }

  return { bonus: Math.max(-0.40, Math.min(0.40, bonus)), reason };
}

// ─── Visitor type scoring ─────────────────────────────────────────────────────

function getVisitorTypeBonus(landmark, visitorType) {
  if (!visitorType) return { bonus: 0, reason: null };
  const pts = landmark.points || 10;
  if (visitorType === 'tourist') {
    if (pts <= 15) return { bonus: 0.20, reason: '✈️ Tourist favourite' };
    if (pts <= 25) return { bonus: 0.00, reason: null };
    return { bonus: -0.15, reason: null };
  }
  if (visitorType === 'local') {
    if (pts >= 30) return { bonus: 0.25, reason: '💎 Local hidden gem' };
    if (pts >= 20) return { bonus: 0.10, reason: '🏡 Off the beaten path' };
    return { bonus: -0.10, reason: null };
  }
  return { bonus: 0, reason: null };
}

// ─── Adaptive difficulty ──────────────────────────────────────────────────────

function getDifficultyBonus(landmark, totalPoints) {
  const pts = landmark.points || 10;
  const tp = totalPoints || 0;

  if (pts > 25) {
    if (tp >= 2000) return { bonus: 0.15, reason: '🏆 Challenge unlocked' };
    if (tp >= 500)  return { bonus: -0.20, reason: null };
    return { bonus: -0.50, reason: null };
  }
  if (pts > 15) {
    if (tp >= 500) return { bonus: 0.05, reason: '⭐ Discovered tier' };
    return { bonus: -0.15, reason: null };
  }
  if (tp === 0) return { bonus: 0.10, reason: '🌱 Beginner-friendly' };
  return { bonus: 0, reason: null };
}

// ─── Interest decay / novelty bonus ──────────────────────────────────────────

function getNoveltyBonus(landmark, categoryCounts) {
  if (!categoryCounts || Object.keys(categoryCounts).length === 0) return { bonus: 0, reason: null };
  const appCat   = BACKEND_TO_APP_CAT[landmark.category];
  const count    = appCat ? (categoryCounts[appCat] ?? 0) : 0;
  const maxCount = Math.max(...Object.values(categoryCounts), 1);
  const bonus = ((1 - count / maxCount) * 0.25);
  const reason = bonus > 0.15 ? '🔄 New category for you' : null;
  return { bonus, reason };
}

// ─── Dwell time per-user per-category ────────────────────────────────────────

function getVisitTime(landmark, dwellTimes) {
  if (!dwellTimes) return landmark.avg_visit_duration_min || 30;
  const appCat = BACKEND_TO_APP_CAT[landmark.category];
  return (appCat && dwellTimes[appCat]) || landmark.avg_visit_duration_min || 30;
}

// ─── Cold Start Helpers ──────────────────────────────────────────────────────

function getColdStartBonus(landmark, preferences) {
  const interests = preferences.interests || [];
  if (interests.length === 0) return { bonus: 0, reason: null };

  const onboardingDbCats = interests.flatMap(i => INTEREST_TO_DB_CATEGORY[i] || []);
  if (onboardingDbCats.includes(landmark.category)) {
    return { bonus: 0.20, reason: '🎯 Matches your interests' };
  }
  return { bonus: 0, reason: null };
}

// ─── Composite score WITH reasons ─────────────────────────────────────────────

function calculateScoreWithReasons(landmark, current, context) {
  const {
    currentHour, weather, visitorType, totalPoints,
    preferredCategories, categoryCounts, isColdStart, preferences,
  } = context;

  const dist = calculateDistance(
    current.latitude, current.longitude,
    landmark.latitude, landmark.longitude,
  );

  // Distance: exponential decay
  const distScore = Math.exp(-dist / 0.8);

  // Category preference
  const catScore = preferredCategories?.includes(landmark.category) ? 1.0 : 0.40;

  // Adaptive bonuses with scrutability reasons
  const timeBonus    = getTimeOfDayBonus(landmark.category, currentHour);
  const weatherRes   = getWeatherBonus(landmark, weather);
  const visitorRes   = getVisitorTypeBonus(landmark, visitorType);
  const diffRes      = getDifficultyBonus(landmark, totalPoints);
  const noveltyRes   = getNoveltyBonus(landmark, categoryCounts);
  const coldStartRes = isColdStart ? getColdStartBonus(landmark, preferences || {}) : { bonus: 0, reason: null };

  // Collect all non-null reasons
  const reasons = [
    weatherRes.reason,
    visitorRes.reason,
    diffRes.reason,
    noveltyRes.reason,
    coldStartRes.reason,
  ].filter(Boolean);

  // Add time-slot reason
  if (timeBonus > 0.15) {
    const slots = { morning: '🌅 Morning discovery', midday: '☀️ Midday visit', evening: '🌇 Evening stroll', night: '🌃 Night exploration' };
    const slot = currentHour >= 5 && currentHour < 11 ? 'morning'
               : currentHour >= 11 && currentHour < 16 ? 'midday'
               : currentHour >= 16 && currentHour < 22 ? 'evening'
               : 'night';
    reasons.push(slots[slot]);
  }

  // Add category match reason
  if (catScore === 1.0) {
    reasons.push('🎯 Preferred category');
  }

  // Weighted composite — weights sum to 1.0
  const compositeScore = (
    distScore             * 0.30 +
    catScore              * 0.18 +
    timeBonus             * 0.14 +
    noveltyRes.bonus      * 0.12 +
    weatherRes.bonus      * 0.08 +
    visitorRes.bonus      * 0.05 +
    diffRes.bonus         * 0.04 +
    coldStartRes.bonus    * 0.09  // Cold start gets meaningful weight for new users
  );

  return { score: compositeScore, reasons: reasons.slice(0, 3) };
}

// ─── Route service ────────────────────────────────────────────────────────────

class RouteService {
  /**
   * Generate an optimized route.
   */
  async generateRoute({ startLat, startLng, timeBudget, preferences = {}, userId }) {
    const batteryLevel = preferences.battery_level !== undefined ? preferences.battery_level : 100;
    const abandonmentStreak = preferences.abandonment_streak || 0;

    // Priority 5: Route Abandonment Adaptation
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

    // Battery-aware constraints
    if (batteryLevel < 20) {
      timeBudget = Math.min(timeBudget, 60);
    }
    if (batteryLevel < 10) {
      timeBudget = Math.min(timeBudget, 30);
    }

    // Fetch user context from DB if logged in
    let totalPoints    = preferences.total_points || 0;
    let userPrefs      = {};
    let dwellTimes     = preferences.dwell_times    || null;
    let categoryCounts = preferences.category_counts || null;
    let collectionCount = 0;

    if (userId) {
      try {
        const [userResult, dwellResult, countResult] = await Promise.all([
          query('SELECT total_points, preferences FROM users WHERE id = $1', [userId]),
          query(
            `SELECT l.category, AVG(c.dwell_time_min)::int AS avg_dwell
             FROM collections c
             JOIN landmarks l ON l.id = c.landmark_id
             WHERE c.user_id = $1
               AND c.dwell_time_min IS NOT NULL
               AND c.dwell_time_min > 0
             GROUP BY l.category`,
            [userId],
          ),
          query('SELECT COUNT(*) as cnt FROM collections WHERE user_id = $1', [userId]),
        ]);

        if (userResult.rows[0]) {
          totalPoints = userResult.rows[0].total_points || totalPoints;
          userPrefs   = userResult.rows[0].preferences || {};
        }

        if (dwellResult.rows.length > 0 && !dwellTimes) {
          dwellTimes = {};
          dwellResult.rows.forEach(({ category, avg_dwell }) => {
            const appCat = BACKEND_TO_APP_CAT[category];
            if (appCat) dwellTimes[appCat] = avg_dwell;
          });
        }

        collectionCount = parseInt(countResult.rows[0]?.cnt || 0);
      } catch (_) { /* non-fatal */ }
    }

    const isColdStart = collectionCount === 0;

    // Merge preferences
    const merged = { ...userPrefs, ...preferences };

    // Build scoring context
    const currentHour = preferences.current_hour !== undefined
      ? parseInt(preferences.current_hour)
      : new Date().getHours();

    let weather = null;
    try {
      weather = await weatherService.getCurrentWeather(startLat, startLng);
    } catch (err) {}

    const context = {
      currentHour,
      weather:             merged.weather       ?? weather ?? null,
      visitorType:         merged.visitor_type  ?? null,
      totalPoints,
      preferredCategories: merged.categories ?? [],
      categoryCounts,
      dwellTimes,
      isColdStart,
      preferences: merged,
      batteryLevel,
      groupContext: merged.group_context,
      walking_speed_kmh: merged.walking_speed_kmh,
    };

    // Build active adaptations for scrutability
    const activeAdaptations = recommendationService.buildActiveAdaptations(
      merged, context.weather, currentHour, isColdStart, totalPoints
    );

    // Fetch landmarks
    let sql = 'SELECT * FROM landmarks WHERE 1=1';
    const params = [];
    let idx = 1;

    if (merged.categories?.length > 0) {
      sql += ` AND category = ANY($${idx++})`;
      params.push(merged.categories);
    }
    if (merged.accessibility_min) {
      sql += ` AND accessibility_level >= $${idx++}`;
      params.push(merged.accessibility_min);
    }
    if (merged.indoor_only || (context.weather?.isRaining && context.weather?.windSpeed > 8)) {
      sql += ' AND is_indoor = true';
    }

    const result = await query(sql, params);
    let landmarks = result.rows;

    // Get visited landmarks for this user
    const visited = userId ? await query('SELECT landmark_id FROM collections WHERE user_id = $1', [userId]) : { rows: [] };
    const visitedIds = new Set(visited.rows.map(r => r.landmark_id));

    // Build route using unified composite scoring
    const route = this.buildRoute(
      { latitude: startLat, longitude: startLng },
      landmarks,
      timeBudget,
      context,
      visitedIds,
    );

    // Build the response
    const routeResponse = {
      landmarks: route,
      active_adaptations: activeAdaptations,
      cold_start: isColdStart,
      estimated_duration_min: timeBudget,
    };

    if (userId) {
      const totalDistance = this.calculateTotalDistance(route, startLat, startLng);
      try {
        const savedRoute = await query(
          `INSERT INTO routes (user_id, landmarks, total_distance_km, estimated_duration_min)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [userId, JSON.stringify(route.map((l) => l.id)), totalDistance, timeBudget],
        );
        return { ...savedRoute.rows[0], ...routeResponse };
      } catch (_) {
        return routeResponse;
      }
    }

    return routeResponse;
  }

  /**
   * Build route using score-ranked greedy selection.
   * Uses a single unified scoring pipeline with full scrutability.
   */
  buildRoute(start, landmarks, timeBudget, context = {}, visitedIds = new Set()) {
    const route = [];
    const remaining = [...landmarks];
    let current = start;
    let totalTime = 0;

    const userWalkingPace = context.walking_speed_kmh || 4.5;
    const dwellTimes = context.dwellTimes || null;

    while (remaining.length > 0 && totalTime < timeBudget) {
      let bestIdx = -1;
      let bestScore = -Infinity;
      let bestReasons = [];

      for (let i = 0; i < remaining.length; i++) {
        const lm = remaining[i];

        const dist = calculateDistance(
          current.latitude, current.longitude,
          lm.latitude, lm.longitude
        );

        // Critical Battery Constraint
        if (context.batteryLevel < 10 && dist > 0.5) continue;

        // Group mobility constraints
        if ((context.groupContext === 'kids' || context.groupContext === 'elderly') && dist > 0.6) continue;

        const walkTime = (dist / userWalkingPace) * 60;
        const visitTime = getVisitTime(lm, dwellTimes);

        if (totalTime + walkTime + visitTime > timeBudget) continue;

        // Skip already-visited landmarks (repeat-visit avoidance)
        const alreadyVisited = visitedIds.has(lm.id);
        const visitedPenalty = alreadyVisited ? -0.25 : 0;

        // Unified composite scoring with reasons
        const { score, reasons } = calculateScoreWithReasons(lm, current, context);

        // Add visited penalty and reason
        let adjustedScore = score + visitedPenalty;
        const adjustedReasons = [...reasons];
        if (alreadyVisited) {
          adjustedReasons.unshift('🔁 Previously Visited');
        }

        // Priority = Score / (Distance + 0.1)
        const priority = adjustedScore / (dist + 0.1);

        if (priority > bestScore) {
          bestScore = priority;
          bestIdx = i;
          bestReasons = adjustedReasons;
        }
      }

      if (bestIdx === -1) break;

      const lm = remaining[bestIdx];
      const dist = calculateDistance(current.latitude, current.longitude, lm.latitude, lm.longitude);
      const walkTime = (dist / userWalkingPace) * 60;
      const visitTime = getVisitTime(lm, dwellTimes);

      remaining.splice(bestIdx, 1);
      route.push({
        ...lm,
        order: route.length + 1,
        estimated_arrival_min: Math.round(totalTime + walkTime),
        visit_duration_min: visitTime,
        reasons: bestReasons.slice(0, 3),
      });

      current = { latitude: lm.latitude, longitude: lm.longitude };
      totalTime += walkTime + visitTime;
    }

    return route;
  }

  async getRouteById(id) {
    const result = await query('SELECT * FROM routes WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  calculateTotalDistance(route, startLat, startLng) {
    if (route.length === 0) return 0;
    let total = calculateDistance(startLat, startLng, route[0].latitude, route[0].longitude);
    for (let i = 1; i < route.length; i++) {
      total += calculateDistance(
        route[i - 1].latitude, route[i - 1].longitude,
        route[i].latitude, route[i].longitude,
      );
    }
    return Math.round(total * 100) / 100;
  }
}

module.exports = new RouteService();
