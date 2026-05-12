// backend/routes/users.js
const express = require('express');
const pool    = require('../db/db');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { uploadCover } = require('../middleware/upload');

const router = express.Router();

// ── GET /api/users/:id — public profile ───────────────────
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.avatar_url, u.bio, u.registered_at,
              s.books_published, s.books_listened, s.total_hours
       FROM users u
       LEFT JOIN user_stats s ON s.user_id = u.id
       WHERE u.id = ? AND u.is_blocked = 0`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const [books] = await pool.query(
      `SELECT b.id, b.title, b.cover_url, b.rating, b.listen_count, b.duration_sec, b.published_at,
              g.name_lv AS genre_lv, g.name_ru AS genre_ru, g.name_en AS genre_en
       FROM audiobooks b
       LEFT JOIN genres g ON g.id = b.genre_id
       WHERE b.author_id = ? AND b.is_public = 1 AND b.is_deleted = 0
       ORDER BY b.published_at DESC`,
      [req.params.id]
    );

    res.json({ user: rows[0], books });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ── GET /api/users/me/books — my books ────────────────────
router.get('/me/books', authenticate, async (req, res) => {
  try {
    const [books] = await pool.query(
      `SELECT b.*, 
              g.name_lv AS genre_lv, g.name_ru AS genre_ru, g.name_en AS genre_en,
              (SELECT COUNT(*) FROM audio_files af WHERE af.audiobook_id = b.id) AS parts_count
       FROM audiobooks b
       LEFT JOIN genres g ON g.id = b.genre_id
       WHERE b.author_id = ? AND b.is_deleted = 0
       ORDER BY b.published_at DESC`,
      [req.user.id]
    );
    res.json({ books });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch your books' });
  }
});

// ── GET /api/users/me/history ─────────────────────────────
router.get('/me/history', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [rows] = await pool.query(
      `SELECT h.id, h.progress_sec, h.completed, h.listened_at, h.file_id,
              b.id AS book_id, b.title, b.cover_url,
              COALESCE(NULLIF(b.duration_sec, 0),
                (SELECT SUM(af2.duration_sec) FROM audio_files af2 WHERE af2.audiobook_id = b.id)
              ) AS duration_sec,
              u.username AS author_name,
              af.part_title, af.part_number, af.duration_sec AS part_duration_sec
       FROM listening_history h
       JOIN audiobooks b      ON b.id = h.audiobook_id
       JOIN users u           ON u.id = b.author_id
       LEFT JOIN audio_files af ON af.id = h.file_id
       WHERE h.user_id = ? AND b.is_deleted = 0
       ORDER BY h.listened_at DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, parseInt(limit), offset]
    );

    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) AS total FROM listening_history WHERE user_id = ?',
      [req.user.id]
    );

    res.json({ history: rows, pagination: { page: parseInt(page), total } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ── POST /api/users/me/history — save progress ────────────
router.post('/me/history', authenticate, async (req, res) => {
  try {
    const { audiobook_id, file_id, progress_sec, completed = 0 } = req.body;
    if (!audiobook_id || progress_sec === undefined)
      return res.status(400).json({ error: 'audiobook_id and progress_sec are required' });

    await pool.query(
      `INSERT INTO listening_history (user_id, audiobook_id, file_id, progress_sec, completed)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE file_id = VALUES(file_id), progress_sec = VALUES(progress_sec),
                               completed = VALUES(completed), listened_at = NOW()`,
      [req.user.id, audiobook_id, file_id || null, progress_sec, completed ? 1 : 0]
    );

    // Если завершена — записываем в completed_books (навсегда, PRIMARY KEY не даст дублей)
    if (completed) {
      await pool.query(
        `INSERT IGNORE INTO completed_books (user_id, audiobook_id) VALUES (?, ?)`,
        [req.user.id, audiobook_id]
      );
    }

    res.json({ message: 'Progress saved' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

// ── POST /api/users/me/listen-time — add listening seconds ─
router.post('/me/listen-time', authenticate, async (req, res) => {
  try {
    const { seconds } = req.body;
    if (!seconds || seconds <= 0) return res.json({ ok: true });
    await pool.query(
      'UPDATE users SET listen_time_sec = listen_time_sec + ? WHERE id = ?',
      [Math.floor(seconds), req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update listen time' });
  }
});

// ── DELETE /api/users/me/history/:id — delete one entry ───
router.delete('/me/history/:id', authenticate, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM listening_history WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Entry deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

// ── DELETE /api/users/me/history — clear history ──────────
router.delete('/me/history', authenticate, async (req, res) => {
  try {
    await pool.query('DELETE FROM listening_history WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'History cleared' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

// ── POST /api/users/me/avatar — upload avatar ─────────────
router.post('/me/avatar', authenticate, uploadCover.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const url = `/uploads/covers/${req.file.filename}`;
    await pool.query('UPDATE users SET avatar_url = ? WHERE id = ?', [url, req.user.id]);
    res.json({ avatar_url: url });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

module.exports = router;
