const { query } = require('../config/database');

/**
 * Collection model - database operations for user collections.
 */
class Collection {
  /**
   * Add a landmark to a user's collection.
   * @param {object} data - Collection entry data
   * @returns {Promise<object>} Created collection entry
   */
  static async create({ user_id, landmark_id, dwell_time_min, rating, notes }) {
    const result = await query(
      `INSERT INTO collections (user_id, landmark_id, dwell_time_min, rating, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user_id, landmark_id, dwell_time_min, rating, notes]
    );
    return result.rows[0];
  }

  /**
   * Get all collection entries for a user.
   * @param {string} userId - User UUID
   * @returns {Promise<Array>} Array of collection entries with landmark details
   */
  static async findByUserId(userId) {
    const result = await query(
      `SELECT c.*, l.name, l.category, l.points, l.description
       FROM collections c
       JOIN landmarks l ON c.landmark_id = l.id
       WHERE c.user_id = $1
       ORDER BY c.visited_at DESC`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Check if a user has visited a specific landmark.
   * @param {string} userId - User UUID
   * @param {string} landmarkId - Landmark UUID
   * @returns {Promise<boolean>} Whether the landmark is in the collection
   */
  static async exists(userId, landmarkId) {
    const result = await query(
      'SELECT 1 FROM collections WHERE user_id = $1 AND landmark_id = $2',
      [userId, landmarkId]
    );
    return result.rows.length > 0;
  }
}

module.exports = Collection;
