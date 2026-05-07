// Mock all external dependencies BEFORE requiring the module under test
jest.mock('../../src/config/database', () => ({ query: jest.fn() }));
jest.mock('../../src/services/weatherService', () => ({ getCurrentWeather: jest.fn() }));
jest.mock('../../src/services/recommendationService', () => ({
  buildActiveAdaptations: jest.fn(() => []),
}));
jest.mock('../../src/utils/distance');

const routeService = require('../../src/services/routeService');
const distanceUtils = require('../../src/utils/distance');

describe('RouteService.buildRoute', () => {
  const start = { latitude: 53.3498, longitude: -6.2603 };

  const landmarks = [
    { id: 'l1', latitude: 53.3508, longitude: -6.2613, _score: 80, category: 'culture', avg_visit_duration_min: 30, points: 10, tags: [], is_indoor: false, accessibility_level: 1 },
    { id: 'l2', latitude: 53.3518, longitude: -6.2623, _score: 70, category: 'park',    avg_visit_duration_min: 20, points: 10, tags: [], is_indoor: false, accessibility_level: 1 },
    { id: 'l3', latitude: 53.4000, longitude: -6.3000, _score: 90, category: 'nature',  avg_visit_duration_min: 60, points: 10, tags: [], is_indoor: false, accessibility_level: 1 },
  ];

  // Default context passed to buildRoute
  const baseContext = {
    walking_speed_kmh: 4.5,
    dwellTimes: null,
    batteryLevel: 100,
    groupContext: null,
    currentHour: 12,
    weather: null,
    visitorType: 'tourist',
    totalPoints: 500,
    preferredCategories: [],
    categoryCounts: null,
    isColdStart: false,
    preferences: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Simplified distance mock: flat-earth by lat/lon delta (returns km)
    distanceUtils.calculateDistance.mockImplementation((lat1, lon1, lat2, lon2) => {
      return Math.abs(lat2 - lat1) * 100 + Math.abs(lon2 - lon1) * 100;
    });
  });

  test('should respect time budget', () => {
    // l1: dist ≈ 0.2km → walk ≈ 2.7min + 30min dwell = 32.7min
    // l2: dist from l1 ≈ 0.2km → walk ≈ 2.7min + 20min dwell = 22.7min → total ≈ 55.4min
    // l3: dist ≈ 10km → walk ≈ 133min → exceeds 60min budget
    const route = routeService.buildRoute(start, landmarks, 60, baseContext);
    expect(route.length).toBe(2);
    expect(route.map(r => r.id)).toContain('l1');
    expect(route.map(r => r.id)).toContain('l2');
    expect(route.map(r => r.id)).not.toContain('l3');
  });

  test('should handle low battery constraint (< 10%) — skip far landmarks', () => {
    const criticalBatteryContext = { ...baseContext, batteryLevel: 5 };
    // l3 is ~10km away, exceeds 0.5km battery threshold
    const route = routeService.buildRoute(start, landmarks, 120, criticalBatteryContext);
    expect(route.every(l => l.id !== 'l3')).toBe(true);
  });

  test('should handle mobility constraints (elderly) — skip landmarks > 0.6km away', () => {
    const farLandmarks = [
      { id: 'far', latitude: 53.4000, longitude: -6.3000, _score: 100, category: 'culture',
        avg_visit_duration_min: 30, points: 10, tags: [], is_indoor: false, accessibility_level: 1 },
    ];
    const elderlyContext = { ...baseContext, groupContext: 'elderly' };
    // farLandmark is ~10km away, exceeds 0.6km mobility cap
    const route = routeService.buildRoute(start, farLandmarks, 120, elderlyContext);
    expect(route.length).toBe(0);
  });

  test('should use learned walking pace to calculate arrival time', () => {
    const slowContext = { ...baseContext, walking_speed_kmh: 2.0 };
    // l1 dist ≈ 0.2km. At 2km/h → walk ≈ 6min → estimated_arrival_min should be 6
    const route = routeService.buildRoute(start, [landmarks[0]], 120, slowContext);
    expect(route.length).toBe(1);
    expect(route[0].estimated_arrival_min).toBe(6);
  });

  test('should attach scrutability reasons array to each waypoint', () => {
    const route = routeService.buildRoute(start, [landmarks[0]], 120, baseContext);
    expect(route.length).toBe(1);
    expect(Array.isArray(route[0].reasons)).toBe(true);
  });

  test('should apply visited penalty and still include landmark if no alternatives', () => {
    const visitedIds = new Set(['l1']);
    const route = routeService.buildRoute(start, [landmarks[0]], 120, baseContext, visitedIds);
    // l1 is the only option, so it still gets selected despite the penalty
    expect(route.length).toBe(1);
  });

  test('should prefer unvisited landmarks over visited ones', () => {
    const visitedIds = new Set(['l3']); // l3 visited, l1/l2 not
    const route = routeService.buildRoute(start, landmarks, 120, baseContext, visitedIds);
    // l1 and l2 should appear; l3 might not (far away AND visited penalty)
    expect(route.some(r => r.id === 'l1' || r.id === 'l2')).toBe(true);
  });
});
