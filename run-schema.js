const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const query = `
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
`;

async function run() {
    try {
        await pool.query(query);
        console.log("Schema created ✅");
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

run();