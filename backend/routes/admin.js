// backend/routes/admin.js
const express = require('express');
const pool    = require('../db/db');
const { authenticate, requireAdmin, requireModerator } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ── GET /api/admin/stats — dashboard stats ─────────────────
router.get('/stats', requireModerator, async (req, res) => {
  try {
    const [[users]]   = await pool.query('SELECT COUNT(*) AS total FROM users');
    const [[books]]   = await pool.query('SELECT COUNT(*) AS total FROM audiobooks WHERE is_deleted = 0');
    const [[reviews]] = await pool.query('SELECT COUNT(*) AS total FROM reviews WHERE is_deleted = 0');
    const [[blocked]] = await pool.query('SELECT COUNT(*) AS total FROM users WHERE is_blocked = 1');
    const [[today_users]] = await pool.query(
      "SELECT COUNT(*) AS total FROM users WHERE DATE(registered_at) = CURDATE()"
    );
    const [[today_books]] = await pool.query(
      "SELECT COUNT(*) AS total FROM audiobooks WHERE DATE(published_at) = CURDATE() AND is_deleted = 0"
    );

    // New users last 7 days
    const [userGrowth] = await pool.query(
      `SELECT DATE(registered_at) AS day, COUNT(*) AS count
       FROM users WHERE registered_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY DATE(registered_at) ORDER BY day`
    );

    // Top books
    const [topBooks] = await pool.query(
      `SELECT b.id, b.title, b.listen_count, b.rating, b.review_count,
              u.username AS author
       FROM audiobooks b
       JOIN users u ON u.id = b.author_id
       WHERE b.is_deleted = 0
       ORDER BY b.listen_count DESC LIMIT 10`
    );

    res.json({
      stats: {
        total_users:    users.total,
        total_books:    books.total,
        total_reviews:  reviews.total,
        blocked_users:  blocked.total,
        new_users_today: today_users.total,
        new_books_today: today_books.total,
      },
      user_growth: userGrowth,
      top_books:   topBooks,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── GET /api/admin/users ───────────────────────────────────
router.get('/users', requireModerator, async (req, res) => {
  try {
    const { q, role, is_blocked, page = 1, limit = 30 } = req.query;
    const where  = []; const params = [];

    if (q)          { where.push('(u.username LIKE ? OR u.email LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
    if (role)       { where.push('u.role = ?');       params.push(role); }
    if (is_blocked !== undefined) { where.push('u.is_blocked = ?'); params.push(parseInt(is_blocked)); }

    const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const offset   = (parseInt(page) - 1) * parseInt(limit);

    const [users] = await pool.query(
      `SELECT u.id, u.email, u.username, u.role, u.is_blocked, u.block_reason,
              u.registered_at, u.last_login_at, u.avatar_url,
              s.books_published, s.books_listened,
              (SELECT m.created_at FROM moderation_log m
               WHERE m.object_type='user' AND m.object_id=u.id AND m.action='block_user'
               ORDER BY m.created_at DESC LIMIT 1) AS blocked_at
       FROM users u
       LEFT JOIN user_stats s ON s.user_id = u.id
       ${whereSQL}
       ORDER BY u.registered_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM users u ${whereSQL}`, params
    );

    res.json({ users, pagination: { page: parseInt(page), total } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ── PUT /api/admin/users/:id/role ──────────────────────────
router.put('/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const allowed  = ['user', 'moderator', 'admin'];
    if (!allowed.includes(role)) return res.status(400).json({ error: 'Invalid role' });
    if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot change own role' });

    await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    await pool.query(
      `INSERT INTO moderation_log (moderator_id, action, object_type, object_id, reason)
       VALUES (?, 'change_role', 'user', ?, ?)`,
      [req.user.id, req.params.id, `Changed role to ${role}`]
    );
    res.json({ message: 'Role updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// ── PUT /api/admin/users/:id/block ─────────────────────────
router.put('/users/:id/block', requireModerator, async (req, res) => {
  try {
    const { reason } = req.body;
    await pool.query(
      'UPDATE users SET is_blocked = 1, block_reason = ? WHERE id = ?',
      [reason || null, req.params.id]
    );
    await pool.query(
      `INSERT INTO moderation_log (moderator_id, action, object_type, object_id, reason)
       VALUES (?, 'block_user', 'user', ?, ?)`,
      [req.user.id, req.params.id, reason || null]
    );
    res.json({ message: 'User blocked' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// ── PUT /api/admin/users/:id/unblock ──────────────────────
router.put('/users/:id/unblock', requireModerator, async (req, res) => {
  try {
    await pool.query('UPDATE users SET is_blocked = 0, block_reason = NULL WHERE id = ?', [req.params.id]);
    await pool.query(
      `INSERT INTO moderation_log (moderator_id, action, object_type, object_id)
       VALUES (?, 'unblock_user', 'user', ?)`,
      [req.user.id, req.params.id]
    );
    res.json({ message: 'User unblocked' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

// ── DELETE /api/admin/users/:id ────────────────────────────
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id)
      return res.status(400).json({ error: 'Cannot delete your own account' });

    const { reason } = req.body;

    // Log before deletion (CASCADE will remove user)
    await pool.query(
      `INSERT INTO moderation_log (moderator_id, action, object_type, object_id, reason)
       VALUES (?, 'delete_user', 'user', ?, ?)`,
      [req.user.id, req.params.id, reason || null]
    );

    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ── GET /api/admin/pending-books ───────────────────────────
router.get('/pending-books', requireModerator, async (req, res) => {
  try {
    const [books] = await pool.query(
      `SELECT b.id, b.title, b.description, b.cover_url, b.duration_sec,
              b.is_public, b.published_at AS created_at, b.moderation_status,
              u.id AS author_id, u.username AS author,
              g.name_lv AS genre_lv, g.name_ru AS genre_ru, g.name_en AS genre_en,
              l.name_lv AS lang_lv
       FROM audiobooks b
       JOIN users u ON u.id = b.author_id
       LEFT JOIN genres g ON g.id = b.genre_id
       LEFT JOIN languages l ON l.id = b.language_id
       WHERE b.moderation_status = 'pending' AND b.is_deleted = 0
       ORDER BY b.published_at ASC`,
    );
    res.json({ books });
  } catch (err) {
    console.error('Pending books error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/admin/books/:id/approve ──────────────────────
router.post('/books/:id/approve', requireModerator, async (req, res) => {
  try {
    await pool.query(
      `UPDATE audiobooks SET moderation_status = 'approved', moderation_reason = NULL WHERE id = ?`,
      [req.params.id]
    );
    await pool.query(
      `INSERT INTO moderation_log (moderator_id, action, object_type, object_id)
       VALUES (?, 'approve_book', 'audiobook', ?)`,
      [req.user.id, req.params.id]
    );
    res.json({ message: 'Book approved' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve book' });
  }
});

// ── POST /api/admin/books/:id/reject ───────────────────────
router.post('/books/:id/reject', requireModerator, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Reason is required' });
    await pool.query(
      `UPDATE audiobooks SET moderation_status = 'rejected', moderation_reason = ? WHERE id = ?`,
      [reason, req.params.id]
    );
    await pool.query(
      `INSERT INTO moderation_log (moderator_id, action, object_type, object_id, reason)
       VALUES (?, 'reject_book', 'audiobook', ?, ?)`,
      [req.user.id, req.params.id, reason]
    );
    res.json({ message: 'Book rejected' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject book' });
  }
});

// ── GET /api/admin/books ───────────────────────────────────
router.get('/books', requireModerator, async (req, res) => {
  try {
    const { q, is_deleted = 0, page = 1, limit = 30 } = req.query;
    const where  = ['b.is_deleted = ?']; const params = [parseInt(is_deleted)];
    if (q) { where.push('b.title LIKE ?'); params.push(`%${q}%`); }
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [books] = await pool.query(
      `SELECT b.id, b.title, b.is_public, b.is_deleted, b.rating, b.listen_count, b.published_at,
              u.username AS author, u.id AS author_id
       FROM audiobooks b
       JOIN users u ON u.id = b.author_id
       WHERE ${where.join(' AND ')}
       ORDER BY b.published_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM audiobooks b WHERE ${where.join(' AND ')}`, params
    );
    res.json({ books, pagination: { page: parseInt(page), total } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

// ── GET /api/admin/reviews ─────────────────────────────────
router.get('/reviews', requireModerator, async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const [reviews] = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.is_deleted, r.created_at,
              u.username, b.title AS book_title, b.id AS book_id
       FROM reviews r
       JOIN users u       ON u.id = r.user_id
       JOIN audiobooks b  ON b.id = r.audiobook_id
       WHERE r.is_deleted = 0
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [parseInt(limit), offset]
    );
    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// ── GET /api/admin/modlog ──────────────────────────────────
router.get('/modlog', requireModerator, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const [logs] = await pool.query(
      `SELECT m.*, u.username AS moderator_name
       FROM moderation_log m
       JOIN users u ON u.id = m.moderator_id
       ORDER BY m.created_at DESC
       LIMIT ? OFFSET ?`,
      [parseInt(limit), offset]
    );
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM moderation_log');
    res.json({ logs, pagination: { page: parseInt(page), total } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch moderation log' });
  }
});

module.exports = router;
