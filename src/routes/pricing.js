const router = require('express').Router();
const db     = require('../db');
const auth   = require('../middleware/auth');

// GET /api/pricing — public
router.get('/', async (req, res) => {
  try {
    const { rows: plans }    = await db.query('SELECT * FROM pricing ORDER BY id');
    const { rows: settings } = await db.query('SELECT * FROM settings');
    const cfg = Object.fromEntries(settings.map(s => [s.key, s.value]));
    res.json({ plans, settings: cfg });
  } catch (err) {
    console.error('Get pricing error:', err.message);
    res.status(500).json({ error: 'Failed to fetch pricing.' });
  }
});

// PUT /api/pricing/:id — admin: update plan
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, standard, current, popular } = req.body;
    const { rows } = await db.query(
      'UPDATE pricing SET name=$1, description=$2, standard=$3, current=$4, popular=$5 WHERE id=$6 RETURNING *',
      [name, description, standard, current, popular, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Update pricing error:', err.message);
    res.status(500).json({ error: 'Failed to update pricing.' });
  }
});

// PUT /api/pricing/settings — admin: update settings
router.put('/settings/update', auth, async (req, res) => {
  try {
    const { founding_discount, founding_spots, offer_active, offer_message } = req.body;
    const updates = { founding_discount, founding_spots, offer_active, offer_message };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined)
        await db.query('UPDATE settings SET value=$1 WHERE key=$2', [String(value), key]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Update settings error:', err.message);
    res.status(500).json({ error: 'Failed to update settings.' });
  }
});

module.exports = router;
