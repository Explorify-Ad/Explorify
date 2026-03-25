const recommendationService = require('../../src/services/recommendationService');

describe('RecommendationService.calculateScore', () => {
  const baseLandmark = {
    id: 'l1',
    category: 'culture',
    tags: [],
    accessibility_level: 1,
    is_indoor: false,
    points: 10,
  };

  const basePreferences = {
    preferred_categories: [],
    preferred_tags: [],
    visitor_type: 'tourist',
    group_context: 'solo',
    accessibility_min: 0,
  };

  const visitedIds = new Set();
  const currentHour = 12; // Midday
  const userPoints = 1000; // Regular user

  test('should give unvisited bonus', () => {
    const scoreWithVisited = recommendationService.calculateScore(
      baseLandmark,
      basePreferences,
      null,
      new Set(['l1']),
      currentHour,
      userPoints
    );
    const scoreWithoutVisited = recommendationService.calculateScore(
      baseLandmark,
      basePreferences,
      null,
      new Set(),
      currentHour,
      userPoints
    );
    // scoreWithVisited: 50 (base) + 10 (access) + 2 (points) = 62
    // scoreWithoutVisited: 62 + 15 (unvisited) = 77
    expect(scoreWithoutVisited).toBe(77);
    expect(scoreWithVisited).toBe(62);
  });

  test('should give category preference match bonus', () => {
    const prefs = { ...basePreferences, preferred_categories: ['culture'] };
    const score = recommendationService.calculateScore(
      baseLandmark,
      prefs,
      null,
      visitedIds,
      currentHour,
      userPoints
    );
    // Base 50 + Unvisited 15 + Category 10 + Access 10 + Points 2 = 87
    expect(score).toBe(87);
  });

  test('should handle Time-of-Day Adaptation: Morning', () => {
    const morningLandmark = { ...baseLandmark, tags: ['morning-vibe'] };
    const scoreMorning = recommendationService.calculateScore(
      morningLandmark,
      basePreferences,
      null,
      visitedIds,
      8, // 8 AM
      userPoints
    );
    // Base 50 + Unvisited 15 + Morning tag 15 + Access 10 + Points 2 = 92
    expect(scoreMorning).toBe(92);

    const scoreEvening = recommendationService.calculateScore(
      morningLandmark,
      basePreferences,
      null,
      visitedIds,
      18, // 6 PM
      userPoints
    );
    // Base 50 + Unvisited 15 + Access 10 + Points 2 = 77
    expect(scoreEvening).toBe(77);
  });

  test('should handle Visitor Type Adaptation: Local vs Tourist', () => {
    const iconicLandmark = { ...baseLandmark, points: 50, tags: ['iconic'] };
    
    const touristScore = recommendationService.calculateScore(
      iconicLandmark,
      { ...basePreferences, visitor_type: 'tourist' },
      null,
      visitedIds,
      currentHour,
      userPoints
    );
    // Base 50 + Unvisited 15 + Tourist iconic bonus 15 + Access 10 + Points 10 = 100
    expect(touristScore).toBe(100);

    const localScore = recommendationService.calculateScore(
      iconicLandmark,
      { ...basePreferences, visitor_type: 'local' },
      null,
      visitedIds,
      currentHour,
      userPoints
    );
    // Base 50 + Unvisited 15 + Local crowd avoidance -15 + Access 10 + Points 10 = 70
    expect(localScore).toBe(70);
  });

  test('should handle Weather Adaptation: Rain and Indoor', () => {
    const indoorLandmark = { ...baseLandmark, is_indoor: true };
    const rainWeather = { isRaining: true };
    
    const scoreWithRain = recommendationService.calculateScore(
      indoorLandmark,
      basePreferences,
      rainWeather,
      visitedIds,
      currentHour,
      userPoints
    );
    // Base 50 + Unvisited 15 + Rain indoor bonus 15 + Midday indoor bonus 10 + Access 10 + Points 2 = 102 (caps at 100)
    expect(scoreWithRain).toBe(100);

    const scoreNoRain = recommendationService.calculateScore(
      indoorLandmark,
      basePreferences,
      { isRaining: false },
      visitedIds,
      currentHour,
      userPoints
    );
    // Base 50 + Unvisited 15 + Access 10 + Midday indoor bonus 10 + Points 2 = 87
    expect(scoreNoRain).toBe(87);
  });

  test('should handle Group Context: Kids', () => {
    const funLandmark = { ...baseLandmark, tags: ['fun', 'park'] };
    const kidsPrefs = { ...basePreferences, group_context: 'kids' };
    
    const score = recommendationService.calculateScore(
      funLandmark,
      kidsPrefs,
      null,
      visitedIds,
      currentHour,
      userPoints
    );
    // Base 50 + Unvisited 15 + Kids fun bonus 20 + Access 10 + Points 2 = 97
    expect(score).toBe(97);

    const steepLandmark = { ...baseLandmark, tags: ['steep-climb'] };
    const steepScore = recommendationService.calculateScore(
      steepLandmark,
      kidsPrefs,
      null,
      visitedIds,
      currentHour,
      userPoints
    );
    // Base 50 + Unvisited 15 - Kids steep penalty 20 + Access 10 + Points 2 = 57
    expect(steepScore).toBe(57);
  });

  test('should handle Adaptive Difficulty: New User', () => {
    const hiddenGem = { ...baseLandmark, tags: ['hidden-gem'] };
    const newUserScore = recommendationService.calculateScore(
      hiddenGem,
      basePreferences,
      null,
      visitedIds,
      currentHour,
      100 // New user points < 500
    );
    // Base 50 + Unvisited 15 - Hidden gem penalty for new user 10 + Access 10 + Points 2 = 67
    expect(newUserScore).toBe(67);

    const powerUserScore = recommendationService.calculateScore(
      hiddenGem,
      basePreferences,
      null,
      visitedIds,
      currentHour,
      3000 // Power user points > 2000
    );
    // Base 50 + Unvisited 15 + Hidden gem bonus for power user 20 + Access 10 + Points 2 = 97
    expect(powerUserScore).toBe(97);
  });
});
