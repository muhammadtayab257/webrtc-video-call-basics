/**
 * PostgreSQL Database Connection
 */

const { Pool } = require('pg');

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test connection
pool.on('connect', () => {
  console.log('[DB] Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('[DB] PostgreSQL error:', err);
});

// Helper function for queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('[DB] Query executed:', { text: text.substring(0, 50), duration: `${duration}ms`, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('[DB] Query error:', error.message);
    throw error;
  }
};

// Get a client from the pool (for transactions)
const getClient = async () => {
  return await pool.connect();
};

module.exports = {
  pool,
  query,
  getClient
};
