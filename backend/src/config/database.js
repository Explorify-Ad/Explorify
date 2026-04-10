const { Pool } = require('pg');
require('dotenv').config();

/**
 * PostgreSQL connection pool.
 * Uses DATABASE_URL from environment for connection.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, 
  max: 10, // Reduced from 20 to avoid hitting Supabase free tier limits
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000, // Increased to 15s
});

// Test connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database Connection Error on Startup:', err.message);
  } else {
    console.log('Database Connection Verified at:', res.rows[0].now);
  }
});

// Log connection events
pool.on('connect', (client) => {
  console.log('New client connected to PostgreSQL pool');
});

pool.on('acquire', (client) => {
  console.log('Client acquired from pool');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client:', err.message);
});

/**
 * Execute a database query.
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<object>} Query result
 */
const query = async (text, params) => {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV === 'development') {
    console.log('Executed query', { text: text.substring(0, 80), duration: `${duration}ms`, rows: result.rowCount });
  }

  return result;
};

module.exports = { pool, query };
