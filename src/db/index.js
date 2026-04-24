const { Pool } = require('pg');

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host:     process.env.DB_HOST,
        port:     process.env.DB_PORT || 5432,
        database: process.env.DB_NAME,
        user:     process.env.DB_USER,
        password: process.env.DB_PASS,
      }
);

// Log connection status
pool.on('connect', () => console.log('✓ Database connected'));
pool.on('error', (err) => console.error('✗ DB pool error:', err.message));

// Test the connection on startup
pool.query('SELECT NOW()')
  .then(() => console.log('✓ Database connection verified'))
  .catch((err) => console.error('✗ Database connection failed:', err.message));

module.exports = {
  query:  (text, params) => pool.query(text, params),
  client: () => pool.connect(),
};
