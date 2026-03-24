const { query } = require('../config/database');

/**
 * Get a user's collection of visited landmarks.
 */
const getUserCollection = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT c.*, l.name, l.category, l.points, l.description
       FROM collections c
       JOIN landmarks l ON c.landmark_id = l.id
       WHERE c.user_id = $1
       ORDER BY c.visited_at DESC`,
      [id]
    );

    // Calculate total points
    const totalPoints = result.rows.reduce((sum, row) => sum + (row.points || 0), 0);

    res.json({
      data: result.rows,
      total_points: totalPoints,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Add a landmark to user's collection.
 */
const addToCollection = async (req, res, next) => {
  try {
    const { landmark_id, dwell_time_min, rating, notes } = req.body;
    const userId = req.user.id;

    // TODO: Add input validation
    const result = await query(
      `INSERT INTO collections (user_id, landmark_id, dwell_time_min, rating, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, landmark_id, dwell_time_min, rating, notes]
    );

    // 2. Recalibrate dwell multipliers (Priority 8)
    if (dwell_time_min) {
      const userResult = await query('SELECT preferences FROM users WHERE id = $1', [userId]);
      const preferences = userResult.rows[0].preferences || {};
      const landmarkResult = await query('SELECT category, avg_visit_duration_min FROM landmarks WHERE id = $1', [landmark_id]);
      const { category, avg_visit_duration_min } = landmarkResult.rows[0];

      if (avg_visit_duration_min > 0) {
        const actualRatio = dwell_time_min / avg_visit_duration_min;
        const multipliers = preferences.category_dwell_multipliers || {};
        const oldMultiplier = multipliers[category] || 1.0;
        
        // Moving average: 80% old, 20% new
        multipliers[category] = (oldMultiplier * 0.8) + (actualRatio * 0.2);
        
        preferences.category_dwell_multipliers = multipliers;
        await query('UPDATE users SET preferences = $1 WHERE id = $2', [JSON.stringify(preferences), userId]);
      }
    }

    // 3. Update user points
    await query(
      `UPDATE users SET total_points = total_points + (
         SELECT points FROM landmarks WHERE id = $1
       ) WHERE id = $2`,
      [landmark_id, userId]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        error: {
          code: 'DUPLICATE',
          message: 'Landmark already in collection',
        },
      });
    }
    next(err);
  }
};

module.exports = { getUserCollection, addToCollection };
