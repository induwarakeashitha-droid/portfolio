// ═══════════════════════════════════════════════════════════════════
//  AURA BACKEND — Node.js + Express + PostgreSQL
//  Run: npm run dev   →   http://localhost:4000
// ═══════════════════════════════════════════════════════════════════

// ── PACKAGE.JSON (create this first) ────────────────────────────────
/*
{
  "name": "aura-backend",
  "version": "1.0.0",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "dotenv": "^16.3.1",
    "nodemailer": "^6.9.7",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
*/

// ── .ENV (create in root, NEVER commit to git) ────────────────────
/*
PORT=4000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=aura_db
DB_USER=postgres
DB_PASS=your_postgres_password_here

EMAIL_USER=yourgmail@gmail.com
EMAIL_PASS=your_16_char_app_password

JWT_SECRET=aura_jwt_super_secret_key_change_this_in_production_2025
SETUP_SECRET=aura_setup_once_then_delete_from_env
*/

// ── SCHEMA.SQL (run once: psql -U postgres -d aura_db -f schema.sql)
/*
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
  id       SERIAL PRIMARY KEY,
  name     VARCHAR(100) NOT NULL,
  description TEXT,
  standard INTEGER NOT NULL,
  current  INTEGER NOT NULL,
  popular  BOOLEAN DEFAULT false
);

INSERT INTO pricing (name, description, standard, current, popular) VALUES
  ('Starter',      'Landing page — 7-day delivery',       49,  25,  false),
  ('Growth',       'Full website — 14-day delivery',      199, 99,  true),
  ('Professional', 'Web application — 30-day delivery',   499, 249, false)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS settings (
  key   VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO settings (key, value) VALUES
  ('founding_discount', '50'),
  ('founding_spots', '9'),
  ('offer_active', 'true'),
  ('offer_message', 'First 10 customers get 50% OFF any plan')
ON CONFLICT DO NOTHING;
*/

// ════════════════════════════════════════════════════════════════════
//  SRC/DB/INDEX.JS
// ════════════════════════════════════════════════════════════════════

const dbModule = `
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

pool.on('error', (err) => console.error('DB pool error:', err));

module.exports = {
  query:  (text, params) => pool.query(text, params),
  client: () => pool.connect(),
};
`;

// ════════════════════════════════════════════════════════════════════
//  SRC/MIDDLEWARE/AUTH.JS
// ════════════════════════════════════════════════════════════════════

const authMiddleware = `
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const header = req.headers['authorization'];
  const token  = header && header.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required.' });
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ error: 'Token invalid or expired.' });
  }
};
`;

// ════════════════════════════════════════════════════════════════════
//  SRC/ROUTES/AUTH.JS
// ════════════════════════════════════════════════════════════════════

const authRoutes = `
const router   = require('express').Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const db       = require('../db');

// POST /api/auth/register — run ONCE to create admin account
// Body: { email, password, secret }
router.post('/register', async (req, res) => {
  const { email, password, secret } = req.body;
  if (secret !== process.env.SETUP_SECRET)
    return res.status(403).json({ error: 'Invalid setup secret.' });
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required.' });
  try {
    const hash = await bcrypt.hash(password, 12);
    await db.query('INSERT INTO admins (email, password_hash) VALUES ($1, $2)', [email, hash]);
    res.json({ success: true, message: 'Admin account created. Remove SETUP_SECRET from .env now.' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Admin already exists.' });
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/auth/login
// Body: { email, password }
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required.' });
  try {
    const { rows } = await db.query('SELECT * FROM admins WHERE email = $1', [email]);
    const admin = rows[0];
    if (!admin || !(await bcrypt.compare(password, admin.password_hash)))
      return res.status(401).json({ error: 'Invalid credentials.' });
    const token = jwt.sign(
      { id: admin.id, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, email: admin.email });
  } catch {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/auth/me — verify token
router.get('/me', require('../middleware/auth'), (req, res) => {
  res.json({ id: req.admin.id, email: req.admin.email });
});

module.exports = router;
`;

