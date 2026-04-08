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
