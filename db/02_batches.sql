-- =====================================================================
-- MaziwaTrack sample data: batches
-- Database: maziwa-track.  Run AFTER schema.sql, in this order:
--   01_users.sql -> 02_batches.sql -> 03_payments.sql -> 04_audit_logs.sql
-- (each file needs the rows from the files before it)
--
-- 25 milk deliveries, 20-27 Oct 2026, covering every stage:
--   6 recorded (waiting for the grader)   4 passed (waiting for admin approval)
--   3 rejected (failed quality test)     12 paid (approved, with payment)
-- Batch numbers follow the app's rule: MT-<Kenyan date>-<batch_id as 4 digits>.
-- Times are stored in UTC (Kenya time is 3 hours ahead).
-- =====================================================================
USE `maziwatrack_db`;
SET NAMES utf8mb4;
START TRANSACTION;

INSERT INTO batches (batch_id, batch_number, farmer_id, declared_litres, status, delivered_at, grader_id, measured_litres, quality_result, grader_notes, tested_at) VALUES
  (1, 'MT-20261020-0001', 3, 30.50, 'paid', '2026-10-20 05:05:00', 2, 30.00, 'pass', 'Measured less than declared', '2026-10-20 07:23:00'),
  (2, 'MT-20261020-0002', 4, 22.00, 'paid', '2026-10-20 05:01:00', 2, 22.00, 'pass', 'Good quality', '2026-10-20 07:28:00'),
  (3, 'MT-20261021-0003', 5, 30.50, 'paid', '2026-10-21 03:27:00', 2, 29.50, 'pass', 'Measured less than declared', '2026-10-21 05:52:00'),
  (4, 'MT-20261021-0004', 6, 28.50, 'paid', '2026-10-21 06:36:00', 2, 28.50, 'pass', NULL, '2026-10-21 08:12:00'),
  (5, 'MT-20261022-0005', 7, 35.00, 'paid', '2026-10-22 03:45:00', 2, 34.50, 'pass', 'Measured less than declared', '2026-10-22 05:54:00'),
  (6, 'MT-20261022-0006', 8, 28.50, 'paid', '2026-10-22 03:40:00', 2, 28.50, 'pass', 'Good quality', '2026-10-22 06:14:00'),
  (7, 'MT-20261022-0007', 9, 25.00, 'paid', '2026-10-22 06:51:00', 2, 25.00, 'pass', NULL, '2026-10-22 08:09:00'),
  (8, 'MT-20261022-0008', 15, 30.00, 'rejected', '2026-10-22 06:51:00', 2, 30.00, 'reject', 'Failed alcohol test', '2026-10-22 09:03:00'),
  (9, 'MT-20261023-0009', 10, 28.00, 'paid', '2026-10-23 05:44:00', 2, 27.00, 'pass', 'Measured less than declared', '2026-10-23 08:11:00'),
  (10, 'MT-20261023-0010', 11, 28.00, 'paid', '2026-10-23 05:20:00', 2, 28.00, 'pass', 'Good quality', '2026-10-23 07:52:00'),
  (11, 'MT-20261023-0011', 16, 20.00, 'rejected', '2026-10-23 06:04:00', 2, 20.00, 'reject', 'Sour smell, temperature too high', '2026-10-23 08:10:00'),
  (12, 'MT-20261024-0012', 12, 25.00, 'paid', '2026-10-24 04:47:00', 2, 25.00, 'pass', NULL, '2026-10-24 06:47:00'),
  (13, 'MT-20261024-0013', 13, 18.00, 'paid', '2026-10-24 03:39:00', 2, 18.00, 'pass', 'Good quality', '2026-10-24 05:18:00'),
  (14, 'MT-20261024-0014', 14, 35.50, 'paid', '2026-10-24 03:20:00', 2, 34.50, 'pass', 'Measured less than declared', '2026-10-24 05:28:00'),
  (15, 'MT-20261025-0015', 17, 30.00, 'rejected', '2026-10-25 04:38:00', 2, 30.00, 'reject', 'Adulterated with water', '2026-10-25 06:04:00'),
  (16, 'MT-20261025-0016', 18, 15.50, 'passed', '2026-10-25 04:59:00', 2, 15.00, 'pass', 'Measured less than declared', '2026-10-25 07:31:00'),
  (17, 'MT-20261026-0017', 19, 15.50, 'passed', '2026-10-26 06:51:00', 2, 15.50, 'pass', NULL, '2026-10-26 08:15:00'),
  (18, 'MT-20261026-0018', 20, 12.00, 'passed', '2026-10-26 06:56:00', 2, 12.00, 'pass', NULL, '2026-10-26 09:18:00'),
  (19, 'MT-20261026-0019', 21, 20.00, 'passed', '2026-10-26 06:20:00', 2, 19.50, 'pass', 'Measured less than declared', '2026-10-26 08:27:00'),
  (20, 'MT-20261027-0020', 22, 35.00, 'recorded', '2026-10-27 06:36:00', NULL, NULL, NULL, NULL, NULL),
  (21, 'MT-20261027-0021', 23, 30.00, 'recorded', '2026-10-27 04:37:00', NULL, NULL, NULL, NULL, NULL),
  (22, 'MT-20261027-0022', 24, 22.00, 'recorded', '2026-10-27 06:39:00', NULL, NULL, NULL, NULL, NULL),
  (23, 'MT-20261027-0023', 25, 12.50, 'recorded', '2026-10-27 04:43:00', NULL, NULL, NULL, NULL, NULL),
  (24, 'MT-20261027-0024', 3, 18.50, 'recorded', '2026-10-27 06:02:00', NULL, NULL, NULL, NULL, NULL),
  (25, 'MT-20261027-0025', 4, 30.00, 'recorded', '2026-10-27 04:02:00', NULL, NULL, NULL, NULL, NULL);

COMMIT;

-- Verification (read-only)
-- Expected: recorded 6, passed 4, rejected 3, paid 12 (total 25)
SELECT status, COUNT(*) AS batches FROM batches
GROUP BY status ORDER BY FIELD(status,'recorded','passed','rejected','paid');
SELECT b.batch_number, u.full_name AS farmer, b.declared_litres, b.measured_litres, b.status
FROM batches b JOIN users u ON u.user_id = b.farmer_id ORDER BY b.batch_id;
