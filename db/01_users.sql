-- =====================================================================
-- MaziwaTrack sample data: users
-- PostgreSQL / Supabase. Run AFTER schema.sql (Supabase → SQL Editor), in this order:
--   01_users.sql -> 02_batches.sql -> 03_payments.sql -> 04_audit_logs.sql
-- (each file needs the rows from the files before it)
--
-- 26 users: 1 admin, 2 graders, 23 farmers.
-- Every account's password is:  Password123


SET TIME ZONE 'UTC';   -- the times below are UTC (Kenya time is 3 hours ahead)
BEGIN;

INSERT INTO users (user_id, full_name, email, phone, password_hash, role, created_at) VALUES
  (1, 'Grace Njeri', 'grace.njeri@example.com', '0712 221 427', '$2b$10$lDayvRYtLaZUjb0BlVGTKuvGqdYCK6SePNP2cGwLAE6Do0bku1v5m', 'admin', '2026-10-15 06:23:00'),
  (2, 'Peter Otieno', 'peter.otieno@example.com', '0713 614 624', '$2b$10$lDayvRYtLaZUjb0BlVGTKuvGqdYCK6SePNP2cGwLAE6Do0bku1v5m', 'grader', '2026-10-15 06:46:00'),
  (26, 'Petero Ndungu', 'petero.ndungu@example.com', '0713 145 624', '$2b$10$lDayvRYtLaZUjb0BlVGTKuvGqdYCK6SePNP2cGwLAE6Do0bku1v5m', 'grader', '2026-10-15 06:46:00'),
  (3, 'Wanjiku Mwangi', 'wanjiku.mwangi@example.com', '0714 762 980', '$2b$10$lDayvRYtLaZUjb0BlVGTKuvGqdYCK6SePNP2cGwLAE6Do0bku1v5m', 'farmer', '2026-10-15 07:09:00'),
  (4, 'Kamau Njoroge', 'kamau.njoroge@example.com', '0715 205 328', '$2b$10$lDayvRYtLaZUjb0BlVGTKuvGqdYCK6SePNP2cGwLAE6Do0bku1v5m', 'farmer', '2026-10-15 07:32:00'),
  (5, 'Achieng Odhiambo', 'achieng.odhiambo@example.com', '0716 715 736', '$2b$10$lDayvRYtLaZUjb0BlVGTKuvGqdYCK6SePNP2cGwLAE6Do0bku1v5m', 'farmer', '2026-10-15 07:55:00'),
  (6, 'Kiprop Rotich', 'kiprop.rotich@example.com', '0717 669 530', '$2b$10$lDayvRYtLaZUjb0BlVGTKuvGqdYCK6SePNP2cGwLAE6Do0bku1v5m', 'farmer', '2026-10-15 08:18:00'),
  (7, 'Mumbua Musyoka', 'mumbua.musyoka@example.com', '0718 902 686', '$2b$10$lDayvRYtLaZUjb0BlVGTKuvGqdYCK6SePNP2cGwLAE6Do0bku1v5m', 'farmer', '2026-10-15 08:41:00'),
  (8, 'Hassan Abdi', 'hassan.abdi@example.com', '0719 660 962', '$2b$10$lDayvRYtLaZUjb0BlVGTKuvGqdYCK6SePNP2cGwLAE6Do0bku1v5m', 'farmer', '2026-10-15 09:04:00'),
  (9, 'Njeri Kariuki', 'njeri.kariuki@example.com', '0720 848 895', '$2b$10$lDayvRYtLaZUjb0BlVGTKuvGqdYCK6SePNP2cGwLAE6Do0bku1v5m', 'farmer', '2026-10-15 09:27:00'),
  (10, 'Otieno Ouma', 'otieno.ouma@example.com', '0721 886 602', '$2b$10$lDayvRYtLaZUjb0BlVGTKuvGqdYCK6SePNP2cGwLAE6Do0bku1v5m', 'farmer', '2026-10-15 09:50:00'),
  (11, 'Chebet Kosgei', 'chebet.kosgei@example.com', '0722 869 891', '$2b$10$lDayvRYtLaZUjb0BlVGTKuvGqdYCK6SePNP2cGwLAE6Do0bku1v5m', 'farmer', '2026-10-15 10:13:00'),
  (12, 'Mutua Kilonzo', 'mutua.kilonzo@example.com', '0723 700 551', '$2b$10$lDayvRYtLaZUjb0BlVGTKuvGqdYCK6SePNP2cGwLAE6Do0bku1v5m', 'farmer', '2026-10-15 10:36:00'),
  (13, 'Akinyi Omondi', 'akinyi.omondi@example.com', '0724 345 102', '$2b$10$lDayvRYtLaZUjb0BlVGTKuvGqdYCK6SePNP2cGwLAE6Do0bku1v5m', 'farmer', '2026-10-15 10:59:00'),
  (14, 'Kipchoge Langat', 'kipchoge.langat@example.com', '0725 728 182', '$2b$10$lDayvRYtLaZUjb0BlVGTKuvGqdYCK6SePNP2cGwLAE6Do0bku1v5m', 'farmer', '2026-10-15 11:22:00'),
  (15, 'Wairimu Gachanja', 'wairimu.gachanja@example.com', '0726 213 394', '$2b$10$lDayvRYtLaZUjb0BlVGTKuvGqdYCK6SePNP2cGwLAE6Do0bku1v5m', 'farmer', '2026-10-15 11:45:00'),
  (16, 'Barasa Wafula', 'barasa.wafula@example.com', '0727 936 200', '$2b$10$lDayvRYtLaZUjb0BlVGTKuvGqdYCK6SePNP2cGwLAE6Do0bku1v5m', 'farmer', '2026-10-15 12:08:00'),
  (17, 'Nafula Simiyu', 'nafula.simiyu@example.com', '0728 560 111', '$2b$10$lDayvRYtLaZUjb0BlVGTKuvGqdYCK6SePNP2cGwLAE6Do0bku1v5m', 'farmer', '2026-10-15 12:31:00'),
  (18, 'Onyango Okoth', 'onyango.okoth@example.com', '0729 934 801', '$2b$10$lDayvRYtLaZUjb0BlVGTKuvGqdYCK6SePNP2cGwLAE6Do0bku1v5m', 'farmer', '2026-10-15 12:54:00'),
  (19, 'Jepkemboi Kibet', 'jepkemboi.kibet@example.com', '0730 602 795', '$2b$10$lDayvRYtLaZUjb0BlVGTKuvGqdYCK6SePNP2cGwLAE6Do0bku1v5m', 'farmer', '2026-10-15 13:17:00'),
  (20, 'Muthoni Wambui', 'muthoni.wambui@example.com', '0731 421 315', '$2b$10$lDayvRYtLaZUjb0BlVGTKuvGqdYCK6SePNP2cGwLAE6Do0bku1v5m', 'farmer', '2026-10-15 13:40:00'),
  (21, 'Ochieng Owino', 'ochieng.owino@example.com', '0732 506 357', '$2b$10$lDayvRYtLaZUjb0BlVGTKuvGqdYCK6SePNP2cGwLAE6Do0bku1v5m', 'farmer', '2026-10-15 14:03:00'),
  (22, 'Nduta Kimani', 'nduta.kimani@example.com', '0733 456 465', '$2b$10$lDayvRYtLaZUjb0BlVGTKuvGqdYCK6SePNP2cGwLAE6Do0bku1v5m', 'farmer', '2026-10-15 14:26:00'),
  (23, 'Kiprotich Cheruiyot', 'kiprotich.cheruiyot@example.com', '0734 924 485', '$2b$10$lDayvRYtLaZUjb0BlVGTKuvGqdYCK6SePNP2cGwLAE6Do0bku1v5m', 'farmer', '2026-10-15 14:49:00'),
  (24, 'Atieno Adhiambo', 'atieno.adhiambo@example.com', '0735 863 625', '$2b$10$lDayvRYtLaZUjb0BlVGTKuvGqdYCK6SePNP2cGwLAE6Do0bku1v5m', 'farmer', '2026-10-15 15:12:00'),
  (25, 'Mwende Nzioka', 'mwende.nzioka@example.com', '0736 753 178', '$2b$10$lDayvRYtLaZUjb0BlVGTKuvGqdYCK6SePNP2cGwLAE6Do0bku1v5m', 'farmer', '2026-10-15 15:35:00');

-- The ids above were set by hand, so move the id counter past them.
-- Without this, the next new row would try id 1 and fail with a duplicate key error.
SELECT setval(pg_get_serial_sequence('users', 'user_id'), (SELECT MAX(user_id) FROM users));

COMMIT;

-- Verification (read-only)
-- Expected: admin 1, grader 2, farmer 23 (total 26)
SELECT role, COUNT(*) AS users FROM users GROUP BY role;
SELECT user_id, full_name, email, phone, role FROM users ORDER BY user_id;