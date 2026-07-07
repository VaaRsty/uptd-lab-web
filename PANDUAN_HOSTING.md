# 🚀 Panduan Hosting — UPTD Lab Pengujian

Dokumen ini berisi semua langkah yang harus dilakukan sebelum dan sesudah website ini di-hosting ke server production.

---

## TAHAP 1 — Konfigurasi Environment Variables

### Backend — buat file `/backend/.env`

```env
NODE_ENV=production
PORT=5000

# CORS — ganti dengan domain frontend yang sebenarnya (WAJIB BENAR!)
CORS_ORIGINS=https://domain-frontend-kamu.com

# Database MySQL
DB_HOST=localhost
DB_USER=user_database_kamu
DB_PASSWORD=password_database_kamu
DB_NAME=uptd_lab
DB_PORT=3306
DATABASE_URL="mysql://user_database_kamu:password_database_kamu@localhost:3306/uptd_lab"

# JWT — WAJIB GANTI keduanya! Generate dengan: openssl rand -hex 64
JWT_ACCESS_SECRET=isi_string_acak_panjang_minimal_64_karakter_disini_aaa
JWT_REFRESH_SECRET=isi_string_acak_panjang_berbeda_minimal_64_karakter_bbb
JWT_ACCESS_EXPIRES=3h
JWT_REFRESH_EXPIRES=7d

# Bcrypt & Upload
BCRYPT_SALT_ROUNDS=12
MAX_UPLOAD_SIZE_MB=5

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
LOGIN_RATE_LIMIT_MAX=5

# URL Publik
FRONTEND_URL=https://domain-frontend-kamu.com
BASE_URL=https://domain-backend-kamu.com
```

### Frontend — buat file `/frontend/.env`

```env
NODE_ENV=production
PORT=3000

# Arahkan ke domain backend (WAJIB BENAR!)
API_URL=https://domain-backend-kamu.com/api
BACKEND_URL=https://domain-backend-kamu.com

# Session Secret — WAJIB GANTI! Generate dengan: openssl rand -hex 64
SESSION_SECRET=isi_string_acak_panjang_minimal_64_karakter_untuk_session

MAX_UPLOAD_SIZE_MB=50
```

---

## TAHAP 2 — Setup Database

### Langkah 1: Buat Database

```sql
CREATE DATABASE IF NOT EXISTS uptd_lab
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE uptd_lab;
```

### Langkah 2: Import Schema

Import file `uptd_lab.sql` yang ada di root project ini ke database:

- **Lewat phpMyAdmin**: Pilih database `uptd_lab` → tab Import → pilih file `uptd_lab.sql` → klik Go
- **Lewat terminal**: `mysql -u root -p uptd_lab < uptd_lab.sql`

File ini sudah berisi SEMUA tabel dan data. Setelah import selesai, lanjut ke Tahap 3.

---

## TAHAP 3 — Query INSERT Data Wajib (Jika Import SQL Gagal)

Jika import `uptd_lab.sql` berhasil, **TAHAP INI BISA DILEWATI**. Jalankan query ini hanya jika database masih kosong.

### ✅ 1. Tipe Pengujian

```sql
INSERT INTO `test_types` (`id`, `type_name`, `created_at`) VALUES
(1, 'PENGUJIAN BAHAN', NOW()),
(2, 'PENGUJIAN KONSTRUKSI', NOW())
ON DUPLICATE KEY UPDATE `type_name` = VALUES(`type_name`);
```

### ✅ 2. Kategori Pengujian

```sql
INSERT INTO `test_categories` (`id`, `test_type_id`, `category_name`, `created_at`) VALUES
(1, 1, 'Agregat', NOW()),
(2, 1, 'Tanah', NOW()),
(3, 1, 'Besi / Baja', NOW()),
(4, 1, 'Mortar / Lainnya', NOW()),
(5, 2, 'Beton', NOW()),
(6, 2, 'Aspal', NOW())
ON DUPLICATE KEY UPDATE `category_name` = VALUES(`category_name`);
```

### ✅ 3. Settings Sistem

```sql
INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES
('busy_mode_active',  '0'),
('institution_name',  'UPTD Laboratorium Konstruksi Dinas PUPR'),
('address',           'Jl. Raya Lab Pengujian No. 123, Banten'),
('phone',             '(021) 555-1234'),
('email',             'info@lab-uptd.gov.id'),
('website',           ''),
('maintenance_mode',  'false'),
('max_upload_size',   '10')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);
```