// ════════════════════════════════════════════════════════════════════
//  SRC/ROUTES/MESSAGES.JS
// ════════════════════════════════════════════════════════════════════

const messagesRoutes = `
const router   = require('express').Router();
const rateLimit= require('express-rate-limit');
const nodemailer=require('nodemailer');
const db       = require('../db');
const auth     = require('../middleware/auth');

const limiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: { error: 'Too many submissions. Try again in an hour.' } });

const mail = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

// POST /api/messages — public (contact form submission)
router.post('/', limiter, async (req, res) => {
  const { name, email, service, budget, timeline, message } = req.body;
  if (!name || !email || !message)
    return res.status(400).json({ error: 'Name, email, and message are required.' });

  try {
    await db.query(
      'INSERT INTO messages (name, email, service, budget, timeline, message) VALUES ($1,$2,$3,$4,$5,$6)',
      [name, email, service, budget, timeline, message]
    );

    // Email to YOU
    await mail.sendMail({
      from: process.env.EMAIL_USER,
      to:   process.env.EMAIL_USER,
      subject: \`🌟 New AURA enquiry from \${name}\`,
      replyTo: email,
      html: \`<div style="font-family:sans-serif;max-width:600px;padding:24px">
        <h2 style="color:#38f0c4">New Enquiry — AURA</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px 0;color:#666;width:120px"><b>Name</b></td><td>\${name}</td></tr>
          <tr><td style="padding:8px 0;color:#666"><b>Email</b></td><td><a href="mailto:\${email}">\${email}</a></td></tr>
          <tr><td style="padding:8px 0;color:#666"><b>Service</b></td><td>\${service || 'Not specified'}</td></tr>
          <tr><td style="padding:8px 0;color:#666"><b>Budget</b></td><td>\${budget || 'Not specified'}</td></tr>
          <tr><td style="padding:8px 0;color:#666"><b>Timeline</b></td><td>\${timeline || 'Not specified'}</td></tr>
        </table>
        <hr style="margin:16px 0"/>
        <h3>Message</h3>
        <p style="background:#f5f5f5;padding:16px;border-radius:8px">\${message}</p>
        <p style="color:#999;font-size:12px">Reply directly to this email to respond to the client.</p>
      </div>\`,
    });

    // Auto-reply to client
    await mail.sendMail({
      from:    process.env.EMAIL_USER,
      to:      email,
      subject: 'We received your message — AURA Studio',
      html: \`<div style="font-family:sans-serif;max-width:560px;background:#04060f;color:#f0eeff;padding:32px;border-radius:12px">
        <h2 style="color:#38f0c4;letter-spacing:.1em">AURA</h2>
        <p>Hi \${name},</p>
        <p>Thanks for reaching out! We've received your message and will reply within 24 hours.</p>
        <p>In the meantime, if you have any questions, just reply to this email.</p>
        <p style="margin-top:24px">— The AURA Team</p>
        <p style="color:#555;font-size:12px;margin-top:24px">hello@aura.studio · Sri Lanka 🇱🇰</p>
      </div>\`,
    });

    res.json({ success: true, message: 'Message received! We'll reply within 24 hours.' });
  } catch (err) {
    console.error('Contact error:', err);
    res.status(500).json({ error: 'Failed to send. Please email us directly at hello@aura.studio' });
  }
});

// GET /api/messages — admin: get all messages
router.get('/', auth, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM messages ORDER BY created_at DESC');
  res.json(rows);
});

// PATCH /api/messages/:id/read — admin: toggle read
router.patch('/:id/read', auth, async (req, res) => {
  await db.query('UPDATE messages SET is_read = NOT is_read WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

// DELETE /api/messages/:id — admin: delete
router.delete('/:id', auth, async (req, res) => {
  await db.query('DELETE FROM messages WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
`;

// ════════════════════════════════════════════════════════════════════
//  SRC/ROUTES/PROJECTS.JS
// ════════════════════════════════════════════════════════════════════

