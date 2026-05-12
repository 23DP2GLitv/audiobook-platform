// backend/middleware/upload.js
const multer = require('multer');
const path   = require('path');
const { v4: uuidv4 } = require('uuid');
const fs     = require('fs');

const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');

// Ensure dirs exist
['audio', 'covers'].forEach(dir => {
  const p = path.join(UPLOAD_DIR, dir);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(UPLOAD_DIR, 'audio')),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(UPLOAD_DIR, 'covers')),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const audioFilter = (req, file, cb) => {
  const allowed = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) return cb(null, true);
  cb(new Error('Only audio files are allowed (mp3, wav, ogg, m4a, aac, flac)'));
};

const coverFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) return cb(null, true);
  cb(new Error('Only image files are allowed (jpg, png, webp)'));
};

const maxAudioMB = parseInt(process.env.MAX_AUDIO_SIZE_MB || 500);
const maxCoverMB = parseInt(process.env.MAX_COVER_SIZE_MB || 5);

const uploadAudio = multer({
  storage:  audioStorage,
  fileFilter: audioFilter,
  limits:   { fileSize: maxAudioMB * 1024 * 1024 }
});

const uploadCover = multer({
  storage:  coverStorage,
  fileFilter: coverFilter,
  limits:   { fileSize: maxCoverMB * 1024 * 1024 }
});

// For uploading book: cover + multiple audio files
const uploadBook = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = file.fieldname === 'cover' ? 'covers' : 'audio';
      cb(null, path.join(UPLOAD_DIR, dir));
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    }
  }),
  limits: { fileSize: maxAudioMB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'cover') return coverFilter(req, file, cb);
    if (file.fieldname === 'audio_files') return audioFilter(req, file, cb);
    cb(new Error('Unexpected field: ' + file.fieldname));
  }
});

module.exports = { uploadAudio, uploadCover, uploadBook };
