const groupService = require('../../src/services/groupService');
const { query } = require('../../src/config/database');

jest.mock('../../src/config/database');

describe('GroupService.aggregatePreferences', () => {
  const members = {
    rows: [
      {
        preferences: {
          preferred_categories: ['culture'],
          preferred_tags: ['quiet'],
          accessibility_min: 1,
          walking_speed_kmh: 5.0,
          category_dwell_multipliers: { culture: 1.2 }
        },
        accessibility_needs: 0
      },
      {
        preferences: {
          preferred_categories: ['park'],
          preferred_tags: ['nature'],
          accessibility_min: 0,
          walking_speed_kmh: 3.0,
          category_dwell_multipliers: { park: 1.5 }
        },
        accessibility_needs: 2 // Higher wins because it's the limit
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should correctly aggregate preferences from multiple members', async () => {
    query.mockResolvedValue(members);

    const result = await groupService.aggregatePreferences('group123');

    // Categories and Tags should be Union
    expect(result.preferred_categories).toContain('culture');
    expect(result.preferred_categories).toContain('park');
    expect(result.preferred_tags).toContain('quiet');
    expect(result.preferred_tags).toContain('nature');

    // Accessibility: MAX of all members (needs or prefs)
    // Member 1: pref 1, need 0 -> 1
    // Member 2: pref 0, need 2 -> 2
    // MAX(1, 2) = 2
    expect(result.accessibility_min).toBe(2);

    // Walking Speed: MIN of all members
    // MIN(5.0, 3.0) = 3.0
    expect(result.walking_speed_kmh).toBe(3.0);

    // Dwell Multipliers: Average across group
    expect(result.category_dwell_multipliers.culture).toBe(1.2);
    expect(result.category_dwell_multipliers.park).toBe(1.5);
  });

  test('should return empty object if no members found', async () => {
    query.mockResolvedValue({ rows: [] });
    const result = await groupService.aggregatePreferences('emptyGroup');
    expect(result).toEqual({});
  });
});
