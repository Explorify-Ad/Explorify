const { query } = require('../config/database');
const { calculateDistance } = require('../utils/distance');

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

// ─── Time-of-day category weights ────────────────────────────────────────────
// Keys map to the DB category enum values.
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
  { // Night  22:00–04:59 — route generation uncommon but handled gracefully
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
  if (!weather) return 0;
  const { isRaining, isCold, isHot, isWindy, isClear } = weather;
  const indoor = landmark.is_indoor;
  let bonus = 0;

  if (isRaining)          bonus += indoor ? 0.30 : -0.30;
  if (isCold && isWindy)  bonus += indoor ? 0.20 : -0.20;
  if (isHot)              bonus += indoor ? 0.15 : (landmark.category === 'nature' ? 0.05 : -0.10);
  if (isClear)            bonus += indoor ? -0.05 : 0.10;

  return Math.max(-0.40, Math.min(0.40, bonus));
}

// ─── Visitor type scoring ─────────────────────────────────────────────────────

function getVisitorTypeBonus(landmark, visitorType) {
  if (!visitorType) return 0;
  // Use landmark points as a proxy for popularity (higher points = more obscure / harder)
  const pts = landmark.points || 10;
  if (visitorType === 'tourist') {
    // Prefer well-known, easy-to-reach spots (low points = popular)
    return pts <= 15 ? 0.20 : pts <= 25 ? 0.00 : -0.15;
  }
  if (visitorType === 'local') {
    // Prefer obscure / high-value spots
    return pts >= 30 ? 0.25 : pts >= 20 ? 0.10 : -0.10;
  }
  return 0;
}

// ─── Adaptive difficulty ──────────────────────────────────────────────────────
// Uses landmark.points as a proxy for tier until a formal tier column is added.
// Soft penalty rather than hard exclusion so the route can still fill a budget.

function getDifficultyBonus(landmark, totalPoints) {
  const pts = landmark.points || 10;
  const tp = totalPoints || 0;

  if (pts > 25) {
    // "Hidden" tier — only comfortably accessible at 2000+ total XP
    if (tp >= 2000) return 0.15;
    if (tp >= 500)  return -0.20;
    return -0.50;
  }
  if (pts > 15) {
    // "Discovered" tier
    if (tp >= 500) return 0.05;
    return -0.15;
  }
  // "Public" tier — always accessible
  return tp === 0 ? 0.10 : 0; // small boost for brand-new users to get easy wins
}

// ─── Interest decay / novelty bonus ──────────────────────────────────────────
// Categories the user has rarely visited score higher — prevents the route
// engine from always recommending the same category.

function getNoveltyBonus(landmark, categoryCounts) {
  if (!categoryCounts || Object.keys(categoryCounts).length === 0) return 0;
  const appCat   = BACKEND_TO_APP_CAT[landmark.category];
  const count    = appCat ? (categoryCounts[appCat] ?? 0) : 0;
  const maxCount = Math.max(...Object.values(categoryCounts), 1);
  // Scales from 0 (most-visited) to 0.25 (never visited)
  return ((1 - count / maxCount) * 0.25);
}

// ─── Dwell time per-user per-category ────────────────────────────────────────
// Returns how many minutes this user typically spends at this type of place.
// Falls back to the landmark's static avg_visit_duration_min.

function getVisitTime(landmark, dwellTimes) {
  if (!dwellTimes) return landmark.avg_visit_duration_min || 30;
  const appCat = BACKEND_TO_APP_CAT[landmark.category];
  return (appCat && dwellTimes[appCat]) || landmark.avg_visit_duration_min || 30;
}

// ─── Composite score ──────────────────────────────────────────────────────────

function calculateScore(landmark, current, context) {
  const {
    currentHour, weather, visitorType, totalPoints,
    preferredCategories, categoryCounts,
  } = context;

  const dist = calculateDistance(
    current.latitude, current.longitude,
    landmark.latitude, landmark.longitude,
  );

  // Distance: exponential decay — 0.3 km → ~0.69, 1 km → ~0.29, 3 km → ~0.05
  const distScore = Math.exp(-dist / 0.8);

  // Category preference
  const catScore = preferredCategories?.includes(landmark.category) ? 1.0 : 0.40;

  // Adaptive bonuses
  const timeBonus     = getTimeOfDayBonus(landmark.category, currentHour);
  const weatherBonus  = getWeatherBonus(landmark, weather);
  const visitorBonus  = getVisitorTypeBonus(landmark, visitorType);
  const diffBonus     = getDifficultyBonus(landmark, totalPoints);
  const noveltyBonus  = getNoveltyBonus(landmark, categoryCounts);

  // Weighted composite — weights sum to 1.0
  return (
    distScore    * 0.35 +
    catScore     * 0.22 +
    timeBonus    * 0.14 +
    noveltyBonus * 0.12 +
    weatherBonus * 0.08 +
    visitorBonus * 0.05 +
    diffBonus    * 0.04
  );
}

