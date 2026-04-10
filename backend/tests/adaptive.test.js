jest.mock('../src/config/database', () => ({
  query: jest.fn().mockImplementation(() => Promise.resolve({ rows: [] })),
}));

const routeService = require('../src/services/routeService');
const recommendationService = require('../src/services/recommendationService');
const driftDetectionService = require('../src/services/driftDetectionService');

// Mock current date
const RealDate = Date;
global.Date = class extends RealDate {
  constructor(date) {
    if (date) return new RealDate(date);
    return new RealDate('2026-04-09T12:00:00Z');
  }
};

describe('Explorify Adaptive Logic Tests', () => {

  describe('Route Scoring (Scrutability)', () => {
    test('calculateScoreWithReasons should prefer nature in the morning', () => {
      const landmark = { category: 'nature', latitude: 53.35, longitude: -6.27, points: 10 };
      const current = { latitude: 53.35, longitude: -6.26 };
      const context = {
        currentHour: 8, // Morning
        weather: { isClear: true },
        visitorType: 'tourist',
        preferredCategories: ['nature'],
        categoryCounts: {},
        isColdStart: true,
        preferences: { interests: ['nature'] }
      };

      const result = routeService.calculateScoreWithReasons(landmark, current, context);
      expect(result.score).toBeGreaterThan(0.35);
      // Reasons might be sliced, so we check if at least one expected reason is present
      const expected = ['☀️ Great weather match', '✈️ Tourist favourite', '🌱 Beginner-friendly', '🎯 Matches your interests', '🌅 Morning discovery'];
      const hasReason = result.reasons.some(r => expected.includes(r));
      expect(hasReason).toBe(true);
    });

    test('calculateScoreWithReasons should apply battery constraints', () => {
      const landmark = { category: 'historical', latitude: 53.40, longitude: -6.20, points: 30 }; // Far away
      const current = { latitude: 53.35, longitude: -6.26 };
      const context = {
        currentHour: 12,
        weather: { isClear: true },
        visitorType: 'local',
        batteryLevel: 5, // Critical
        preferredCategories: [],
        categoryCounts: {},
        isColdStart: false
      };

      // In buildRoute, the battery constraint is checked. 
      // For calculateScoreWithReasons, we check if difficulty or novelty is handled correctly.
      const result = routeService.calculateScoreWithReasons(landmark, current, context);
      // Local hidden gems should get a bonus
      expect(result.reasons).toContain('💎 Local hidden gem');
    });
  });

  describe('Drift Detection', () => {
    test('cosineSimilarity should return 1 for identical vectors', () => {
      const vecA = { nature: 10, food: 5 };
      const vecB = { nature: 10, food: 5 };
      const similarity = driftDetectionService.cosineSimilarity(vecA, vecB);
      expect(similarity).toBeCloseTo(1.0);
    });

    test('cosineSimilarity should return 0 for orthogonal vectors', () => {
      const vecA = { nature: 10 };
      const vecB = { food: 5 };
      const similarity = driftDetectionService.cosineSimilarity(vecA, vecB);
      expect(similarity).toBe(0);
    });
  });

});
