const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Get all landmarks with optional filtering.
 */
const getAllLandmarks = async (req, res, next) => {
  try {
    const { category, accessibility, indoor, limit = 50, offset = 0 } = req.query;

    let sql = 'SELECT * FROM landmarks WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (category) {
      sql += ` AND category = $${paramIndex++}`;
      params.push(category);
    }

    if (accessibility) {
      sql += ` AND accessibility_level >= $${paramIndex++}`;
      params.push(parseInt(accessibility, 10));
    }

    if (indoor !== undefined) {
      sql += ` AND is_indoor = $${paramIndex++}`;
      params.push(indoor === 'true');
    }

    sql += ` ORDER BY name LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const result = await query(sql, params);

    // Get total count
    const countResult = await query('SELECT COUNT(*) FROM landmarks');

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get a single landmark by ID.
 */
const getLandmarkById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM landmarks WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Landmark not found',
        },
      });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllLandmarks, getLandmarkById };
