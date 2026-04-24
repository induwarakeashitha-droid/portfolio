const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const schema = `
CREATE TABLE IF NOT EXISTS admins (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL,
  service    VARCHAR(150),
  budget     VARCHAR(100),
  timeline   VARCHAR(100),
  message    TEXT NOT NULL,
  is_read    BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  client      VARCHAR(200),
  type        VARCHAR(100),
  status      VARCHAR(50) DEFAULT 'in progress',
  price       VARCHAR(50),
  live_url    VARCHAR(300),
  description TEXT,
  featured    BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(200) NOT NULL,
  email      VARCHAR(150),
  industry   VARCHAR(100),
  status     VARCHAR(50) DEFAULT 'active',
  spent      VARCHAR(50) DEFAULT '$0',
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pricing (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  standard    INTEGER NOT NULL,
  current     INTEGER NOT NULL,
  popular     BOOLEAN DEFAULT false
);

INSERT INTO pricing (name, description, standard, current, popular) VALUES
  ('Starter',      'Landing page - 7-day delivery',     49,  25,  false),
  ('Growth',       'Full website - 14-day delivery',    199, 99,  true),
  ('Professional', 'Web application - 30-day delivery', 499, 249, false)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS settings (
  key   VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO settings (key, value) VALUES
  ('founding_discount', '50'),
  ('founding_spots',    '9'),
  ('offer_active',      'true'),
  ('offer_message',     'First 10 customers get 50% OFF any plan')
ON CONFLICT DO NOTHING;
`;

async function run() {
    try {
        console.log("Connecting to database...");
        await pool.query(schema);
        console.log("Schema created successfully ✅");
        console.log("All tables: admins, messages, projects, clients, pricing, settings");
    } catch (err) {
        console.error("Schema creation failed ❌", err.message);
    } finally {
        await pool.end();
        process.exit();
    }
}

run();