const projectsRoutes = `
const router = require('express').Router();
const db     = require('../db');
const auth   = require('../middleware/auth');

// GET /api/projects — public: get all projects
router.get('/', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM projects ORDER BY created_at DESC');
  res.json(rows);
});

// POST /api/projects — admin: create
router.post('/', auth, async (req, res) => {
  const { name, client, type, status, price, live_url, description, featured } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required.' });
  const { rows } = await db.query(
    'INSERT INTO projects (name, client, type, status, price, live_url, description, featured) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
    [name, client, type, status || 'in progress', price, live_url, description, featured || false]
  );
  res.json(rows[0]);
});

// PUT /api/projects/:id — admin: update
router.put('/:id', auth, async (req, res) => {
  const { name, client, type, status, price, live_url, description, featured } = req.body;
  const { rows } = await db.query(
    'UPDATE projects SET name=$1, client=$2, type=$3, status=$4, price=$5, live_url=$6, description=$7, featured=$8 WHERE id=$9 RETURNING *',
    [name, client, type, status, price, live_url, description, featured, req.params.id]
  );
  res.json(rows[0]);
});

// DELETE /api/projects/:id — admin: delete
router.delete('/:id', auth, async (req, res) => {
  await db.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
`;

// ════════════════════════════════════════════════════════════════════
//  SRC/ROUTES/CLIENTS.JS
// ════════════════════════════════════════════════════════════════════

const clientsRoutes = `
const router = require('express').Router();
const db     = require('../db');
const auth   = require('../middleware/auth');

router.get('/',    auth, async (req, res) => { const { rows } = await db.query('SELECT * FROM clients ORDER BY created_at DESC'); res.json(rows); });
router.post('/',   auth, async (req, res) => {
  const { name, email, industry, status, spent, notes } = req.body;
  const { rows } = await db.query('INSERT INTO clients (name, email, industry, status, spent, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *', [name, email, industry, status||'active', spent||'$0', notes]);
  res.json(rows[0]);
});
router.put('/:id', auth, async (req, res) => {
  const { name, email, industry, status, spent, notes } = req.body;
  const { rows } = await db.query('UPDATE clients SET name=$1, email=$2, industry=$3, status=$4, spent=$5, notes=$6 WHERE id=$7 RETURNING *', [name, email, industry, status, spent, notes, req.params.id]);
  res.json(rows[0]);
});
router.delete('/:id', auth, async (req, res) => { await db.query('DELETE FROM clients WHERE id=$1', [req.params.id]); res.json({ success: true }); });

module.exports = router;
`;

// ════════════════════════════════════════════════════════════════════
//  SRC/ROUTES/PRICING.JS
// ════════════════════════════════════════════════════════════════════

const pricingRoutes = `
const router = require('express').Router();
const db     = require('../db');
const auth   = require('../middleware/auth');

// GET /api/pricing — public
router.get('/', async (req, res) => {
  const { rows: plans }    = await db.query('SELECT * FROM pricing ORDER BY id');
  const { rows: settings } = await db.query('SELECT * FROM settings');
  const cfg = Object.fromEntries(settings.map(s => [s.key, s.value]));
  res.json({ plans, settings: cfg });
});

// PUT /api/pricing/:id — admin: update plan
router.put('/:id', auth, async (req, res) => {
  const { name, description, standard, current, popular } = req.body;
  const { rows } = await db.query(
    'UPDATE pricing SET name=$1, description=$2, standard=$3, current=$4, popular=$5 WHERE id=$6 RETURNING *',
    [name, description, standard, current, popular, req.params.id]
  );
  res.json(rows[0]);
});

// PUT /api/pricing/settings — admin: update settings
router.put('/settings/update', auth, async (req, res) => {
  const { founding_discount, founding_spots, offer_active, offer_message } = req.body;
  const updates = { founding_discount, founding_spots, offer_active, offer_message };
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined)
      await db.query('UPDATE settings SET value=$1 WHERE key=$2', [String(value), key]);
  }
  res.json({ success: true });
});

module.exports = router;
`;

// ════════════════════════════════════════════════════════════════════
//  SRC/ROUTES/DASHBOARD.JS
// ════════════════════════════════════════════════════════════════════

