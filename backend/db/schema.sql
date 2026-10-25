-- =====================================================================
-- MaziwaTrack database schema
-- Database: maziwa-track   (MySQL 8.0.16+ or MariaDB 10.4+, e.g. XAMPP)
-- Tables:   users, batches, payments, audit_logs (3NF)
--
-- Safe to run more than once: it only creates what does not exist yet.
-- The verification queries at the end only read; they change nothing.
-- Note: the hyphen in the name means it must be written `maziwa-track`
--       (with backticks) inside SQL.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `maziwa-track`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `maziwa-track`;

-- Everyone who logs in. Only farmers register themselves;
-- grader and admin accounts are added by the system administrator.
CREATE TABLE IF NOT EXISTS users (
  user_id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  phone         VARCHAR(20)  NOT NULL,
  password_hash TEXT NOT NULL,                       -- bcrypt hash, never the plain password
  role          ENUM('farmer','grader','admin') NOT NULL DEFAULT 'farmer',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One milk delivery. The grader columns stay NULL until the batch is tested.
CREATE TABLE IF NOT EXISTS batches (
  batch_id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  batch_number    VARCHAR(20) NOT NULL,              -- e.g. MT-20261019-0007
  farmer_id       INT UNSIGNED NOT NULL,
  declared_litres DECIMAL(8,2) NOT NULL,
  status          ENUM('recorded','passed','rejected','paid') NOT NULL DEFAULT 'recorded',
  delivered_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  grader_id       INT UNSIGNED NULL,
  measured_litres DECIMAL(8,2) NULL,
  quality_result  ENUM('pass','reject') NULL,
  grader_notes    TEXT NULL,
  tested_at       TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (batch_id),
  UNIQUE KEY uq_batches_number (batch_number),
  CONSTRAINT fk_batches_farmer FOREIGN KEY (farmer_id) REFERENCES users (user_id),
  CONSTRAINT fk_batches_grader FOREIGN KEY (grader_id) REFERENCES users (user_id),
  CONSTRAINT chk_declared_litres CHECK (declared_litres > 0),
  CONSTRAINT chk_measured_litres CHECK (measured_litres IS NULL OR measured_litres > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One payment per passed batch.
-- Amount = measured_litres x price_per_litre (calculated, not stored).
CREATE TABLE IF NOT EXISTS payments (
  payment_id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  batch_id          INT UNSIGNED NOT NULL,
  admin_id          INT UNSIGNED NOT NULL,
  price_per_litre   DECIMAL(8,2) NOT NULL,
  payment_reference VARCHAR(30) NOT NULL,            -- e.g. PAY-20261018-0009
  email_sent        BOOLEAN NOT NULL DEFAULT FALSE,
  approved_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (payment_id),
  UNIQUE KEY uq_payments_batch (batch_id),
  UNIQUE KEY uq_payments_reference (payment_reference),
  CONSTRAINT fk_payments_batch FOREIGN KEY (batch_id) REFERENCES batches (batch_id),
  CONSTRAINT fk_payments_admin FOREIGN KEY (admin_id) REFERENCES users (user_id),
  CONSTRAINT chk_price_per_litre CHECK (price_per_litre > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Who did what, and what changed. Rows are only ever added, never edited.
CREATE TABLE IF NOT EXISTS audit_logs (
  log_id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  action     VARCHAR(50) NOT NULL,                   -- e.g. LOGIN, RECORD_DELIVERY, APPROVE_PAYMENT
  table_name VARCHAR(50) NULL,
  record_id  INT UNSIGNED NULL,
  old_value  JSON NULL,
  new_value  JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (log_id),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================================
-- Verification (read-only)
-- Each row's "found" should equal "expected".
-- =====================================================================

SELECT 'Tables' AS what_is_checked, COUNT(*) AS found, 4 AS expected
  FROM information_schema.tables
  WHERE table_schema = 'maziwa-track'
UNION ALL
SELECT 'Foreign keys', COUNT(*), 5
  FROM information_schema.referential_constraints
  WHERE constraint_schema = 'maziwa-track'
UNION ALL
SELECT 'Check rules', COUNT(*), 3
  FROM information_schema.table_constraints
  WHERE constraint_schema = 'maziwa-track' AND constraint_type = 'CHECK'
    AND constraint_name LIKE 'chk\_%'
UNION ALL
-- 1 = MySQL rejects bad values (e.g. role 'boss') instead of saving a blank
SELECT 'Strict mode on', (@@GLOBAL.sql_mode LIKE '%STRICT%'), 1;

-- Table structures
SHOW TABLES;
DESCRIBE users;
DESCRIBE batches;
DESCRIBE payments;
DESCRIBE audit_logs;

-- Row counts (all should be 0 until the app is used)
SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users
UNION ALL SELECT 'batches', COUNT(*) FROM batches
UNION ALL SELECT 'payments', COUNT(*) FROM payments
UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs;
