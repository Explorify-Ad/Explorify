/**
 * Full adaptive recommendation engine.
 * Scores landmarks using: interests, visitor_type, weather, time-of-day,
 * battery tier, category novelty, and already-collected penalty.
 */

// ─── Context builder ──────────────────────────────────────────────────────────

/**
 * Build a context object from live hook values to pass into getRecommendations.
 * @param {{ weather: object|null, batteryTier: string }} opts
 */
export const buildContext = ({ weather = null, batteryTier = 'ok' } = {}) => {
  const hour = new Date().getHours();
  let timeOfDay;
  if (hour >= 6  && hour < 12) timeOfDay = 'morning';
  else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
  else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
  else timeOfDay = 'night';

  return { timeOfDay, weather, batteryTier };
};

// ─── Contextual greeting ──────────────────────────────────────────────────────

/**
 * Returns a greeting + subtitle line tailored to context and visitor type.
 */
export const getContextualGreeting = (userName, context, visitorType) => {
  const { timeOfDay, weather } = context;
  const name = userName || 'Explorer';

  if (weather?.isRaining)
    return { greeting: `Rainy day, ${name}`, sub: 'Best indoor spots, picked for you' };
  if (weather?.isCold && timeOfDay === 'morning')
    return { greeting: `Cold one out there, ${name}`, sub: 'Warm up at a heritage or art spot' };
  if (weather?.isClear && timeOfDay === 'morning')
    return { greeting: `Beautiful morning, ${name}`, sub: 'Perfect day to start exploring early' };
  if (timeOfDay === 'evening')
    return { greeting: `Evening, ${name}`, sub: "The city's night side is waiting" };
  if (timeOfDay === 'morning')
    return { greeting: `Good morning, ${name}`, sub: 'Start your day with something new' };
  if (visitorType === 'local')
    return { greeting: `Hey ${name}`, sub: 'Hidden spots your neighbourhood keeps secret' };
  return { greeting: `Ready to explore, ${name}?`, sub: "Dublin's best, personalised for you" };
};

// ─── Scoring ──────────────────────────────────────────────────────────────────

/**
 * Score a single landmark 0–100.
 *
 * preferences shape:
 *   preferred_categories  string[]   — from onboarding interests
 *   visitor_type          string     — 'tourist' | 'local'
 *   category_counts       object     — { Architecture: 5, Food: 1, … }
 *   collected_ids         string[]   — landmark IDs already in collection
 *   accessibility_min     number     — 1–5
 *
 * context shape (from buildContext):
 *   timeOfDay    'morning'|'afternoon'|'evening'|'night'
 *   weather      { isRaining, isCold, isHot, isWindy, isClear } | null
 *   batteryTier  'ok'|'medium'|'low'|'critical'
 */
const calculateScore = (landmark, preferences, context) => {
  let score = 50;

  // ── Interest match ────────────────────────────────────────────────────────
  if (preferences.preferred_categories?.includes(landmark.category)) score += 20;

  // ── visitor_type differentiation ─────────────────────────────────────────
  if (preferences.visitor_type === 'local') {
    // Locals crave the off-the-beaten-path
    if (landmark.tier === 'hidden')     score += 15;
    else if (landmark.tier === 'discovered') score += 8;
  } else {
    // Tourists prefer well-known, high-value spots
    if (landmark.tier === 'public') score += 8;
    score += Math.min((landmark.points || 0) / 3, 10);
  }

  // ── Category novelty (boost under-explored categories) ───────────────────
  const catCount = preferences.category_counts?.[landmark.category] || 0;
  if (catCount === 0)      score += 12;  // never explored this category
  else if (catCount < 3)  score += 5;   // lightly explored

  // ── Already collected: strong penalty ────────────────────────────────────
  if (preferences.collected_ids?.includes(String(landmark.id))) score -= 60;

  // ── Accessibility ─────────────────────────────────────────────────────────
  const minAccess = preferences.accessibility_min || 1;
  if ((landmark.accessibility_level || 3) >= minAccess) score += 5;

  // ── Weather scoring ───────────────────────────────────────────────────────
  const { weather, timeOfDay, batteryTier } = context;
  if (weather) {
    if (weather.isRaining && landmark.is_indoor)  score += 18;
    if (weather.isRaining && !landmark.is_indoor) score -= 15;
    if (weather.isHot && landmark.is_indoor)      score += 8;
    if (weather.isClear && !landmark.is_indoor)   score += 6;
    if (weather.isWindy && landmark.is_indoor)    score += 5;
  }

  // ── Time-of-day scoring ───────────────────────────────────────────────────
  if (timeOfDay === 'morning') {
    if (landmark.category === 'Food') score += 10;          // breakfast spots
    if (landmark.category === 'Nature') score += 8;         // morning walks
  }
  if (timeOfDay === 'afternoon') {
    if (landmark.category === 'Architecture') score += 8;
    if (landmark.category === 'History')      score += 8;
    if (landmark.category === 'Art')          score += 6;
  }
  if (timeOfDay === 'evening') {
    if (landmark.category === 'Nightlife') score += 18;
    if (landmark.category === 'Art')       score += 10;     // galleries open late
    if (landmark.category === 'Food')      score += 8;      // dinner spots
  }
  if (timeOfDay === 'night') {
    if (landmark.category === 'Nightlife') score += 14;
  }

  // ── Battery-aware: prefer quick/close stops when low ─────────────────────
  if (batteryTier === 'low' || batteryTier === 'critical') {
    if ((landmark.avg_visit_duration_min || 30) <= 20)            score += 12;
    if (landmark.distance != null && landmark.distance < 300)     score += 8;
    if ((landmark.avg_visit_duration_min || 30) > 45)             score -= 8;
  }

  return Math.max(0, Math.min(score, 100));
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Score and rank landmarks by how well they match the user right now.
 *
 * @param {Array}  landmarks   — raw landmark objects
 * @param {object} preferences — user preferences (see calculateScore docs)
 * @param {object} context     — from buildContext()
 * @returns {Array} landmarks with .score, sorted best-first
 */
export const getRecommendations = (landmarks, preferences, context = {}) =>
  landmarks
    .map(l => ({ ...l, score: calculateScore(l, preferences, context) }))
    .sort((a, b) => b.score - a.score);

/**
 * Convenience: build preferences object straight from store state.
 */
export const buildPreferences = ({ interests, visitorType, collection }) => {
  const catMap = {
    architecture: 'Architecture', food: 'Food', history: 'History',
    art: 'Art', nature: 'Nature', nightlife: 'Nightlife',
  };
  const category_counts = {};
  collection.forEach(c => {
    if (c.category) category_counts[c.category] = (category_counts[c.category] || 0) + 1;
  });

  return {
    preferred_categories: interests.map(i => catMap[i]).filter(Boolean),
    visitor_type: visitorType,
    category_counts,
    collected_ids: collection.map(c => String(c.id)),
    accessibility_min: 1,
  };
};
