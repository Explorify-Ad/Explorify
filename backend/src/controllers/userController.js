const { query } = require('../config/database');

/**
 * Get user profile by ID.
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * Update user profile.
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { display_name, preferences, accessibility_needs } = req.body;

    // TODO: Add input validation
    const result = await query(
      `UPDATE users 
       SET display_name = COALESCE($1, display_name),
           preferences = COALESCE($2, preferences),
           accessibility_needs = COALESCE($3, accessibility_needs)
       WHERE id = $4
       RETURNING *`,
      [display_name, preferences ? JSON.stringify(preferences) : null, accessibility_needs, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { getUserById, updateUser };
