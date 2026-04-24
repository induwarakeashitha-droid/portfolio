const router = require('express').Router();
const db     = require('../db');
const auth   = require('../middleware/auth');

// GET /api/projects — public: get all projects
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM projects ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error('Get projects error:', err.message);
    res.status(500).json({ error: 'Failed to fetch projects.' });
  }
});

// POST /api/projects — admin: create
router.post('/', auth, async (req, res) => {
  const { name, client, type, status, price, live_url, description, featured } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required.' });
  try {
    const { rows } = await db.query(
      'INSERT INTO projects (name, client, type, status, price, live_url, description, featured) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [name, client, type, status || 'in progress', price, live_url, description, featured || false]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Create project error:', err.message);
    res.status(500).json({ error: 'Failed to create project.' });
  }
});

// PUT /api/projects/:id — admin: update
router.put('/:id', auth, async (req, res) => {
  const { name, client, type, status, price, live_url, description, featured } = req.body;
  try {
    const { rows } = await db.query(
      'UPDATE projects SET name=$1, client=$2, type=$3, status=$4, price=$5, live_url=$6, description=$7, featured=$8 WHERE id=$9 RETURNING *',
      [name, client, type, status, price, live_url, description, featured, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Update project error:', err.message);
    res.status(500).json({ error: 'Failed to update project.' });
  }
});

// DELETE /api/projects/:id — admin: delete
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete project error:', err.message);
    res.status(500).json({ error: 'Failed to delete project.' });
  }
});

module.exports = router;
