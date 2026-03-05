const { Pool } = require('pg');
require('dotenv').config();

/**
 * PostgreSQL connection pool.
 * Uses DATABASE_URL from environment for connection.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log connection events
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client:', err);
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
