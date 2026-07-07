# Panduan Master Data Pasca-Deployment (Hosting)

Dokumen ini menjelaskan **tabel database** dan **halaman web** yang sangat bergantung padanya. Saat sistem baru saja di-deploy ke server hosting, tabel-tabel di bawah ini **TIDAK BOLEH KOSONG** (wajib diisi dengan *seed data* atau di-*insert* manual) agar aplikasi dapat berjalan sebagaimana fungsinya tanpa error.

---

## 1. Tabel `users` (Khusus Akun Admin)
Sistem membutuhkan minimal satu akun dengan peran (role) `admin` agar pengelola dapat masuk ke dashboard dan mengatur sistem.
*   **Halaman yang Terdampak (Jika Kosong):**
    *   `/login` (Admin tidak bisa login).
    *   Seluruh halaman dashboard Admin (`/admin/dashboard`, `/admin/users`, `/admin/services`, dll) tidak akan bisa diakses oleh siapapun karena tidak ada administrator yang terdaftar.

## 2. Tabel `test_types` (Tipe Pengujian)
Merupakan pengelompokan paling atas dari layanan pengujian (misalnya: "Pengujian Bahan", "Pengujian Konstruksi").
*   **Halaman yang Terdampak (Jika Kosong):**
    *   `/estimasi` (Fitur pemilihan layanan tidak akan muncul).
    *   `/services` (Katalog layanan akan kosong).
    *   `/user/submission` (Pelanggan tidak bisa membuat form pengajuan baru karena *dropdown* tipe pengujian akan kosong).

## 3. Tabel `test_categories` (Kategori Pengujian)
Pengelompokan sub-tipe (misalnya: tipe "Pengujian Bahan" memiliki kategori "Tanah", "Beton", "Aspal"). Tabel ini berelasi langsung dengan `test_types`.
*   **Halaman yang Terdampak (Jika Kosong):**
    *   Sama seperti tipe pengujian; halaman Estimasi (`/estimasi`), Pelayanan (`/services`), dan Buat Pengajuan (`/user/submission`) akan gagal merender kategori layanannya.

## 4. Tabel `services` (Layanan/Produk Uji)
Ini adalah tabel *core* produk UPTD yang menampung detail seperti harga, estimasi pengerjaan, dan batas minimal sampel. Tabel ini berelasi dengan `test_categories` dan `test_types`.
*   **Halaman yang Terdampak (Jika Kosong):**
    *   Sama seperti di atas. Tanpa tabel ini, masyarakat maupun pelanggan tidak akan bisa melihat tarif, menghitung estimasi biaya/waktu, dan tentunya tidak bisa memesan (membuat pengajuan).

## 5. Tabel `settings` (Konfigurasi Sistem)
Tabel ini menyimpan variabel konfigurasi sistem yang bisa diatur oleh Admin. Nilai-nilai konfigurasi (seperti *busy_mode_active* untuk menyalakan mode sibuk/maintenance) akan dibaca oleh sistem di berbagai halaman.
*   **Halaman yang Terdampak (Jika Kosong):**
    *   Sistem mungkin mengalami peringatan (warning) atau bahkan *error* saat memuat variabel konfigurasi *default* seperti pada saat *render* `pageController` mengecek "Mode Sibuk" yang akan ditambah ke durasi waktu pada halaman Estimasi Pengujian.

## 6. Tabel `kuisioner_questions` (Pertanyaan IKM)
Tabel yang memuat butir-butir daftar pertanyaan untuk Indeks Kepuasan Masyarakat (IKM).
*   **Halaman yang Terdampak (Jika Kosong):**
    *   `/kuisioner` (Halaman pengisian kuisioner evaluasi layanan). Jika tabel ini kosong, pelanggan tidak akan melihat daftar pertanyaan survei yang wajib mereka isi pada akhir tahap pelayanan, dan *submit* survei berpotensi *error*.

---

### 💡 Solusi & Rekomendasi
Pastikan untuk menjalankan **Database Seeder** (`prisma/seed.js` jika tersedia) sesaat setelah database di-_migrate_ di server production, dengan menjalankan perintah (di dalam folder backend):
```bash
npx prisma db seed
```
Atau Anda bisa melakukan *export-import* keseluruhan tabel beserta isinya (format `.sql`) dari database lokal Anda ke PhpMyAdmin/Database Manager di Hosting.
