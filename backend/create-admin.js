// backend/create-admin.js
require('dotenv').config();
const mysql   = require('mysql2/promise');
const bcrypt  = require('bcryptjs');

async function run() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT || 3306,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const hash = await bcrypt.hash('Admin1234!', 12);
  await conn.query(
    `INSERT INTO users (username, email, password_hash, role)
     VALUES ('admin', 'admin@audiobooks.lv', ?, 'admin')
     ON DUPLICATE KEY UPDATE password_hash = ?, role = 'admin'`,
    [hash, hash]
  );

  console.log('✅ Admin created! Email: admin@audiobooks.lv  Password: Admin1234!');
  await conn.end();
  process.exit(0);
}

run().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
