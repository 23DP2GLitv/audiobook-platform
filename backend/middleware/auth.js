// backend/middleware/auth.js
const jwt  = require('jsonwebtoken');
const pool = require('../db/db');

// ── Verify JWT token ──────────────────────────────────────
const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user data (checks block status etc.)
    const [rows] = await pool.query(
      'SELECT id, email, username, role, is_blocked, avatar_url FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!rows.length) return res.status(401).json({ error: 'User not found' });
    if (rows[0].is_blocked) return res.status(403).json({ error: 'Account is blocked' });

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ── Optional auth (doesn't fail if no token) ─────────────
const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }
    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [rows]  = await pool.query(
      'SELECT id, email, username, role, is_blocked, avatar_url FROM users WHERE id = ?',
      [decoded.id]
    );
    req.user = (rows.length && !rows[0].is_blocked) ? rows[0] : null;
  } catch {
    req.user = null;
  }
  next();
};

// ── Role-based access ─────────────────────────────────────
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

const requireModerator = requireRole('moderator', 'admin');
const requireAdmin     = requireRole('admin');

module.exports = { authenticate, optionalAuth, requireRole, requireModerator, requireAdmin };
