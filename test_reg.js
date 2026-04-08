require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./src/db');
(async () => {
  try {
    const email = 'admin@aura.studio';
    const password = 'aura2025!';
    const hash = await bcrypt.hash(password, 12);
    await db.query('INSERT INTO admins (email, password_hash) VALUES ($1, $2)', [email, hash]);
    console.log("SUCCESS");
  } catch (err) {
    if (err.code === '23505') return console.log("SUCCESS - ALREADY EXISTS");
    console.error("FULL ERROR:", err);
  } finally {
    process.exit(0);
  }
})();
