// backend/routes/books.js
const express   = require('express');
const path      = require('path');
const fs        = require('fs');
const pool      = require('../db/db');
const { authenticate, optionalAuth, requireModerator } = require('../middleware/auth');
const { uploadBook } = require('../middleware/upload');

const router = express.Router();

// ── Helper: get audio duration via ffprobe ─────────────────
function getAudioDuration(filePath) {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    exec(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      (err, stdout) => {
        if (err) return resolve(0);
        const sec = parseFloat(stdout.trim());
        resolve(isNaN(sec) ? 0 : Math.floor(sec));
      }
    );
  });
}

// ── GET /api/books — catalog with search & filters ─────────
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      q, genre_id, language_id, min_rating, max_duration,
      sort = 'listen_count', order = 'DESC',
      page = 1, limit = 20
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where  = ['b.is_public = 1', 'b.is_deleted = 0', "b.moderation_status = 'approved'"];
    const params = [];

    if (q) {
      // Search by title, description AND author username
      where.push('(MATCH(b.title, b.description) AGAINST(? IN BOOLEAN MODE) OR u.username LIKE ?)');
      params.push(q + '*', `%${q}%`);
    }
    if (genre_id) {
      // Support multiple genres via comma-separated IDs
      const ids = String(genre_id).split(',').map(Number).filter(Boolean);
      if (ids.length === 1) {
        where.push('(b.genre_id = ? OR EXISTS(SELECT 1 FROM audiobook_genres ag WHERE ag.audiobook_id = b.id AND ag.genre_id = ?))');
        params.push(ids[0], ids[0]);
      } else if (ids.length > 1) {
        where.push(`(b.genre_id IN (${ids.map(()=>'?').join(',')}) OR EXISTS(SELECT 1 FROM audiobook_genres ag WHERE ag.audiobook_id = b.id AND ag.genre_id IN (${ids.map(()=>'?').join(',')})))`);
        params.push(...ids, ...ids);
      }
    }
    if (language_id) { where.push('b.language_id = ?');   params.push(language_id); }
    if (min_rating)  { where.push('b.rating >= ?');        params.push(min_rating); }
    if (max_duration){ where.push('b.duration_sec <= ?');  params.push(parseInt(max_duration) * 60); }

    const allowedSorts = ['listen_count', 'rating', 'published_at', 'title', 'duration_sec'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'listen_count';
    const sortDir = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [books] = await pool.query(
      `SELECT b.id, b.title, b.description, b.cover_url, b.duration_sec,
              b.rating, b.review_count, b.listen_count, b.published_at,
              u.id AS author_id, u.username AS author_name, u.avatar_url AS author_avatar,
              g.name_lv AS genre_lv, g.name_ru AS genre_ru, g.name_en AS genre_en,
              l.code AS lang_code, l.name_lv AS lang_lv
       FROM audiobooks b
       LEFT JOIN users u     ON u.id = b.author_id
       LEFT JOIN genres g    ON g.id = b.genre_id
       LEFT JOIN languages l ON l.id = b.language_id
       ${whereSQL}
       ORDER BY b.${sortCol} ${sortDir}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    // Attach extra genres from audiobook_genres
    if (books.length) {
      const ids = books.map(b => b.id);
      const [extraGenres] = await pool.query(
        `SELECT ag.audiobook_id, g.id, g.name_lv, g.name_ru, g.name_en, g.slug
         FROM audiobook_genres ag
         JOIN genres g ON g.id = ag.genre_id
         WHERE ag.audiobook_id IN (${ids.map(()=>'?').join(',')})`,
        ids
      );
      const byBook = {};
      extraGenres.forEach(r => {
        if (!byBook[r.audiobook_id]) byBook[r.audiobook_id] = [];
        byBook[r.audiobook_id].push(r);
      });
      books.forEach(b => { b.extra_genres = byBook[b.id] || []; });
    }

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM audiobooks b LEFT JOIN users u ON u.id = b.author_id ${whereSQL}`,
      params
    );

    res.json({
      books,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

// ── GET /api/books/:id — single book ──────────────────────
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.*, 
              u.id AS author_id, u.username AS author_name, u.avatar_url AS author_avatar, u.bio AS author_bio,
              g.slug AS genre_slug, g.name_lv AS genre_lv, g.name_ru AS genre_ru, g.name_en AS genre_en,
              l.code AS lang_code, l.name_lv AS lang_lv, l.name_ru AS lang_ru, l.name_en AS lang_en
       FROM audiobooks b
       LEFT JOIN users u     ON u.id = b.author_id
       LEFT JOIN genres g    ON g.id = b.genre_id
       LEFT JOIN languages l ON l.id = b.language_id
       WHERE b.id = ? AND b.is_deleted = 0`,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Book not found' });

    const book = rows[0];

    // Fetch audio parts
    const [files] = await pool.query(
      'SELECT id, part_number, part_title, duration_sec, file_size_bytes FROM audio_files WHERE audiobook_id = ? ORDER BY part_number',
      [book.id]
    );
    book.parts = files;

    // Fetch all genres (primary + extra)
    const [extraGenres] = await pool.query(
      `SELECT g.id, g.slug, g.name_lv, g.name_ru, g.name_en
       FROM audiobook_genres ag JOIN genres g ON g.id = ag.genre_id
       WHERE ag.audiobook_id = ?`,
      [book.id]
    );
    book.genres = extraGenres;

    // If user is logged in, add their progress
    if (req.user) {
      const [prog] = await pool.query(
        'SELECT progress_sec, file_id, completed FROM listening_history WHERE user_id = ? AND audiobook_id = ?',
        [req.user.id, book.id]
      );
      book.user_progress = prog[0] || null;

      const [userReview] = await pool.query(
        'SELECT id, rating, comment, created_at FROM reviews WHERE user_id = ? AND audiobook_id = ? AND is_deleted = 0',
        [req.user.id, book.id]
      );
      book.user_review = userReview[0] || null;
    }

    // Increment listen count (async, don't await)
    pool.query('UPDATE audiobooks SET listen_count = listen_count + 1 WHERE id = ?', [book.id]);

    res.json({ book });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch book' });
  }
});

// ── POST /api/books — upload new book ─────────────────────
router.post('/', authenticate,
  uploadBook.fields([{ name: 'cover', maxCount: 1 }, { name: 'audio_files', maxCount: 20 }]),
  async (req, res) => {
    try {
      const { title, description, genre_ids, language_id, is_public = 1, parts_meta } = req.body;

      if (!title)       return res.status(400).json({ error: 'Title is required' });
      if (!language_id) return res.status(400).json({ error: 'Language is required' });
      if (!req.files?.audio_files?.length) return res.status(400).json({ error: 'At least one audio file is required' });

      // Parse genre IDs (comma-separated string or array)
      let genreIds = [];
      if (genre_ids) {
        genreIds = String(genre_ids).split(',').map(Number).filter(Boolean);
      }
      const primaryGenre = genreIds[0] || null;

      const cover_url = req.files?.cover?.[0]
        ? `/uploads/covers/${req.files.cover[0].filename}`
        : null;

      const [result] = await pool.query(
        `INSERT INTO audiobooks (author_id, title, description, genre_id, language_id, cover_url, is_public, moderation_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [req.user.id, title, description || null, primaryGenre, language_id || null, cover_url, is_public ? 1 : 0]
      );
      const bookId = result.insertId;

      // Save extra genres to audiobook_genres
      if (genreIds.length > 0) {
        for (const gid of genreIds) {
          await pool.query(
            'INSERT IGNORE INTO audiobook_genres (audiobook_id, genre_id) VALUES (?, ?)',
            [bookId, gid]
          );
        }
      }

      // Parse per-part metadata if provided (JSON array)
      let metaArr = [];
      try { metaArr = parts_meta ? JSON.parse(parts_meta) : []; } catch {}

      let totalDuration = 0;
      for (let i = 0; i < req.files.audio_files.length; i++) {
        const f    = req.files.audio_files[i];
        const meta = metaArr[i] || {};
        const dur  = parseInt(meta.duration_sec) || 0;
        totalDuration += dur;
        await pool.query(
          `INSERT INTO audio_files (audiobook_id, part_number, part_title, file_path, file_size_bytes, duration_sec)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [bookId, i + 1, meta.part_title || `Part ${i + 1}`, `/uploads/audio/${f.filename}`, f.size, dur]
        );
      }

      if (totalDuration > 0) {
        await pool.query('UPDATE audiobooks SET duration_sec = ? WHERE id = ?', [totalDuration, bookId]);
      }

      const [book] = await pool.query('SELECT * FROM audiobooks WHERE id = ?', [bookId]);
      res.status(201).json({ book: book[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to upload book' });
    }
  }
);

// ── PUT /api/books/:id — edit book (author or admin) ──────
router.put('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM audiobooks WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Book not found' });

    const book    = rows[0];
    const isOwner = book.author_id === req.user.id;
    const isAdmin = ['admin', 'moderator'].includes(req.user.role);
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Not allowed' });

    const { title, description, genre_ids, language_id, is_public } = req.body;
    const updates = []; const values = [];

    // Parse genre_ids
    let genreIds = [];
    if (genre_ids) genreIds = String(genre_ids).split(',').map(Number).filter(Boolean);
    const primaryGenre = genreIds[0] || null;

    if (title !== undefined)       { updates.push('title = ?');       values.push(title); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (genre_ids !== undefined)   { updates.push('genre_id = ?');    values.push(primaryGenre); }
    if (language_id !== undefined) { updates.push('language_id = ?'); values.push(language_id || null); }
    if (is_public !== undefined)   { updates.push('is_public = ?');   values.push(is_public ? 1 : 0); }

    if (updates.length) {
      values.push(req.params.id);
      await pool.query(`UPDATE audiobooks SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    // Update audiobook_genres
    if (genre_ids !== undefined) {
      await pool.query('DELETE FROM audiobook_genres WHERE audiobook_id = ?', [req.params.id]);
      for (const gid of genreIds) {
        await pool.query(
          'INSERT IGNORE INTO audiobook_genres (audiobook_id, genre_id) VALUES (?, ?)',
          [req.params.id, gid]
        );
      }
    }

    const [updated] = await pool.query('SELECT * FROM audiobooks WHERE id = ?', [req.params.id]);
    res.json({ book: updated[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update book' });
  }
});

// ── DELETE /api/books/:id — soft delete ───────────────────
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM audiobooks WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Book not found' });

    const isOwner = rows[0].author_id === req.user.id;
    const isAdmin = ['admin', 'moderator'].includes(req.user.role);
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Not allowed' });

    await pool.query('UPDATE audiobooks SET is_deleted = 1 WHERE id = ?', [req.params.id]);

    if (isAdmin && req.user.id !== rows[0].author_id) {
      await pool.query(
        `INSERT INTO moderation_log (moderator_id, action, object_type, object_id, reason)
         VALUES (?, 'delete_book', 'audiobook', ?, ?)`,
        [req.user.id, req.params.id, req.body.reason || null]
      );
    }

    res.json({ message: 'Book deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

// ── GET /api/books/:id/stream/:fileId — stream audio ──────
router.get('/:id/stream/:fileId', optionalAuth, async (req, res) => {
  try {
    const [files] = await pool.query(
      'SELECT * FROM audio_files WHERE id = ? AND audiobook_id = ?',
      [req.params.fileId, req.params.id]
    );
    if (!files.length) return res.status(404).json({ error: 'File not found' });

    const filePath = path.resolve(__dirname, '../..', files[0].file_path.replace(/^\//, ''));
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Audio file missing' });

    const stat = fs.statSync(filePath);
    const range = req.headers.range;

    if (range) {
      const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
      const start = parseInt(startStr, 10);
      const end   = endStr ? parseInt(endStr, 10) : stat.size - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range':  `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges':  'bytes',
        'Content-Length': chunkSize,
        'Content-Type':   'audio/mpeg',
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': stat.size,
        'Content-Type':   'audio/mpeg',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    res.status(500).json({ error: 'Streaming failed' });
  }
});

// ── GET /api/books/genres — all genres ────────────────────
router.get('/meta/genres', async (req, res) => {
  const [genres] = await pool.query('SELECT * FROM genres ORDER BY name_en');
  res.json({ genres });
});

// ── GET /api/books/meta/languages ─────────────────────────
router.get('/meta/languages', async (req, res) => {
  const [languages] = await pool.query('SELECT * FROM languages ORDER BY name_en');
  res.json({ languages });
});

// ── GET /api/books/meta/stats — public platform stats ─────
router.get('/meta/stats', async (req, res) => {
  try {
    const [[books]]   = await pool.query('SELECT COUNT(*) AS total FROM audiobooks WHERE is_deleted = 0 AND is_public = 1');
    const [[users]]   = await pool.query('SELECT COUNT(*) AS total FROM users');
    res.json({ books: books.total, users: users.total });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── GET /api/books/:id/download — download all audio as ZIP ─
router.get('/:id/download', optionalAuth, async (req, res) => {
  try {
    const [books] = await pool.query(
      'SELECT id, title, is_public, is_deleted, moderation_status FROM audiobooks WHERE id = ?',
      [req.params.id]
    );
    if (!books.length || books[0].is_deleted) return res.status(404).json({ error: 'Not found' });
    if (!books[0].is_public || books[0].moderation_status !== 'approved')
      return res.status(403).json({ error: 'Not available' });

    const [files] = await pool.query(
      'SELECT part_number, part_title, file_path FROM audio_files WHERE audiobook_id = ? ORDER BY part_number',
      [req.params.id]
    );
    if (!files.length) return res.status(404).json({ error: 'No audio files' });

    const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads');

    // Build ZIP manually using Node.js built-ins
    // Use yazl if available, otherwise stream files individually
    let yazl;
    try { yazl = require('yazl'); } catch(e) { yazl = null; }

    if (yazl) {
      const zipfile = new yazl.ZipFile();
      const safeName = books[0].title.replace(/[^\w\s\-]/g, '').trim() || 'audiobook';
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeName)}.zip"`);
      zipfile.outputStream.pipe(res);

      for (const f of files) {
        const relativePath = f.file_path.replace(/^\/uploads\//, '');
        const fullPath = path.join(UPLOAD_ROOT, relativePath);
        if (fs.existsSync(fullPath)) {
          const ext = path.extname(f.file_path);
          const fileName = `${f.part_number}. ${f.part_title || 'Part ' + f.part_number}${ext}`;
          zipfile.addFile(fullPath, fileName);
        }
      }
      zipfile.end();
    } else {
      // Fallback: if only one file, stream it directly
      if (files.length === 1) {
        const f = files[0];
        const relativePath = f.file_path.replace(/^\/uploads\//, '');
        const fullPath = path.join(UPLOAD_ROOT, relativePath);
        if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'File not found' });
        const ext = path.extname(f.file_path);
        const safeName = (f.part_title || books[0].title).replace(/[^\w\s\-]/g, '').trim();
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeName)}${ext}"`);
        fs.createReadStream(fullPath).pipe(res);
      } else {
        return res.status(500).json({ error: 'ZIP library not installed. Run: npm install yazl' });
      }
    }
  } catch (err) {
    console.error('Download error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Download failed' });
  }
});
router.post('/:id/recalc-duration', authenticate, async (req, res) => {
  try {
    const [files] = await pool.query(
      'SELECT id, file_path FROM audio_files WHERE audiobook_id = ?',
      [req.params.id]
    );
    let total = 0;
    for (const f of files) {
      const fullPath = path.resolve(__dirname, '../..', f.file_path.replace(/^\//, ''));
      const dur = await getAudioDuration(fullPath);
      await pool.query('UPDATE audio_files SET duration_sec = ? WHERE id = ?', [dur, f.id]);
      total += dur;
    }
    await pool.query('UPDATE audiobooks SET duration_sec = ? WHERE id = ?', [total, req.params.id]);
    res.json({ duration_sec: total, parts: files.length });
  } catch (err) {
    res.status(500).json({ error: 'Recalc failed' });
  }
});

module.exports = router;
