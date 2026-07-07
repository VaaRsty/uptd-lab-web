# PANDUAN SISTEM UPTD PBKBIK — Arsitektur, Keamanan & Standar Koding

> **Dibuat untuk:** Coding Agent / Developer yang akan melanjutkan, memperbaiki, atau membangun ulang bagian sistem ini.  
> **Cakupan:** Seluruh sistem (frontend EJS + backend Node.js + database MySQL) dari sudut pandang keamanan dan keandalan saat *hosting* publik.

---

## 1. Ringkasan Arsitektur Sistem

```
d:\Magang\new\uptd-baru\
├── backend/                    # Node.js + Express (Port 5000)
│   ├── .env                    # Konfigurasi sensitif (jangan di-commit ke Git)
│   ├── prisma/schema.prisma    # Skema database (MySQL)
│   ├── prisma/seed.js          # Data awal wajib (services, test_types, dll)
│   ├── scripts/                # Script utilitas (misal: reset_admin.js)
│   └── src/
│       ├── config/database.js  # Koneksi MySQL via mysql2 pool
│       ├── controllers/        # Logika bisnis (authController.js, apiController.js, dll)
│       ├── middlewares/        # Auth, rate limit, validation, dll
│       ├── routes/             # authRoute.js, api.js, pageRoute.js, dll
│       ├── services/           # tokenService.js (JWT)
│       └── validations/        # authValidation.js (Joi schema)
│
└── frontend/                   # Express + EJS (Port 3000)
    ├── public/
    │   ├── css/                # style.css (publik), user-style.css, admin-style.css
    │   ├── js/                 # Login JS, dashboard JS, dll
    │   └── img/                # Aset gambar
    └── src/views/
        ├── index.ejs           # Beranda publik
        ├── services.ejs        # Katalog layanan
        ├── estimasi.ejs        # Kalkulator estimasi
        ├── login.ejs / register.ejs
        ├── profile.ejs         # Profil instansi (publik)
        ├── kuisioner.ejs       # Survei IKM publik
        ├── admin/              # Semua halaman panel Admin
        │   ├── login.ejs       # Login admin (sudah diperbarui)
        │   ├── dashboard.ejs
        │   ├── submissions.ejs / detail-submission.ejs
        │   ├── skrd.ejs / detail-skrd.ejs
        │   ├── users.ejs
        │   ├── kuisioner.ejs
        │   ├── reports.ejs
        │   └── settings.ejs
        ├── user/               # Semua halaman panel User/Pelanggan
        │   ├── dashboard.ejs
        │   ├── submission.ejs  # Form pengajuan baru
        │   ├── history.ejs / history-detail.ejs
        │   └── transaction.ejs / transaction-detail.ejs
        └── layout/
            ├── navbar.ejs      # Navbar halaman publik
            └── footer.ejs
```

**Frontend** dan **Backend** adalah dua *process* Node.js yang terpisah. Frontend (port 3000) berperan sebagai *SSR (Server-Side Rendering)* menggunakan EJS dan meneruskan request API ke Backend (port 5000) menggunakan `axios`.

---

## 2. Masalah Kritis yang Sudah Diperbaiki (Riwayat Bug)

> [!CAUTION]
> **Seluruh bug di bawah ini sudah diperbaiki dalam rilis ini. Jangan kembalikan kode ke versi lama.**

### BUG #1 — Admin Login Hardcoded (KRITIS)
- **Lokasi:** `backend/src/controllers/authController.js` — fungsi `adminLogin`
- **Masalah Lama:** Fungsi `adminLogin` tidak mengecek database sama sekali. Login admin hanya akan berhasil jika email dan password **sama persis** dengan nilai yang di-*hardcode* di variabel lingkungan (`ADMIN_EMAIL` dan `ADMIN_PASSWORD`). Akibatnya, semua akun admin yang ada di tabel `users` tidak bisa digunakan.
- **Solusi yang Diterapkan:** Fungsi `adminLogin` sekarang melakukan query ke tabel `users` dengan filter `role = 'admin'` dan melakukan verifikasi password menggunakan `bcrypt.compare()`.
- **Standar ke Depan:** Sistem otentikasi admin **harus selalu** menggunakan query ke database, bukan nilai *hardcoded* atau variabel lingkungan untuk *login*.

```javascript
// ✅ BENAR — Query ke database
const [users] = await db.query('SELECT * FROM users WHERE email = ? AND role = ?', [email, 'admin']);
const valid = await bcrypt.compare(password, adminUser.password);

// ❌ SALAH — Hardcoded, hindari pola ini
const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin.com';
if (email === adminEmail && password === adminPassword) { ... }
```