// ─── Route service ────────────────────────────────────────────────────────────

class RouteService {
  /**
   * Generate an optimized route.
   */
  async generateRoute({ startLat, startLng, timeBudget, preferences = {}, userId }) {
    // Fetch user context from DB if logged in
    let totalPoints    = preferences.total_points || 0;
    let userPrefs      = {};
    let dwellTimes     = preferences.dwell_times    || null; // { History: 35, Art: 20 }
    let categoryCounts = preferences.category_counts || null; // { History: 8, Nature: 1 }

    if (userId) {
      try {
        const [userResult, dwellResult] = await Promise.all([
          query('SELECT total_points, preferences FROM users WHERE id = $1', [userId]),
          // Aggregate per-user per-category avg dwell time from the backend's collections table
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
        ]);

        if (userResult.rows[0]) {
          totalPoints = userResult.rows[0].total_points || totalPoints;
          userPrefs   = userResult.rows[0].preferences || {};
        }

        // Build dwell-time map keyed by normalised app category
        if (dwellResult.rows.length > 0 && !dwellTimes) {
          dwellTimes = {};
          dwellResult.rows.forEach(({ category, avg_dwell }) => {
            const appCat = BACKEND_TO_APP_CAT[category];
            if (appCat) dwellTimes[appCat] = avg_dwell;
          });
        }
      } catch (_) { /* non-fatal — fall back to static values */ }
    }

    // Merge preferences (request-level overrides DB preferences)
    const merged = { ...userPrefs, ...preferences };

    // Build scoring context
    const context = {
      currentHour:     new Date().getHours(),
      weather:         merged.weather       ?? null,
      visitorType:     merged.visitor_type  ?? null,
      totalPoints,
      preferredCategories: merged.categories ?? [],
      categoryCounts,  // { History: 8, Nature: 1, ... } — novelty decay
      dwellTimes,      // { History: 35, Art: 20, ... } — learned visit durations
    };

    // Fetch landmarks — indoor filter applied early if weather demands it
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
    // Force indoor if heavy rain
    if (merged.indoor_only || (context.weather?.isRaining && context.weather?.windSpeed > 8)) {
      sql += ' AND is_indoor = true';
    }

    const result = await query(sql, params);
    const landmarks = result.rows;

    const route = this.buildRoute(
      { latitude: startLat, longitude: startLng },
      landmarks,
      timeBudget,
      context,
    );

    if (userId) {
      const totalDistance = this.calculateTotalDistance(route, startLat, startLng);
      const savedRoute = await query(
        `INSERT INTO routes (user_id, landmarks, total_distance_km, estimated_duration_min)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [userId, JSON.stringify(route.map((l) => l.id)), totalDistance, timeBudget],
      );
      return { ...savedRoute.rows[0], landmarks: route };
    }

    return { landmarks: route };
  }

  /**
   * Build route using score-ranked greedy selection.
   * Replaces pure nearest-neighbor with a composite score so time-of-day,
   * weather, visitor type, and difficulty all influence landmark ordering.
   */
  buildRoute(start, landmarks, timeBudget, context = {}) {
    const route    = [];
    const remaining = [...landmarks];
    let current    = start;
    let totalTime  = 0;

    while (remaining.length > 0 && totalTime < timeBudget) {
      let bestIdx   = -1;
      let bestScore = -Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const lm = remaining[i];
        const dist      = calculateDistance(current.latitude, current.longitude, lm.latitude, lm.longitude);
        const walkTime  = (dist / 4.5) * 60;
        const visitTime = getVisitTime(lm, context.dwellTimes); // ← learned dwell time

        if (totalTime + walkTime + visitTime > timeBudget) continue;

        const score = calculateScore(lm, current, context);
        if (score > bestScore) {
          bestScore = score;
          bestIdx   = i;
        }
      }

      if (bestIdx === -1) break;

      const lm        = remaining[bestIdx];
      const dist      = calculateDistance(current.latitude, current.longitude, lm.latitude, lm.longitude);
      const walkTime  = (dist / 4.5) * 60;
      const visitTime = getVisitTime(lm, context.dwellTimes);

      remaining.splice(bestIdx, 1);
      route.push({
        ...lm,
        order:                  route.length + 1,
        estimated_arrival_min:  Math.round(totalTime + walkTime),
        visit_duration_min:     visitTime,  // expose to client so UI can show personalised estimate
      });

      current    = { latitude: lm.latitude, longitude: lm.longitude };
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
