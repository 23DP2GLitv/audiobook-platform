// backend/migrate.js
require('dotenv').config();
const mysql = require('mysql2/promise');

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.columns
     WHERE table_schema = ? AND table_name = ? AND column_name = ?`,
    [process.env.DB_NAME, table, column]
  );
  return rows[0].cnt > 0;
}

async function run() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT || 3306,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });
  console.log('✅ Connected');

  // audiobooks.moderation_status
  if (!await columnExists(conn, 'audiobooks', 'moderation_status')) {
    await conn.query(`ALTER TABLE audiobooks ADD COLUMN moderation_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved'`);
    console.log('✅ Added moderation_status');
  } else console.log('⏭  moderation_status exists');

  // audiobooks.moderation_reason
  if (!await columnExists(conn, 'audiobooks', 'moderation_reason')) {
    await conn.query(`ALTER TABLE audiobooks ADD COLUMN moderation_reason VARCHAR(1000) DEFAULT NULL`);
    console.log('✅ Added moderation_reason');
  } else console.log('⏭  moderation_reason exists');

  // Set all existing as approved
  await conn.query(`UPDATE audiobooks SET moderation_status = 'approved' WHERE id > 0`);
  console.log('✅ Existing books set to approved');

  // users.listen_time_sec
  if (!await columnExists(conn, 'users', 'listen_time_sec')) {
    await conn.query(`ALTER TABLE users ADD COLUMN listen_time_sec BIGINT UNSIGNED NOT NULL DEFAULT 0`);
    console.log('✅ Added users.listen_time_sec');
  } else console.log('⏭  users.listen_time_sec exists');

  // audiobook_genres
  await conn.query(`CREATE TABLE IF NOT EXISTS audiobook_genres (
    audiobook_id INT UNSIGNED NOT NULL,
    genre_id     INT UNSIGNED NOT NULL,
    PRIMARY KEY (audiobook_id, genre_id),
    FOREIGN KEY (audiobook_id) REFERENCES audiobooks(id) ON DELETE CASCADE,
    FOREIGN KEY (genre_id)     REFERENCES genres(id)     ON DELETE CASCADE
  ) ENGINE=InnoDB`);
  console.log('✅ audiobook_genres OK');

  // completed_books
  await conn.query(`CREATE TABLE IF NOT EXISTS completed_books (
    user_id      INT UNSIGNED NOT NULL,
    audiobook_id INT UNSIGNED NOT NULL,
    completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, audiobook_id),
    FOREIGN KEY (user_id)      REFERENCES users(id)      ON DELETE CASCADE,
    FOREIGN KEY (audiobook_id) REFERENCES audiobooks(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`);
  console.log('✅ completed_books OK');

  // moderation_log action enum
  try {
    await conn.query(`ALTER TABLE moderation_log MODIFY COLUMN action ENUM(
      'delete_book','delete_review','block_user','unblock_user',
      'change_role','restore_book','restore_review','warn_user',
      'delete_user','approve_book','reject_book'
    ) NOT NULL`);
    console.log('✅ moderation_log action enum updated');
  } catch(e) { console.log('⏭  moderation_log enum:', e.message.substring(0,60)); }

  console.log('\n✅ All migrations done!');
  await conn.end();
  process.exit(0);
}

run().catch(err => { console.error('❌ Fatal:', err.message); process.exit(1); });
