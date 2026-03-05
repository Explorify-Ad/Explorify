const { query } = require('../config/database');

/**
 * Landmark model - database operations for landmarks.
 */
class Landmark {
  /**
   * Find all landmarks with optional filters.
   * @param {object} filters - Query filters
   * @returns {Promise<Array>} Array of landmarks
   */
  static async findAll(filters = {}) {
    let sql = 'SELECT * FROM landmarks WHERE 1=1';
    const params = [];
    let idx = 1;

    if (filters.category) {
      sql += ` AND category = $${idx++}`;
      params.push(filters.category);
    }

    if (filters.accessibility_min) {
      sql += ` AND accessibility_level >= $${idx++}`;
      params.push(filters.accessibility_min);
    }

    if (filters.is_indoor !== undefined) {
      sql += ` AND is_indoor = $${idx++}`;
      params.push(filters.is_indoor);
    }

    sql += ' ORDER BY name';
    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Find a landmark by ID.
   * @param {string} id - Landmark UUID
   * @returns {Promise<object|null>} Landmark or null
   */
  static async findById(id) {
    const result = await query('SELECT * FROM landmarks WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * Find landmarks within a radius of a point.
   * @param {number} lat - Center latitude
   * @param {number} lng - Center longitude
   * @param {number} radiusKm - Search radius in kilometers
   * @returns {Promise<Array>} Nearby landmarks
   */
  static async findNearby(lat, lng, radiusKm = 5) {
    // TODO: Implement PostGIS or Haversine formula in SQL
    const result = await query('SELECT * FROM landmarks');
    return result.rows;
  }
}

module.exports = Landmark;
