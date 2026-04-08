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
  console.log(`
  ╔══════════════════════════════════╗
  ║   AURA Backend running ✓        ║
  ║   http://localhost:${PORT}        ║
  ╚══════════════════════════════════╝
  `);
});