### BUG #2 — Script Sidebar Mobile Tidak Terhubung (Hamburger Menu)
- **Lokasi:** `frontend/src/views/user/partials/top-navbar.ejs` dan `admin/partials/top-navbar.ejs`
- **Masalah Lama:** Script JavaScript untuk tombol hamburger (`mobileSidebarToggle`) ditempatkan di dalam file `sidebar.ejs`. Karena `sidebar.ejs` di-*render* sebelum `top-navbar.ejs`, elemen tombol hamburger (`#mobileSidebarToggle`) belum ada di DOM saat script dieksekusi, sehingga event listener tidak pernah terpasang.
- **Solusi yang Diterapkan:** Script toggle sidebar dipindahkan ke dalam `DOMContentLoaded` di file `top-navbar.ejs` (dieksekusi **setelah** semua elemen tersedia). Sidebar menggunakan `transform: translateX(-100%)` bukan `display: none` agar animasi slide berfungsi.
- **Standar ke Depan:** Script yang memerlukan DOM element tertentu **harus** dieksekusi di `DOMContentLoaded` atau diletakkan setelah elemen target di-render.

### BUG #3 — CSS `display: none` Menghalangi Animasi Sidebar
- **Lokasi:** `frontend/public/css/user-style.css` dan `admin-style.css`
- **Masalah Lama:** Sidebar mobile awalnya disembunyikan dengan `display: none`. Ketika kelas `.active` ditambahkan, browser tidak bisa menganimasikan transisi dari `display: none` ke `display: block`.
- **Solusi:** Gunakan `transform: translateX(-100%)` (default/tersembunyi) dan `transform: translateX(0)` (aktif/tampil) bersama `transition: transform 0.3s ease`.

### BUG #4 — Validasi Joi Gagal pada Login Admin (Hardcoded)
- **Akar Masalah:** Karena backend `adminLogin` sebelumnya tidak mengecek DB, tidak ada cara untuk memvalidasi siapa admin yang sah. Sekarang sudah diperbaiki mengikuti alur standar di BUG #1.

---

## 3. Standar Keamanan Sistem

### 3.1 Otentikasi & Otorisasi
| Aspek | Standar |
|---|---|
| Hashing Password | `bcrypt` dengan salt rounds **≥ 10** (produksi: 12) |
| Token | JWT — `accessToken` (3 jam), `refreshToken` (7 hari) |
| Proteksi Route | Semua route admin/user dilindungi `authMiddleware` |
| Cek Role | Gunakan `roleMiddleware` atau cek `req.user.role` |
| Rate Limit Login | Maksimal **5 percobaan** per 15 menit (`rateLimitMiddleware.js`) |

### 3.2 Halaman Admin Login (`/admin/login`)
- **Honeypot Field:** Input tersembunyi `#website_url`. Jika terisi (oleh bot), JS akan menghentikan request diam-diam.
- **Lupa Password Dinonaktifkan:** Tidak ada tautan reset password di halaman admin. Reset hanya bisa dilakukan via script server langsung (`scripts/reset_admin.js`) oleh tim IT.
- **Disclaimer Hukum:** Teks peringatan UU ITE ditampilkan di bawah form untuk efek psikologis pencegahan.

### 3.3 Konfigurasi `.env` Wajib untuk Produksi
> [!IMPORTANT]
> Nilai `.env` berikut **WAJIB** diganti sebelum *deployment* ke server publik!

```env
NODE_ENV=production

# Ganti dengan URL domain asli
CORS_ORIGINS=https://uptd.banten.go.id
FRONTEND_URL=https://uptd.banten.go.id
BASE_URL=https://api.uptd.banten.go.id

# Database — gunakan user bukan root, dan berikan password kuat
DB_USER=uptd_user
DB_PASSWORD=GantiPasswordIniDenganYangKuat!
DB_NAME=uptd_lab

# JWT Secrets — generate ulang dengan: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_SECRET=<generate_baru>
JWT_REFRESH_SECRET=<generate_baru>
```

> [!WARNING]
> **Jangan pernah commit file `.env` ke Git.** Pastikan `.env` sudah masuk ke dalam `.gitignore`.

---

## 4. Struktur Database — Tabel Wajib Berisi

Aplikasi **TIDAK AKAN BERJALAN** dengan benar tanpa data awal di tabel-tabel berikut:

| Tabel | Keterangan | Halaman Terdampak jika Kosong |
|---|---|---|
| `users` (admin) | Min. 1 akun dengan `role='admin'` | Seluruh `/admin/*` |
| `test_types` | Jenis pengujian (Bahan/Konstruksi) | `/services`, `/estimasi`, `/user/submission` |
| `test_categories` | Sub-kategori pengujian | `/services`, `/estimasi`, `/user/submission` |
| `services` | Daftar layanan, harga, durasi | Semua halaman layanan |
| `settings` | Konfigurasi sistem (mode sibuk, dll) | `/estimasi`, halaman admin |
| `kuisioner_questions` | Pertanyaan IKM | `/kuisioner` |

**Cara mengisi data awal:**
```bash
# Dari folder backend/
node prisma/seed.js

# Atau import file SQL lengkap ke MySQL:
# mysql -u root -p uptd_lab < uptd_lab.sql
```

