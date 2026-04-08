const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');

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
