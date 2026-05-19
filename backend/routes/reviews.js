// backend/routes/reviews.js
const express = require('express');
const pool    = require('../db/db');
const { authenticate, requireModerator } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// ── GET /api/books/:id/reviews ─────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [reviews] = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              u.id AS user_id, u.username, u.avatar_url
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.audiobook_id = ? AND r.is_deleted = 0
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [req.params.id, parseInt(limit), offset]
    );

    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) AS total FROM reviews WHERE audiobook_id = ? AND is_deleted = 0',
      [req.params.id]
    );

    res.json({ reviews, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// ── Helper: recalculate book rating ──────────────────────
async function recalcRating(pool, bookId) {
  await pool.query(
    `UPDATE audiobooks SET
       rating       = COALESCE((SELECT AVG(rating) FROM reviews WHERE audiobook_id = ? AND is_deleted = 0), 0),
       review_count = (SELECT COUNT(*) FROM reviews WHERE audiobook_id = ? AND is_deleted = 0)
     WHERE id = ?`,
    [bookId, bookId, bookId]
  );
}

// ── POST /api/books/:id/reviews ────────────────────────────
router.post('/', authenticate, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const bookId = req.params.id;

    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });

    // Check if book exists
    const [book] = await pool.query('SELECT id, author_id FROM audiobooks WHERE id = ? AND is_deleted = 0', [bookId]);
    if (!book.length) return res.status(404).json({ error: 'Book not found' });

    if (book[0].author_id === req.user.id)
      return res.status(400).json({ error: 'You cannot review your own book' });

    // Upsert: one review per user per book
    const [existing] = await pool.query(
      'SELECT id FROM reviews WHERE user_id = ? AND audiobook_id = ?',
      [req.user.id, bookId]
    );

    let reviewId;
    if (existing.length) {
      await pool.query(
        'UPDATE reviews SET rating = ?, comment = ?, is_deleted = 0 WHERE id = ?',
        [rating, comment || null, existing[0].id]
      );
      reviewId = existing[0].id;
    } else {
      const [result] = await pool.query(
        'INSERT INTO reviews (audiobook_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
        [bookId, req.user.id, rating, comment || null]
      );
      reviewId = result.insertId;
    }

    const [rows] = await pool.query(
      `SELECT r.*, u.username, u.avatar_url FROM reviews r
       JOIN users u ON u.id = r.user_id WHERE r.id = ?`,
      [reviewId]
    );

    // Recalculate rating
    await recalcRating(pool, bookId);

    res.status(201).json({ review: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// ── DELETE /api/books/:id/reviews/:reviewId ────────────────
router.delete('/:reviewId', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM reviews WHERE id = ?', [req.params.reviewId]);
    if (!rows.length) return res.status(404).json({ error: 'Review not found' });

    const isOwner = rows[0].user_id === req.user.id;
    const isMod   = ['moderator', 'admin'].includes(req.user.role);

    if (!isOwner && !isMod) return res.status(403).json({ error: 'Not allowed' });

    await pool.query(
      'UPDATE reviews SET is_deleted = 1, delete_reason = ? WHERE id = ?',
      [req.body.reason || null, req.params.reviewId]
    );

    // Recalculate rating
    await recalcRating(pool, rows[0].audiobook_id);

    if (isMod && !isOwner) {
      await pool.query(
        `INSERT INTO moderation_log (moderator_id, action, object_type, object_id, reason)
         VALUES (?, 'delete_review', 'review', ?, ?)`,
        [req.user.id, req.params.reviewId, req.body.reason || null]
      );
    }

    res.json({ message: 'Review deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

module.exports = router;