**Cara reset password admin jika terkunci:**
```bash
# Dari folder backend/
node scripts/reset_admin.js
# Output akan menampilkan email admin yang ditemukan & konfirmasi reset ke 'admin123'
# Segera ganti password setelah login pertama!
```

---

## 5. Panduan Responsif Mobile (CSS)

Sistem menggunakan **tiga file CSS utama** dengan media query `@media (max-width: 768px)` untuk tampilan HP. **Jangan pernah mengubah desain desktop (di atas 768px) saat menambah fitur mobile.**

| File CSS | Cakupan |
|---|---|
| `frontend/public/css/style.css` | Halaman publik (Beranda, Layanan, Login, dsb.) |
| `frontend/public/css/user-style.css` | Panel pengguna/pelanggan |
| `frontend/public/css/admin-style.css` | Panel administrator |

**Aturan baku:**
1. Tambahan CSS mobile selalu di **bagian paling bawah** file CSS masing-masing dalam blok `@media (max-width: 768px) { }`.
2. Untuk sembunyikan/tampilkan elemen di mobile, gunakan `transform` atau `opacity`, **bukan** `display: none/block` yang mematikan transisi CSS.
3. Tabel panjang wajib dibungkus `<div class="table-responsive">` agar bisa di-scroll horizontal di HP.

---

## 6. Arsitektur Partial EJS (Navbar & Sidebar)

Panel Admin dan Panel User keduanya menggunakan struktur *partial* yang di-include di setiap halaman:

```
<!-- Contoh pada admin/dashboard.ejs -->
<%- include('partials/sidebar') %>  <!-- Sidebar kiri: menu navigasi -->
<%- include('partials/top-navbar') %> <!-- Navbar atas: hamburger, notif, avatar -->
```

> [!IMPORTANT]
> **Urutan ini penting!** `sidebar.ejs` di-render lebih dulu dari `top-navbar.ejs`. Karena itu, **script JavaScript yang mengakses elemen dari `top-navbar.ejs` (misal: `#mobileSidebarToggle`) HARUS diletakkan di dalam `top-navbar.ejs`**, bukan di `sidebar.ejs`.

---

## 7. Alur API — Frontend ke Backend

Frontend berkomunikasi dengan backend melalui `axios` dari sisi server (SSR di `pageRoute.js`) dan `fetch` dari sisi browser (di file JS pada `/public/js/`).

**URL Backend API** dikonfigurasikan melalui variabel `backendUrl` yang di-inject ke EJS dari `pageRoute.js` menggunakan nilai dari `.env` (`BASE_URL`).

**Pattern di EJS:**
```javascript
// Di dalam file .ejs, mengakses backend URL secara dinamis:
const apiUrl = '<%= typeof backendUrl !== "undefined" ? backendUrl : "http://localhost:5000" %>/api/...';
```

---

## 8. Checklist Sebelum Deploy ke Hosting

- [ ] Perbarui semua nilai di `.env` sesuai domain/server produksi (lihat §3.3).
- [ ] Pastikan `NODE_ENV=production`.
- [ ] Perbarui `CORS_ORIGINS` ke domain frontend yang tepat.
- [ ] Generate ulang `JWT_ACCESS_SECRET` dan `JWT_REFRESH_SECRET`.
- [ ] Import database dari `uptd_lab.sql` ke server MySQL hosting.
- [ ] Jalankan `node prisma/seed.js` jika data awal belum ada.
- [ ] Ganti password admin default `admin123` segera setelah login pertama.
- [ ] Pastikan folder `uploads/` writable oleh proses Node.js.
- [ ] Aktifkan HTTPS (SSL) di web server (Nginx/Apache).
- [ ] Konfigurasi Nginx/Apache sebagai *reverse proxy* ke port 3000 (frontend) dan 5000 (backend).

---

## 9. Fitur yang Diketahui Belum Sempurna / Perlu Perhatian

> [!NOTE]
> Bagian ini adalah catatan untuk agent/developer berikutnya.

1. **Dua File Route Paralel:** Terdapat `api.js` (lama, berbasis `apiController`) dan `authRoute.js` + route-route baru (berbasis *controller* terpisah). Kedua sistem ini berjalan bersamaan. Idealnya perlu dikonsolidasi agar tidak membingungkan.
2. **`authMiddleware` Duplikat:** Ada `middlewares/auth.js` dan `middlewares/authMiddleware.js` yang berbeda implementasinya. Pastikan konsistensi penggunaan di setiap route baru.
3. **Tidak Ada CSRF Protection:** Untuk keamanan ekstra di produksi, tambahkan middleware CSRF (contoh: `csurf` atau `csrf-csrf`).
4. **Notifikasi Realtime:** Saat ini notifikasi admin/user menggunakan polling (fetch periodik). Untuk skalabilitas, pertimbangkan *WebSocket* (Socket.IO) di masa depan.
5. **Reset Password User:** Fitur lupa password untuk akun pelanggan (bukan admin) ada, namun bergantung pada konfigurasi `MAIL_HOST`. Pastikan diisi jika ingin diaktifkan.
