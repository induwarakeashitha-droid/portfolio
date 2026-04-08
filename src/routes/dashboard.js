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
