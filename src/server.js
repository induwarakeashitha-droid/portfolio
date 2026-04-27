require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const path       = require('path');

const app = express();

// ── Security ────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,  // Allow inline scripts/styles in HTML pages
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman, server-to-server)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:5500',  // VS Code Live Server
      'https://portfolio-production-a4ca.up.railway.app',
    ];

    // Also allow any origin set via environment variable
    if (process.env.FRONTEND_URL) {
      allowedOrigins.push(process.env.FRONTEND_URL);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(null, true); // Allow all origins in production for now
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '2mb' }));

// ── Routes ──────────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/messages',  require('./routes/messages'));
app.use('/api/projects',  require('./routes/projects'));
app.use('/api/clients',   require('./routes/clients'));
app.use('/api/pricing',   require('./routes/pricing'));
app.use('/api/dashboard', require('./routes/dashboard'));

// ── One-time DB setup (creates tables) ──────────────────────────────
app.post('/setup-db', async (req, res) => {
  const { secret, sql } = req.body;
  if (secret !== process.env.SETUP_SECRET)
    return res.status(403).json({ error: 'Invalid setup secret.' });

  const db = require('./db');

  if (sql) {
    try {
      const result = await db.query(sql);
      return res.json({ success: true, rows: result.rows });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  const schema = `
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY, email VARCHAR(150) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, email VARCHAR(150) NOT NULL,
      service VARCHAR(150), budget VARCHAR(100), timeline VARCHAR(100),
      message TEXT NOT NULL, is_read BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY, name VARCHAR(200) NOT NULL, client VARCHAR(200),
      type VARCHAR(100), status VARCHAR(50) DEFAULT 'in progress', price VARCHAR(50),
      live_url VARCHAR(300), description TEXT, featured BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY, name VARCHAR(200) NOT NULL, email VARCHAR(150),
      industry VARCHAR(100), status VARCHAR(50) DEFAULT 'active',
      spent VARCHAR(50) DEFAULT '$0', notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS pricing (
      id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, description TEXT,
      standard INTEGER NOT NULL, current INTEGER NOT NULL, popular BOOLEAN DEFAULT false
    );
    INSERT INTO pricing (name, description, standard, current, popular) VALUES
      ('Starter', 'Landing page - 7-day delivery', 49, 25, false),
      ('Growth', 'Full website - 14-day delivery', 199, 99, true),
      ('Professional', 'Web application - 30-day delivery', 499, 249, false)
    ON CONFLICT DO NOTHING;
    CREATE TABLE IF NOT EXISTS settings (
      key VARCHAR(100) PRIMARY KEY, value TEXT NOT NULL
    );
    INSERT INTO settings (key, value) VALUES
      ('founding_discount', '50'), ('founding_spots', '9'),
      ('offer_active', 'true'), ('offer_message', 'First 10 customers get 50% OFF any plan')
    ON CONFLICT DO NOTHING;
  `;
  try {
    await db.query(schema);
    res.json({ success: true, message: 'All tables created successfully.' });
  } catch (err) {
    console.error('Setup DB error:', err.message);
    res.status(500).json({ error: 'Failed to create tables: ' + err.message });
  }
});

// ── Health check ────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ── Serve frontend static files ─────────────────────────────────────
const publicDir = path.join(__dirname, '..');
app.use(express.static(publicDir, {
  index: 'index.html',
  extensions: ['html'],
}));

// ── Fallback: serve index.html for non-API routes (SPA support) ─────
app.use((req, res, next) => {
  // If it's an API route that wasn't matched, return 404 JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Route not found.' });
  }
  // For all other routes, serve index.html
  res.sendFile(path.join(publicDir, 'index.html'));
});

// ── Error handler ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ error: 'Internal server error.' });
});

// ── Graceful handling of unhandled rejections ───────────────────────
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// ── Start ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════╗
  ║   AURA Backend running ✓        ║
  ║   Port: ${PORT}                    ║
  ╚══════════════════════════════════╝
  `);
});
