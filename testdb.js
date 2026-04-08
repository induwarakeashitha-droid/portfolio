require('dotenv').config();
const db = require('./src/db');
db.query("INSERT INTO admins (email, password_hash) VALUES ('realadmin@aura.studio', 'fakehash')")
  .then(() => console.log("INSERT WORKED"))
  .catch(e => console.error("INSERT ERROR:", e.message))
  .finally(() => process.exit(0));
