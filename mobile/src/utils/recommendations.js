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
  const reasons = [];

  // ── Interest match ────────────────────────────────────────────────────────
  if (preferences.preferred_categories?.includes(landmark.category)) {
    score += 20;
    reasons.push('⭐ Matches your interests');
  }

  // ── visitor_type differentiation ─────────────────────────────────────────
  if (preferences.visitor_type === 'local') {
    if (landmark.tier === 'hidden')          { score += 15; reasons.push('🔍 Local hidden gem'); }
    else if (landmark.tier === 'discovered')   score += 8;
  } else {
    if (landmark.tier === 'public') score += 8;
    score += Math.min((landmark.points || 0) / 3, 10);
  }

  // ── Category novelty (boost under-explored categories) ───────────────────
  const catCount = preferences.category_counts?.[landmark.category] || 0;
  if (catCount === 0)     { score += 12; reasons.push('✨ New category for you'); }
  else if (catCount < 3)  score += 5;

  // ── Rating-based boost (from user's starred check-ins) ───────────────────
  const avgRating = preferences.avg_ratings?.[landmark.category];
  if (avgRating != null) {
    if (avgRating >= 4.5)      { score += 20; reasons.push('❤️ You love this category'); }
    else if (avgRating >= 3.5) { score += 10; reasons.push('👍 Highly rated by you'); }
    else if (avgRating < 2.5)    score -= 10;
  }

  // ── Time-decayed category affinity ───────────────────────────────────────
  const affinity = preferences.category_affinities?.[landmark.category] || 0;
  if (affinity >= 70)      score += 10;
  else if (affinity >= 40) score += 5;

  // ── Already collected: strong penalty ────────────────────────────────────
  if (preferences.collected_ids?.includes(String(landmark.id))) score -= 60;

  // ── Accessibility ─────────────────────────────────────────────────────────
  const minAccess = preferences.accessibility_min || 1;
  if ((landmark.accessibility_level || 3) >= minAccess) score += 5;

  // ── Weather scoring ───────────────────────────────────────────────────────
  const { weather, timeOfDay, batteryTier } = context;
  if (weather) {
    if (weather.isRaining && landmark.is_indoor)  { score += 18; reasons.push('🌧️ Indoor — rainy day pick'); }
    if (weather.isRaining && !landmark.is_indoor)   score -= 15;
    if (weather.isHot && landmark.is_indoor)        score += 8;
    if (weather.isClear && !landmark.is_indoor)   { score += 6;  reasons.push('☀️ Great in this weather'); }
    if (weather.isWindy && landmark.is_indoor)      score += 5;
  }

  // ── Time-of-day scoring ───────────────────────────────────────────────────
  if (timeOfDay === 'morning') {
    if (landmark.category === 'Food')   { score += 10; reasons.push('🌅 Good breakfast spot'); }
    if (landmark.category === 'Nature') { score += 8;  reasons.push('🌿 Lovely morning walk'); }
  }
  if (timeOfDay === 'afternoon') {
    if (landmark.category === 'Architecture') score += 8;
    if (landmark.category === 'History')      score += 8;
    if (landmark.category === 'Art')          score += 6;
  }
  if (timeOfDay === 'evening') {
    if (landmark.category === 'Nightlife') { score += 18; reasons.push('🌆 Top evening pick'); }
    if (landmark.category === 'Art')       { score += 10; reasons.push('🎨 Galleries open late'); }
    if (landmark.category === 'Food')      { score += 8;  reasons.push('🍽️ Great dinner spot'); }
  }
  if (timeOfDay === 'night') {
    if (landmark.category === 'Nightlife') { score += 14; reasons.push('🌃 Perfect for tonight'); }
  }

  // ── Temporal preference amplifier ────────────────────────────────────────
  if (preferences.preferred_time_of_day && preferences.preferred_time_of_day === timeOfDay) {
    score += 8;
    reasons.push('🕐 Your usual exploration time');
  }

  // ── Battery-aware: prefer quick/close stops when low ─────────────────────
  if (batteryTier === 'low' || batteryTier === 'critical') {
    if ((landmark.avg_visit_duration_min || 30) <= 20)        { score += 12; reasons.push('🔋 Quick stop'); }
    if (landmark.distance != null && landmark.distance < 300)   score += 8;
    if ((landmark.avg_visit_duration_min || 30) > 45)           score -= 8;
  }

  return { score: Math.max(0, Math.min(score, 100)), reasons };
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
    .map(l => {
      const { score, reasons } = calculateScore(l, preferences, context);
      return { ...l, score, reasons };
    })
    .sort((a, b) => b.score - a.score);

/**
 * Convenience: build preferences object straight from store state.
 */
export const buildPreferences = ({
  interests,
  visitorType,
  collection,
  categoryAffinities = null,   // from getCategoryAffinities()
  accessibilityMin = 1,
  preferredTimeOfDay = null,   // from getPreferredTimeOfDay()
}) => {
  const catMap = {
    architecture: 'Architecture', food: 'Food', history: 'History',
    art: 'Art', nature: 'Nature', nightlife: 'Nightlife',
  };

  // Raw visit counts per category
  const category_counts = {};
  collection.forEach(c => {
    if (c.category) category_counts[c.category] = (category_counts[c.category] || 0) + 1;
  });

  // Average star ratings per category
  const ratingTotals = {}, ratingCounts = {};
  collection.forEach(c => {
    if (c.category && c.rating > 0) {
      ratingTotals[c.category] = (ratingTotals[c.category] || 0) + c.rating;
      ratingCounts[c.category] = (ratingCounts[c.category] || 0) + 1;
    }
  });
  const avg_ratings = {};
  Object.keys(ratingTotals).forEach(cat => {
    avg_ratings[cat] = ratingTotals[cat] / ratingCounts[cat];
  });

  // Time-decayed affinity map { Architecture: 85, Food: 40, … }
  const category_affinities = {};
  (categoryAffinities || []).forEach(({ category, affinity }) => {
    category_affinities[category] = affinity;
  });

  return {
    preferred_categories: interests.map(i => catMap[i]).filter(Boolean),
    visitor_type: visitorType,
    category_counts,
    category_affinities,
    avg_ratings,
    collected_ids: collection.map(c => String(c.id)),
    accessibility_min: accessibilityMin,
    preferred_time_of_day: preferredTimeOfDay,
  };
};
