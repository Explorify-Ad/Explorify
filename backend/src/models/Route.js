const { query } = require('../config/database');

/**
 * Route model - database operations for routes.
 */
class Route {
  /**
   * Create a new route.
   * @param {object} routeData - Route data
   * @returns {Promise<object>} Created route
   */
  static async create({ user_id, name, landmarks, total_distance_km, estimated_duration_min }) {
    const result = await query(
      `INSERT INTO routes (user_id, name, landmarks, total_distance_km, estimated_duration_min)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user_id, name, JSON.stringify(landmarks), total_distance_km, estimated_duration_min]
    );
    return result.rows[0];
  }

  /**
   * Find a route by ID.
   * @param {string} id - Route UUID
   * @returns {Promise<object|null>} Route or null
   */
  static async findById(id) {
    const result = await query('SELECT * FROM routes WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * Find all routes for a user.
   * @param {string} userId - User UUID
   * @returns {Promise<Array>} Array of routes
   */
  static async findByUserId(userId) {
    const result = await query(
      'SELECT * FROM routes WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  /**
   * Mark a route as completed.
   * @param {string} id - Route UUID
   * @returns {Promise<object|null>} Updated route or null
   */
  static async markCompleted(id) {
    const result = await query(
      `UPDATE routes SET is_completed = true, completed_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  }
}

module.exports = Route;
