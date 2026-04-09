jest.mock('../../src/config/database');
jest.mock('../../src/services/weatherService');
jest.mock('../../src/config/supabase', () => ({
  auth: {
    getUser: jest.fn()
  }
}));

const request = require('supertest');
const app = require('../../src/server');
const { query } = require('../../src/config/database');
const supabase = require('../../src/config/supabase');
const recommendationService = require('../../src/services/recommendationService');

describe('Explorify API Integrations', () => {
  const mockUser = { id: 'u1', email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });
  });

  describe('Adaptive Routing & Recommendations (/api/landmarks)', () => {
    test('should return recommendations with valid structure and tags', async () => {
      const mockLandmarks = {
        rows: [
          { id: 'l1', name: 'Museum', category: 'cultural', tags: ['iconic', 'popular'], points: 20 },
          { id: 'l2', name: 'Park', category: 'nature', tags: ['scenic', 'quiet'], points: 10 }
        ]
      };
      
      query.mockImplementation((sql, params) => {
        if (sql.includes('SELECT * FROM landmarks')) return Promise.resolve(mockLandmarks);
        if (sql.includes('total_points')) return Promise.resolve({ rows: [{ total_points: 100, preferences: {} }] });
        if (sql.includes('collections')) return Promise.resolve({ rows: [] });
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .get('/api/landmarks/recommendations')
        .set('Authorization', 'Bearer test-token')
        .query({ lat: 53.3498, lng: -6.2603, preferences: JSON.stringify({ visitor_type: 'tourist' }) });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0]).toHaveProperty('score');
      expect(res.body.data[0]).toHaveProperty('reasons');
      expect(res.body.data[0]._activeAdaptations).toBeDefined(); // Scrutability check
    });
  });

  describe('Check-ins and Collections (/api/collections)', () => {
    test('should award XP and persist check-in securely', async () => {
      query.mockImplementation((sql, params) => {
        // Handle auth middleware query
        if (sql.includes('SELECT id, preferences, total_points FROM users WHERE id')) return Promise.resolve({ rows: [{ id: 'u1', preferences: {}, total_points: 100 }] });
        if (sql.includes('INSERT INTO users')) return Promise.resolve({ rows: [{ id: 'u1', preferences: {}, total_points: 100 }] });
        
        if (sql.includes('landmarks WHERE id')) return Promise.resolve({ rows: [{ id: 'l1', name: 'Museum', tier: 'public', points: 15 }] });
        if (sql.includes('INSERT INTO collections')) return Promise.resolve({ rows: [{ id: 'c1', xp_earned: 15 }] });
        if (sql.includes('UPDATE users')) return Promise.resolve({ rows: [] });
        if (sql.includes('SELECT * FROM quests')) return Promise.resolve({ rows: [] });
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .post('/api/collections')
        .set('Authorization', 'Bearer mock-token')
        .send({ landmark_id: 'l1', dwell_time_min: 30 });

      expect(res.status).toBe(201);
      expect(res.body.data.xp_earned).toBeGreaterThan(0);
    });
  });

  describe('Social & Group Sync (/api/groups & messages)', () => {
    test('should create a group and return invite code', async () => {
      query.mockImplementation((sql) => {
        if (sql.includes('users WHERE id')) return Promise.resolve({ rows: [{ id: 'u1', preferences: {}, total_points: 100 }] });
        if (sql.includes('INSERT INTO users')) return Promise.resolve({ rows: [{ id: 'u1', preferences: {}, total_points: 100 }] });
        if (sql.includes('INSERT INTO groups')) return Promise.resolve({ rows: [{ id: 'g1', invite_code: 'TESTCODE' }] });
        return Promise.resolve({ rows: [] });
      });

      const res = await request(app)
        .post('/api/groups')
        .set('Authorization', 'Bearer mock-token')
        .send({ name: 'Test Group' });
      
      expect(res.status).toBe(201);
      expect(res.body.data.invite_code).toBeDefined();
    });
  });
});
