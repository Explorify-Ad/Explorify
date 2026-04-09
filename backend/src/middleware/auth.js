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
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
        },
      });
    }

    // Implicitly sign up/sync user to our local DB
    const existingUser = await query('SELECT id, preferences, total_points FROM users WHERE id = $1', [user.id]);
    let dbUser;
    
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

    // console.log('Auth middleware user:', user);
    req.user = {
      ...user,
      preferences: dbUser.preferences || {},
      totalPoints: dbUser.total_points || 0,
    };
    next();
  } catch (err) {
    console.error('Auth Middleware Error:', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication failed',
      },
    });
  }
};

module.exports = authenticate;