const dashboardRoutes = `
const router = require('express').Router();
const db     = require('../db');
const auth   = require('../middleware/auth');

// GET /api/dashboard/stats — admin only
router.get('/stats', auth, async (req, res) => {
  const [msgs, clients, projects, pricing] = await Promise.all([
    db.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE NOT is_read) AS unread FROM messages'),
    db.query('SELECT COUNT(*) as total FROM clients WHERE status = $1', ['active']),
    db.query('SELECT COUNT(*) as total FROM projects'),
    db.query("SELECT value FROM settings WHERE key = 'founding_spots'"),
  ]);
  res.json({
    totalMessages:   Number(msgs.rows[0].total),
    unreadMessages:  Number(msgs.rows[0].unread),
    activeClients:   Number(clients.rows[0].total),
    totalProjects:   Number(projects.rows[0].total),
    spotsRemaining:  Number(pricing.rows[0]?.value || 9),
  });
});

module.exports = router;
`;

// ════════════════════════════════════════════════════════════════════
//  SRC/SERVER.JS — MAIN ENTRY POINT
// ════════════════════════════════════════════════════════════════════

const serverCode = `
require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');

const app = express();

// ── Security ────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:5500',  // VS Code Live Server
    'https://yourdomain.com', // Replace with your actual domain
  ],
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

// ── Health check ────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));
app.get('/', (req, res) => res.json({ name: 'AURA API', version: '1.0.0', status: 'running ✓' }));

// ── 404 ─────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));

// ── Error handler ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error.' });
});

// ── Start ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(\`
  ╔══════════════════════════════════╗
  ║   AURA Backend running ✓        ║
  ║   http://localhost:\${PORT}        ║
  ╚══════════════════════════════════╝
  \`);
});
`;

// ════════════════════════════════════════════════════════════════════
//  HOW TO CONNECT ADMIN DASHBOARD TO BACKEND
// ════════════════════════════════════════════════════════════════════

/*
STEP 1 — Create admin account (run ONCE)
  POST http://localhost:4000/api/auth/register
  Body: { "email": "admin@aura.studio", "password": "your_strong_password", "secret": "aura_setup_once_then_delete_from_env" }

STEP 2 — Login to get JWT token
  POST http://localhost:4000/api/auth/login
  Body: { "email": "admin@aura.studio", "password": "your_strong_password" }
  Response: { "token": "eyJ..." }

STEP 3 — Use token for admin requests
  Header: Authorization: Bearer eyJ...

STEP 4 — Replace the DB object in admin/index.html with real API calls:

  // Replace: const DB = { messages: [...], ... }
  // With these fetch calls:

  async function loadDashboard() {
    const token = localStorage.getItem('aura_token');
    const headers = { 'Authorization': 'Bearer ' + token };

    const [msgs, projects, clients, pricing, stats] = await Promise.all([
      fetch('/api/messages',  { headers }).then(r => r.json()),
      fetch('/api/projects',  { headers }).then(r => r.json()),
      fetch('/api/clients',   { headers }).then(r => r.json()),
      fetch('/api/pricing').then(r => r.json()),
      fetch('/api/dashboard/stats', { headers }).then(r => r.json()),
    ]);

    DB.messages = msgs;
    DB.projects = projects;
    DB.clients  = clients;
    DB.pricing  = pricing.plans;
    renderAll();
    updateStats(stats);
  }

  // Real login:
  async function doLogin() {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ..., password: ... })
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('aura_token', data.token);
      showApp();
      loadDashboard();
    }
  }

STEP 5 — Deploy backend on Railway:
  1. Push to GitHub
  2. railway.app → New Project → Deploy from GitHub
  3. Add PostgreSQL plugin
  4. Set all env vars in Railway dashboard
  5. Run schema.sql on Railway DB
  6. Update frontend API URL from localhost:4000 to your Railway URL
*/

// Export all code as strings for reference
module.exports = { dbModule, authMiddleware, authRoutes, messagesRoutes, projectsRoutes, clientsRoutes, pricingRoutes, dashboardRoutes, serverCode };
