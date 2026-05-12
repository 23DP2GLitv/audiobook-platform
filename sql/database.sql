-- ============================================================
-- AudioBook Platform — Database Schema
-- MySQL 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS audiobook_platform
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE audiobook_platform;

-- ------------------------------------------------------------
-- 1. GENRES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS genres (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug        VARCHAR(50)  NOT NULL UNIQUE,
  name_lv     VARCHAR(100) NOT NULL,
  name_ru     VARCHAR(100) NOT NULL,
  name_en     VARCHAR(100) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO genres (slug, name_lv, name_ru, name_en) VALUES
  ('fiction',      'Daiļliteratūra',   'Художественная литература', 'Fiction'),
  ('non-fiction',  'Publicistika',      'Нон-фикшн',                 'Non-Fiction'),
  ('science',      'Zinātne',           'Наука',                     'Science'),
  ('fantasy',      'Fantāzija',         'Фэнтези',                   'Fantasy'),
  ('mystery',      'Detektīvs',         'Детектив',                  'Mystery'),
  ('romance',      'Romantika',         'Романтика',                 'Romance'),
  ('thriller',     'Trileris',          'Триллер',                   'Thriller'),
  ('biography',    'Biogrāfija',        'Биография',                 'Biography'),
  ('history',      'Vēsture',           'История',                   'History'),
  ('children',     'Bērnu grāmatas',   'Детские книги',             'Children'),
  ('education',    'Izglītība',         'Образование',               'Education'),
  ('psychology',   'Psiholoģija',       'Психология',                'Psychology'),
  ('business',     'Bizness',           'Бизнес',                    'Business'),
  ('poetry',       'Dzeja',             'Поэзия',                    'Poetry'),
  ('other',        'Cits',              'Другое',                    'Other');

-- ------------------------------------------------------------
-- 2. LANGUAGES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS languages (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(10)  NOT NULL UNIQUE,
  name_lv     VARCHAR(100) NOT NULL,
  name_ru     VARCHAR(100) NOT NULL,
  name_en     VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

INSERT INTO languages (code, name_lv, name_ru, name_en) VALUES
  ('lv', 'Latviešu',  'Латышский',   'Latvian'),
  ('ru', 'Krievu',    'Русский',     'Russian'),
  ('en', 'Angļu',     'Английский',  'English'),
  ('de', 'Vācu',      'Немецкий',    'German'),
  ('fr', 'Franču',    'Французский', 'French'),
  ('other', 'Cita',   'Другой',      'Other');

-- ------------------------------------------------------------
-- 3. USERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email           VARCHAR(255) NOT NULL UNIQUE,
  username        VARCHAR(50)  NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  role            ENUM('user','moderator','admin') NOT NULL DEFAULT 'user',
  avatar_url      VARCHAR(500) DEFAULT NULL,
  bio             TEXT         DEFAULT NULL,
  is_blocked      TINYINT(1)   NOT NULL DEFAULT 0,
  block_reason    VARCHAR(500) DEFAULT NULL,
  ui_language     ENUM('lv','ru','en') NOT NULL DEFAULT 'lv',
  registered_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at   TIMESTAMP    DEFAULT NULL,
  INDEX idx_role (role),
  INDEX idx_email (email)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 4. AUDIOBOOKS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audiobooks (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  author_id       INT UNSIGNED NOT NULL,
  title           VARCHAR(300) NOT NULL,
  description     TEXT         DEFAULT NULL,
  genre_id        INT UNSIGNED DEFAULT NULL,
  language_id     INT UNSIGNED DEFAULT NULL,
  cover_url       VARCHAR(500) DEFAULT NULL,
  duration_sec    INT UNSIGNED NOT NULL DEFAULT 0,   -- total seconds
  rating          DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  review_count    INT UNSIGNED NOT NULL DEFAULT 0,
  listen_count    INT UNSIGNED NOT NULL DEFAULT 0,
  download_count  INT UNSIGNED NOT NULL DEFAULT 0,
  is_public       TINYINT(1)   NOT NULL DEFAULT 1,
  is_deleted      TINYINT(1)   NOT NULL DEFAULT 0,
  published_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id)   REFERENCES users(id)      ON DELETE CASCADE,
  FOREIGN KEY (genre_id)    REFERENCES genres(id)     ON DELETE SET NULL,
  FOREIGN KEY (language_id) REFERENCES languages(id)  ON DELETE SET NULL,
  INDEX idx_author   (author_id),
  INDEX idx_genre    (genre_id),
  INDEX idx_public   (is_public, is_deleted),
  INDEX idx_rating   (rating DESC),
  FULLTEXT idx_search (title, description)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 5. AUDIO FILES (chapters / parts)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audio_files (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  audiobook_id    INT UNSIGNED NOT NULL,
  part_number     SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  part_title      VARCHAR(300) DEFAULT NULL,
  file_path       VARCHAR(500) NOT NULL,
  file_size_bytes BIGINT UNSIGNED DEFAULT 0,
  duration_sec    INT UNSIGNED NOT NULL DEFAULT 0,
  uploaded_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (audiobook_id) REFERENCES audiobooks(id) ON DELETE CASCADE,
  INDEX idx_book_part (audiobook_id, part_number)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 6. REVIEWS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  audiobook_id    INT UNSIGNED NOT NULL,
  user_id         INT UNSIGNED NOT NULL,
  rating          TINYINT UNSIGNED NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT DEFAULT NULL,
  is_deleted      TINYINT(1) NOT NULL DEFAULT 0,
  delete_reason   VARCHAR(500) DEFAULT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (audiobook_id) REFERENCES audiobooks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)      REFERENCES users(id)      ON DELETE CASCADE,
  UNIQUE KEY unique_user_book (user_id, audiobook_id),
  INDEX idx_book   (audiobook_id),
  INDEX idx_user   (user_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 7. LISTENING HISTORY
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listening_history (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED NOT NULL,
  audiobook_id    INT UNSIGNED NOT NULL,
  file_id         INT UNSIGNED DEFAULT NULL,   -- which chapter
  progress_sec    INT UNSIGNED NOT NULL DEFAULT 0,
  completed       TINYINT(1)   NOT NULL DEFAULT 0,
  listened_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)     REFERENCES users(id)       ON DELETE CASCADE,
  FOREIGN KEY (audiobook_id) REFERENCES audiobooks(id) ON DELETE CASCADE,
  FOREIGN KEY (file_id)     REFERENCES audio_files(id) ON DELETE SET NULL,
  UNIQUE KEY unique_user_book (user_id, audiobook_id),
  INDEX idx_user_time (user_id, listened_at DESC)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 8. DOWNLOADS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS downloads (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED NOT NULL,
  audiobook_id    INT UNSIGNED NOT NULL,
  downloaded_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)      REFERENCES users(id)       ON DELETE CASCADE,
  FOREIGN KEY (audiobook_id) REFERENCES audiobooks(id)  ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_book (audiobook_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 9. USER STATS  (denormalized for performance)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_stats (
  user_id             INT UNSIGNED PRIMARY KEY,
  books_listened      INT UNSIGNED NOT NULL DEFAULT 0,
  total_hours         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  books_published     INT UNSIGNED NOT NULL DEFAULT 0,
  total_reviews_left  INT UNSIGNED NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 10. MODERATION LOG
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS moderation_log (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  moderator_id    INT UNSIGNED NOT NULL,
  action          ENUM('delete_book','delete_review','block_user',
                       'unblock_user','change_role','restore_book',
                       'restore_review','warn_user') NOT NULL,
  object_type     ENUM('user','audiobook','review') NOT NULL,
  object_id       INT UNSIGNED NOT NULL,
  reason          VARCHAR(500) DEFAULT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_mod  (moderator_id),
  INDEX idx_time (created_at DESC)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 11. NOTIFICATIONS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  type        ENUM('review','moderation','system','welcome') NOT NULL DEFAULT 'system',
  title_lv    VARCHAR(300) NOT NULL,
  title_ru    VARCHAR(300) NOT NULL,
  title_en    VARCHAR(300) NOT NULL,
  body_lv     TEXT,
  body_ru     TEXT,
  body_en     TEXT,
  is_read     TINYINT(1) NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_unread (user_id, is_read)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- TRIGGERS — auto-update rating & counts
-- ------------------------------------------------------------

DELIMITER $$

-- After insert review: recalc rating
CREATE TRIGGER trg_review_insert
AFTER INSERT ON reviews
FOR EACH ROW
BEGIN
  UPDATE audiobooks
  SET rating       = (SELECT AVG(rating) FROM reviews WHERE audiobook_id = NEW.audiobook_id AND is_deleted = 0),
      review_count = (SELECT COUNT(*)    FROM reviews WHERE audiobook_id = NEW.audiobook_id AND is_deleted = 0)
  WHERE id = NEW.audiobook_id;
  UPDATE user_stats SET total_reviews_left = total_reviews_left + 1 WHERE user_id = NEW.user_id;
END$$

-- After update review (soft delete): recalc rating
CREATE TRIGGER trg_review_update
AFTER UPDATE ON reviews
FOR EACH ROW
BEGIN
  UPDATE audiobooks
  SET rating       = (SELECT COALESCE(AVG(rating),0) FROM reviews WHERE audiobook_id = NEW.audiobook_id AND is_deleted = 0),
      review_count = (SELECT COUNT(*)                FROM reviews WHERE audiobook_id = NEW.audiobook_id AND is_deleted = 0)
  WHERE id = NEW.audiobook_id;
END$$

-- After download: increment counter
CREATE TRIGGER trg_download_insert
AFTER INSERT ON downloads
FOR EACH ROW
BEGIN
  UPDATE audiobooks SET download_count = download_count + 1 WHERE id = NEW.audiobook_id;
END$$

-- Init user_stats on new user
CREATE TRIGGER trg_user_insert
AFTER INSERT ON users
FOR EACH ROW
BEGIN
  INSERT INTO user_stats (user_id) VALUES (NEW.id);
END$$

-- Increment books_published when book added
CREATE TRIGGER trg_book_insert
AFTER INSERT ON audiobooks
FOR EACH ROW
BEGIN
  UPDATE user_stats SET books_published = books_published + 1 WHERE user_id = NEW.author_id;
END$$

DELIMITER ;

-- ------------------------------------------------------------
-- DEFAULT ADMIN USER  (password: Admin1234!)
-- Change this immediately after first login!
-- bcrypt hash of 'Admin1234!'
-- ------------------------------------------------------------
INSERT INTO users (email, username, password_hash, role)
VALUES ('admin@audiobooks.lv', 'admin',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGTGxbNxBjJUMJg.K4H0D5Q0Iru',
        'admin');
