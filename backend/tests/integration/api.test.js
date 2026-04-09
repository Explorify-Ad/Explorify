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

describe('Adaptive API Workflows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: Authenticated user
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'test@example.com' } }, error: null });
  });

  describe('Group Sync Workflow', () => {
    test('should create a group and return invite code', async () => {
      const mockGroup = { id: 'g1', invite_code: 'ABCDEF', created_by: 'u1' };
      query.mockResolvedValueOnce({ rows: [{ id: 'u1' }] }); // Auth middleware check
      query.mockResolvedValueOnce({ rows: [] }); // createGroup -> users insert
      query.mockResolvedValueOnce({ rows: [mockGroup] }); // createGroup -> groups insert
      query.mockResolvedValueOnce({ rows: [] }); // joinGroup -> users insert
      query.mockResolvedValueOnce({ rows: [] }); // joinGroup -> group_members insert

      const res = await request(app)
        .post('/api/groups')
        .set('Authorization', 'Bearer mock-token')
        .send({});
      
      expect(res.status).toBe(201);
      expect(res.body.data.invite_code).toBe('ABCDEF');
    });

    test('should aggregate group preferences', async () => {
      const mockMembers = {
        rows: [
          { preferences: { preferred_categories: ['culture'] }, accessibility_needs: 1 },
          { preferences: { preferred_categories: ['park'] }, accessibility_needs: 0 }
        ]
      };
      query.mockResolvedValueOnce({ rows: [{ id: 'u1' }] }); // Auth middleware
      query.mockResolvedValueOnce(mockMembers); // Group members

      const res = await request(app)
        .get('/api/groups/g1/preferences')
        .set('Authorization', 'Bearer mock-token');

      expect(res.status).toBe(200);
      expect(res.body.data.preferred_categories).toContain('culture');
      expect(res.body.data.preferred_categories).toContain('park');
    });
  });

  describe('Recommendation Workflow', () => {
    test('should return recommendations with group context', async () => {
      const mockLandmarks = {
        rows: [
          { id: 'l1', name: 'Museum', category: 'culture', tags: ['quiet'], points: 10 }
        ]
      };
      query.mockResolvedValueOnce(mockLandmarks); // Landmarks
      query.mockResolvedValueOnce({ rows: [] }); // User points
      query.mockResolvedValueOnce({ rows: [] }); // Visited

      const res = await request(app)
        .get('/api/landmarks/recommendations')
        .query({ lat: 53.3498, lng: -6.2603, preferences: JSON.stringify({ group_context: 'kids' }) });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data[0].id).toBe('l1');
    });
  });
});
