require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');

const app = express();

// ── Security ────────────────────────────────────────────────────────
app.use(helmet());
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

// ── Health check ────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));
app.get('/', (req, res) => res.json({ name: 'AURA API', version: '1.0.0', status: 'running ✓' }));

// ── 404 ─────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));

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
