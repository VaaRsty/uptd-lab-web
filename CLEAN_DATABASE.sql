-- =====================================================================
-- SCRIPT PEMBERSIHAN DATABASE (CLEAN UP DATA TESTING)
-- =====================================================================
-- PERINGATAN: Jalankan script ini di menu "SQL Editor" pada Supabase.
-- Script ini akan MENGHAPUS SEMUA DATA TRANSAKSI (pengajuan, pembayaran, 
-- sampel, laporan, dll) tetapi TETAP MEMPERTAHANKAN master data seperti 
-- Layanan (services), Pengaturan (settings), dan User (admin/pengguna).
-- =====================================================================

-- 1. Hapus isi tabel transaksi (CASCADE akan otomatis menghapus data di tabel relasi jika ada constraint)
TRUNCATE TABLE activities CASCADE;
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE payments CASCADE;
TRUNCATE TABLE test_reports CASCADE;
TRUNCATE TABLE submission_samples CASCADE;
TRUNCATE TABLE submissions CASCADE;

-- 2. Mengatur ulang (Reset) Auto Increment / ID Sequence (agar ID pengajuan kembali dimulai dari 1)
ALTER SEQUENCE activities_id_seq RESTART WITH 1;
ALTER SEQUENCE notifications_id_seq RESTART WITH 1;
ALTER SEQUENCE payments_id_seq RESTART WITH 1;
ALTER SEQUENCE test_reports_id_seq RESTART WITH 1;
ALTER SEQUENCE submission_samples_id_seq RESTART WITH 1;
ALTER SEQUENCE submissions_id_seq RESTART WITH 1;

-- =====================================================================
-- PEMBERSIHAN USER (TRUNCATE TOTAL & INSERT DEFAULT)
-- =====================================================================

-- 1. Hapus SEMUA akun dari tabel users
TRUNCATE TABLE users CASCADE;

-- 2. Mengatur ulang Auto Increment ID untuk users
ALTER SEQUENCE users_id_seq RESTART WITH 1;

-- 3. Membuat Ulang 2 Akun Pengecualian (Password awal: password123)
-- Password dienkripsi menggunakan Bcrypt standard Node.js
INSERT INTO users (email, password, role, full_name, created_at, updated_at) 
VALUES 
(
  'admin@uptd.go.id', 
  '$2b$10$zdaaA.ZamnjPKFjeUdE6n.JzRSdsSTxLuTjZberXqO4vb0ojqnkQW', 
  'admin', 
  'Admin UPTD', 
  NOW(), 
  NOW()
),
(
  'ristyevaa68@gmail.com', 
  '$2b$10$zdaaA.ZamnjPKFjeUdE6n.JzRSdsSTxLuTjZberXqO4vb0ojqnkQW', 
  'pelanggan', 
  'Risty Evaa', 
  NOW(), 
  NOW()
);

-- Catatan Penting Supabase:
-- Karena Anda menghapus data di tabel 'public.users', pastikan juga 
-- tabel 'auth.users' di menu Authentication Supabase dibersihkan jika 
-- ada sisa akun lama, atau mereka mungkin akan mengalami error sinkronisasi 
-- saat login kembali.
-- =====================================================================
