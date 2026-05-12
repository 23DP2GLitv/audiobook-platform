// backend/routes/auth.js
const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const pool     = require('../db/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ── Helpers ────────────────────────────────────────────────
const signToken = (user) =>
  jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

const safeUser = (u) => ({
  id: u.id, email: u.email, username: u.username,
  role: u.role, avatar_url: u.avatar_url, bio: u.bio,
  ui_language: u.ui_language, registered_at: u.registered_at
});

// ── POST /api/auth/register ────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, username, password, ui_language = 'lv' } = req.body;

    if (!email || !username || !password)
      return res.status(400).json({ error: 'Email, username and password are required' });

    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' });

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username))
      return res.status(400).json({ error: 'Username must be 3-30 chars, letters/numbers/underscore only' });

    // Check duplicates
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email.toLowerCase(), username]
    );
    if (existing.length) {
      return res.status(409).json({ error: 'Email or username already taken' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      'INSERT INTO users (email, username, password_hash, ui_language) VALUES (?, ?, ?, ?)',
      [email.toLowerCase(), username, password_hash, ui_language]
    );

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
    const token  = signToken(rows[0]);

    res.status(201).json({ token, user: safeUser(rows[0]) });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ── POST /api/auth/login ───────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email.toLowerCase()]
    );
    if (!rows.length)
      return res.status(401).json({ error: 'Invalid email or password' });

    const user = rows[0];
    if (user.is_blocked)
      return res.status(403).json({ error: `Account blocked: ${user.block_reason || 'Contact support'}` });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ error: 'Invalid email or password' });

    // Update last login
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    const token = signToken(user);
    res.json({ token, user: safeUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── GET /api/auth/me ───────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    // Книги прослушанные до конца — из постоянной таблицы completed_books
    const [[{ books_listened }]] = await pool.query(
      `SELECT COUNT(*) AS books_listened FROM completed_books WHERE user_id = ?`,
      [req.user.id]
    );

    // Реальное время прослушивания из users.listen_time_sec
    const listen_time_sec = rows[0].listen_time_sec || 0;

    // Опубликованные книги (не удалённые)
    const [[{ books_published }]] = await pool.query(
      `SELECT COUNT(*) AS books_published
       FROM audiobooks
       WHERE author_id = ? AND is_deleted = 0`,
      [req.user.id]
    );

    res.json({
      user: safeUser(rows[0]),
      stats: {
        books_listened,
        listen_time_sec,
        books_published,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ── PUT /api/auth/profile ──────────────────────────────────
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { bio, ui_language } = req.body;
    const allowed_languages = ['lv', 'ru', 'en'];

    const updates = [];
    const values  = [];

    if (bio !== undefined)         { updates.push('bio = ?');         values.push(bio); }
    if (ui_language !== undefined && allowed_languages.includes(ui_language)) {
      updates.push('ui_language = ?'); values.push(ui_language);
    }

    if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });

    values.push(req.user.id);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    res.json({ user: safeUser(rows[0]) });
  } catch (err) {
    res.status(500).json({ error: 'Profile update failed' });
  }
});

// ── PUT /api/auth/password ─────────────────────────────────
router.put('/password', authenticate, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password)
      return res.status(400).json({ error: 'Both current and new password required' });

    if (new_password.length < 8)
      return res.status(400).json({ error: 'New password must be at least 8 characters' });

    const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    const valid  = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Password update failed' });
  }
});

module.exports = router;
