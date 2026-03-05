const { query } = require('../config/database');

/**
 * User model - database operations for users.
 */
class User {
  /**
   * Find a user by ID.
   * @param {string} id - User UUID
   * @returns {Promise<object|null>} User or null
   */
  static async findById(id) {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * Find a user by email.
   * @param {string} email - User email
   * @returns {Promise<object|null>} User or null
   */
  static async findByEmail(email) {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  /**
   * Create a new user.
   * @param {object} userData - User data
   * @returns {Promise<object>} Created user
   */
  static async create({ email, display_name, preferences, accessibility_needs }) {
    const result = await query(
      `INSERT INTO users (email, display_name, preferences, accessibility_needs)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [email, display_name, JSON.stringify(preferences || {}), accessibility_needs || 0]
    );
    return result.rows[0];
  }

  /**
   * Update a user.
   * @param {string} id - User UUID
   * @param {object} updates - Fields to update
   * @returns {Promise<object|null>} Updated user or null
   */
  static async update(id, updates) {
    const { display_name, preferences, accessibility_needs } = updates;
    const result = await query(
      `UPDATE users
       SET display_name = COALESCE($1, display_name),
           preferences = COALESCE($2, preferences),
           accessibility_needs = COALESCE($3, accessibility_needs)
       WHERE id = $4 RETURNING *`,
      [display_name, preferences ? JSON.stringify(preferences) : null, accessibility_needs, id]
    );
    return result.rows[0] || null;
  }
}

module.exports = User;
