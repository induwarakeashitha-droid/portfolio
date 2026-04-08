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
