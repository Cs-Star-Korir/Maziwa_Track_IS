-- =====================================================================
-- MaziwaTrack sample data: payments
-- PostgreSQL / Supabase. Run AFTER schema.sql (Supabase → SQL Editor), in this order:
--   01_users.sql -> 02_batches.sql -> 03_payments.sql -> 04_audit_logs.sql
-- (each file needs the rows from the files before it)
--
-- 12 payments, one for each 'paid' batch, at KSh 50 per litre.
-- References follow the app's rule: PAY-<Kenyan date>-<payment_id as 4 digits>.
-- =====================================================================
SET TIME ZONE 'UTC';   -- the times below are UTC (Kenya time is 3 hours ahead)
BEGIN;

INSERT INTO payments (payment_id, batch_id, admin_id, price_per_litre, payment_reference, email_sent, approved_at) VALUES
  (1, 1, 1, 50.00, 'PAY-20261021-0001', TRUE, '2026-10-21 09:19:00'),
  (2, 2, 1, 50.00, 'PAY-20261021-0002', TRUE, '2026-10-21 11:23:00'),
  (3, 3, 1, 50.00, 'PAY-20261022-0003', TRUE, '2026-10-22 08:46:00'),
  (4, 4, 1, 50.00, 'PAY-20261022-0004', TRUE, '2026-10-22 08:57:00'),
  (5, 5, 1, 50.00, 'PAY-20261023-0005', TRUE, '2026-10-23 07:48:00'),
  (6, 6, 1, 50.00, 'PAY-20261023-0006', TRUE, '2026-10-23 08:49:00'),
  (7, 7, 1, 50.00, 'PAY-20261023-0007', TRUE, '2026-10-23 08:18:00'),
  (8, 9, 1, 50.00, 'PAY-20261024-0008', TRUE, '2026-10-24 09:04:00'),
  (9, 10, 1, 50.00, 'PAY-20261024-0009', TRUE, '2026-10-24 09:19:00'),
  (10, 12, 1, 50.00, 'PAY-20261025-0010', TRUE, '2026-10-25 10:24:00'),
  (11, 13, 1, 50.00, 'PAY-20261025-0011', TRUE, '2026-10-25 07:27:00'),
  (12, 14, 1, 50.00, 'PAY-20261025-0012', TRUE, '2026-10-25 06:58:00');

-- The ids above were set by hand, so move the id counter past them.
-- Without this, the next new row would try id 1 and fail with a duplicate key error.
SELECT setval(pg_get_serial_sequence('payments', 'payment_id'), (SELECT MAX(payment_id) FROM payments));

COMMIT;

-- Verification (read-only)
-- Expected: 12 rows
SELECT COUNT(*) AS payments FROM payments;

-- Expected: no rows (every paid batch has exactly one payment, and only paid batches do)
SELECT b.batch_number, b.status, p.payment_reference
FROM batches b LEFT JOIN payments p ON p.batch_id = b.batch_id
WHERE (b.status = 'paid') <> (p.payment_id IS NOT NULL);

SELECT p.payment_reference, u.full_name AS farmer, b.measured_litres,
       p.price_per_litre, ROUND(b.measured_litres * p.price_per_litre, 2) AS amount_ksh
FROM payments p
JOIN batches b ON b.batch_id = p.batch_id
JOIN users u ON u.user_id = b.farmer_id
ORDER BY p.payment_id;