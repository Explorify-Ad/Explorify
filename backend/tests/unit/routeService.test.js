const routeService = require('../../src/services/routeService');
const distanceUtils = require('../../src/utils/distance');

jest.mock('../../src/utils/distance');

describe('RouteService.buildRoute', () => {
  const start = { latitude: 53.3498, longitude: -6.2603 };
  const landmarks = [
    { id: 'l1', latitude: 53.3508, longitude: -6.2613, _score: 80, category: 'culture', avg_visit_duration_min: 30 },
    { id: 'l2', latitude: 53.3518, longitude: -6.2623, _score: 70, category: 'park', avg_visit_duration_min: 20 },
    { id: 'l3', latitude: 53.4000, longitude: -6.3000, _score: 90, category: 'nature', avg_visit_duration_min: 60 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock: return distance in km (simplified)
    distanceUtils.calculateDistance.mockImplementation((lat1, lon1, lat2, lon2) => {
      return Math.abs(lat2 - lat1) * 100 + Math.abs(lon2 - lon1) * 100;
    });
  });

  test('should respect time budget', () => {
    const route = routeService.buildRoute(start, landmarks, 60, {});
    // Walking time to l1 (~0.2km -> ~3 min) + l1 visit (30min) = 33min
    // Walking to l2 from l1 (~0.2km -> ~3 min) + l2 visit (20min) = 23min
    // Total 56min. l3 is too far.
    expect(route.length).toBe(2);
    expect(route[0].id).toBe('l1');
    expect(route[1].id).toBe('l2');
  });

  test('should handle battery sensitivity (low battery)', () => {
    // With 5% battery, only landmarks within 500m (0.5km) are allowed
    // l1 and l2 are close, l3 is far.
    const route = routeService.buildRoute(start, landmarks, 120, {}, 5);
    expect(route.every(l => l.id !== 'l3')).toBe(true);
  });

  test('should handle mobility constraints (elderly)', () => {
    // For elderly, leg distance is capped at 0.6km
    const farLandmarks = [
      { id: 'far', latitude: 53.4000, longitude: -6.3000, _score: 100, category: 'culture', avg_visit_duration_min: 30 }
    ];
    const route = routeService.buildRoute(start, farLandmarks, 120, { group_context: 'elderly' });
    expect(route.length).toBe(0);
  });

  test('should use learned pace and dwell multipliers', () => {
    const preferences = {
      walking_speed_kmh: 2.0, // Slow walker
      category_dwell_multipliers: { culture: 2.0 } // Spends double time in culture
    };
    const route = routeService.buildRoute(start, [landmarks[0]], 120, preferences);
    
    // Dist is ~0.2km. At 2km/h, walking takes 0.1h = 6 min.
    // Dwell in culture is 30 * 2 = 60 min.
    // Total time 66 min.
    expect(route.length).toBe(1);
    expect(route[0].estimated_arrival_min).toBe(6);
  });
});
