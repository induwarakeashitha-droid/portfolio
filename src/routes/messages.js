const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const db = require('../db');
const auth = require('../middleware/auth');

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

    // Try to send emails, but don't crash if email config is wrong
    try {
      // Email to YOU
      await mail.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER,
        subject: `🌟 New AURA enquiry from ${name}`,
        replyTo: email,
        html: `<div style="font-family:sans-serif;max-width:600px;padding:24px">
          <h2 style="color:#38f0c4">New Enquiry — AURA</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;color:#666;width:120px"><b>Name</b></td><td>${name}</td></tr>
            <tr><td style="padding:8px 0;color:#666"><b>Email</b></td><td><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding:8px 0;color:#666"><b>Service</b></td><td>${service || 'Not specified'}</td></tr>
            <tr><td style="padding:8px 0;color:#666"><b>Budget</b></td><td>${budget || 'Not specified'}</td></tr>
            <tr><td style="padding:8px 0;color:#666"><b>Timeline</b></td><td>${timeline || 'Not specified'}</td></tr>
          </table>
          <hr style="margin:16px 0"/>
          <h3>Message</h3>
          <p style="background:#f5f5f5;padding:16px;border-radius:8px">${message}</p>
          <p style="color:#999;font-size:12px">Reply directly to this email to respond to the client.</p>
        </div>`,
      });

      // Auto-reply to client
      await mail.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'We received your message — AURA Studio',
        html: `<div style="font-family:sans-serif;max-width:560px;background:#04060f;color:#f0eeff;padding:32px;border-radius:12px">
          <h2 style="color:#38f0c4;letter-spacing:.1em">AURA</h2>
          <p>Hi ${name},</p>
          <p>Thanks for reaching out! We've received your message and will reply within 24 hours.</p>
          <p>In the meantime, if you have any questions, just reply to this email.</p>
          <p style="margin-top:24px">— The AURA Team</p>
          <p style="color:#555;font-size:12px;margin-top:24px">hello@aura.studio · Sri Lanka 🇱🇰</p>
        </div>`,
      });
    } catch (emailErr) {
      console.error('Email sending failed (message still saved):', emailErr.message);
    }

    res.json({ success: true, message: "Message received! We'll reply within 24 hours." });
  } catch (err) {
    console.error('Contact error:', err.message);
    res.status(500).json({ error: 'Failed to send. Please email us directly at hello@aura.studio' });
  }
});

// GET /api/messages — admin: get all messages
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM messages ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error('Get messages error:', err.message);
    res.status(500).json({ error: 'Failed to fetch messages.' });
  }
});

// PATCH /api/messages/:id/read — admin: toggle read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    await db.query('UPDATE messages SET is_read = NOT is_read WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Toggle read error:', err.message);
    res.status(500).json({ error: 'Failed to update message.' });
  }
});

// DELETE /api/messages/:id — admin: delete
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM messages WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete message error:', err.message);
    res.status(500).json({ error: 'Failed to delete message.' });
  }
});

module.exports = router;
