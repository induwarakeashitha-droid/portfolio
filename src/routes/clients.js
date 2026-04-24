const router = require('express').Router();
const db     = require('../db');
const auth   = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM clients ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error('Get clients error:', err.message);
    res.status(500).json({ error: 'Failed to fetch clients.' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, email, industry, status, spent, notes } = req.body;
    const { rows } = await db.query(
      'INSERT INTO clients (name, email, industry, status, spent, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [name, email, industry, status || 'active', spent || '$0', notes]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Create client error:', err.message);
    res.status(500).json({ error: 'Failed to create client.' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, email, industry, status, spent, notes } = req.body;
    const { rows } = await db.query(
      'UPDATE clients SET name=$1, email=$2, industry=$3, status=$4, spent=$5, notes=$6 WHERE id=$7 RETURNING *',
      [name, email, industry, status, spent, notes, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Update client error:', err.message);
    res.status(500).json({ error: 'Failed to update client.' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM clients WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete client error:', err.message);
    res.status(500).json({ error: 'Failed to delete client.' });
  }
});

module.exports = router;
