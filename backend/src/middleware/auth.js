const supabase = require('../config/supabase');
const { query } = require('../config/database');

/**
 * Authentication middleware.
 * Verifies JWT token from the Authorization header.
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header',
        },
      });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('Auth verification failed:', error?.message || 'No user found');
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
        },
      });
    }

    // Implicitly sign up/sync user to our local DB
    // RESILIENCE: If DB connection times out, we still let the user proceed as we have valid Supabase Auth
    let dbUser = { preferences: {}, total_points: 0 };
    try {
      const existingUser = await query('SELECT id, preferences, total_points FROM users WHERE id = $1', [user.id]);
      
      if (existingUser.rows.length === 0) {
        // Create user record in our DB
        const displayName = user.email ? user.email.split('@')[0] : 'User';
        const result = await query(
          'INSERT INTO users (id, email, display_name) VALUES ($1, $2, $3) RETURNING *',
          [user.id, user.email || 'test@example.com', displayName]
        );
        dbUser = result.rows[0];
      } else {
        dbUser = existingUser.rows[0];
      }
    } catch (dbErr) {
      console.warn('Auth Middleware: DB sync failed but proceeding with Supabase Auth:', dbErr.message);
      // We continue since user is authenticated by Supabase. 
      // This is crucial for university networks where DB ports might be intermittently blocked.
    }

    req.user = {
      ...user,
      preferences: dbUser.preferences || {},
      totalPoints: dbUser.total_points || 0,
    };
    next();
  } catch (err) {
    console.error('Auth Middleware Critical Error:', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication service encountered a critical error',
      },
    });
  }
};

module.exports = authenticate;