### ✅ 4. Pertanyaan Kuisioner

```sql
INSERT INTO `kuisioner_questions` (`id`, `question_text`, `urutan`) VALUES
(1,  'Kemudahan dalam pelayanan pelanggan', 1),
(2,  'Kemudahan informasi tentang sistem, mekanisme, dan prosedur pelayanan pengujian', 2),
(3,  'Ketepatan waktu pelayanan pengujian', 3),
(4,  'Biaya pengujian yang kompetitif', 4),
(5,  'Kualitas dan mutu layanan sesuai ketentuan', 5),
(6,  'Tenaga teknis yang handal, berpengalaman, dan bersertifikasi', 6),
(7,  'Keramahan pelayanan petugas', 7),
(8,  'Kecepatan tanggapan dan tindak lanjut terhadap keluhan', 8),
(9,  'Kenyamanan dan kebersihan lingkungan', 9),
(10, 'Dukungan peralatan yang memadai, terpelihara serta mutakhir', 10)
ON DUPLICATE KEY UPDATE `question_text` = VALUES(`question_text`);
```

### ✅ 5. Data Layanan — Jalankan seed otomatis (di folder backend)

```bash
node prisma/seed.js
```

---

## TAHAP 4 — INSERT Akun Admin Pertama

> PENTING: Akun ini hanya dibuat jika tabel `users` masih KOSONG setelah import SQL.
> Jika sudah ada akun admin dari file `uptd_lab.sql`, SKIP langkah ini.

```sql
INSERT INTO `users` (
    `email`, `password`, `role`, `full_name`,
    `nama_instansi`, `alamat`, `nomor_telepon`, `created_at`
) VALUES (
    'admin@uptd.go.id',
    '$2b$12$TEZzXlLEI0xyjm1bBSnNEOXVpH0SrTPE7tDeVVdo06eDT9Mu/yU6G',
    'admin',
    'Super Admin UPTD',
    'UPTD Laboratorium Konstruksi Dinas PUPR',
    'Jl. Raya Lab Pengujian No. 123, Banten',
    '(021) 555-1234',
    NOW()
);
```

**Email login**: `admin@uptd.go.id`
**Password login**: `Uptd@2025!`

> Setelah berhasil login, segera ganti password melalui Settings.

### Akun Admin dari Database Asli (Jika Import `uptd_lab.sql` Berhasil)

Setelah import berhasil, akun admin yang sudah ada di database adalah:

| Email | Nama | Sandi Awal |
|---|---|---|
| admin@uptd.go.id | Super Admin UPTD | *tidak diketahui — reset lewat script* |
| admin@uptd.gov.idd | Administrator UPTD | *tidak diketahui — reset lewat script* |

Password lama tidak bisa dibaca karena sudah di-hash. Untuk reset password admin ke `admin123`, jalankan script ini di terminal folder `backend`:

```bash
node scripts/reset_admin.js
```

Setelah itu login dengan:
- **Email**: `admin@uptd.go.id`
- **Password**: `admin123`

Lalu segera ganti password baru dari halaman Settings.

---

## TAHAP 5 — Verifikasi Setelah Deploy

| URL | Hasil yang Diharapkan |
|---|---|
| https://domain-backend/ | {"status":"ok","service":"UPTD Lab Pengujian API"} |
| https://domain-frontend/ | Halaman utama website terbuka |
| https://domain-frontend/services | Daftar layanan terisi (tidak kosong) |
| https://domain-frontend/admin/login | Halaman login admin terbuka |

---

## TAHAP 6 — Konfigurasi Awal Pasca Login Admin

1. Buka `https://domain-frontend/admin/login`
2. Login dengan salah satu akun admin di atas
3. Pergi ke **Settings → Ubah Password** — ganti dengan password baru yang kuat
4. Pergi ke **Settings → Sistem** — perbarui nama instansi, alamat, telepon, dan email sesuai data asli
5. Nonaktifkan **Busy Mode** jika aktif (cek di Settings)

---

## Catatan Keamanan

- Jangan pernah commit file `.env` ke GitHub
- Ganti password admin segera setelah pertama login
- Pastikan domain menggunakan **HTTPS (SSL)** agar sesi login berjalan normal
- Hosting harus mendukung **Node.js versi 18+**
- Simpan backup database secara berkala lewat fitur Backup di halaman Settings Admin

