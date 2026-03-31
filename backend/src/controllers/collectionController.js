const { query } = require('../config/database');
const QuestService = require('../services/questService');

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
 * Add a landmark to user's collection (Check-in).
 */
const addToCollection = async (req, res, next) => {
  try {
    const { landmark_id, dwell_time_min, rating, notes } = req.body;
    const userId = req.user.id;

    // Check if landmark exists
    const landmarkResult = await query('SELECT * FROM landmarks WHERE id = $1', [landmark_id]);
    if (landmarkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Landmark not found' });
    }

    const landmark = landmarkResult.rows[0];

    // Check if already in collection
    const exists = await query(
      'SELECT * FROM collections WHERE user_id = $1 AND landmark_id = $2',
      [userId, landmark_id]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({ error: 'Already visited this landmark' });
    }

    // 1. Add to collection
    const checkInResult = await query(
      `INSERT INTO collections (user_id, landmark_id, dwell_time_min, rating, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, landmark_id, dwell_time_min, rating, notes]
    );

    // 2. Update user total points
    await query(
      'UPDATE users SET total_points = total_points + $1 WHERE id = $2',
      [landmark.points || 150, userId]
    );

    // 3. Adaptive Feedback: Boost themes if rating is high
    if (rating && rating >= 4) {
      const category = landmark.category;
      // Boost the weight of this category in user preferences (Simple DNA refinement)
      await query(
        `UPDATE users 
         SET preferences = jsonb_set(
           preferences, 
           '{interests}', 
           (CASE 
              WHEN preferences->'interests' ? $1 THEN preferences->'interests'
              ELSE (preferences->'interests') || jsonb_build_array($1)
            END)
         )
         WHERE id = $2`,
        [category, userId]
      );
    }

    // 4. Update behavioral learning (Dwell Time)
    if (dwell_time_min) {
      const category = landmark.category;
      const baseDuration = landmark.avg_visit_duration_min || 30;
      const actualRatio = dwell_time_min / baseDuration;
      
      await query(
        `UPDATE users 
         SET preferences = jsonb_set(
           preferences, 
           '{category_dwell_multipliers, ${category}}', 
           to_jsonb(COALESCE((preferences->'category_dwell_multipliers'->>'${category}')::float * 0.8 + $1 * 0.2, $1))
         )
         WHERE id = $2`,
        [actualRatio, userId]
      );
    }

    // 5. Trigger Quest & Community logic
    const outcomes = await QuestService.handleCheckIn(userId, landmark);

    res.status(201).json({ 
      message: 'Check-in successful',
      data: checkInResult.rows[0],
      outcomes: outcomes 
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Landmark already in collection' });
    }
    next(err);
  }
};

module.exports = { getUserCollection, addToCollection };
