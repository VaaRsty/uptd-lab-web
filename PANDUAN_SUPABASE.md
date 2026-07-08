# Panduan Sistem UPTD (Supabase + Vercel)

Dokumen ini berisi panduan teknis untuk mengelola sistem berbasis Node.js yang sudah terintegrasi dengan **Supabase** (PostgreSQL) dan di-*deploy* ke **Vercel**.

## 1. Arsitektur Sistem
- **Frontend**: EJS (Server-Side Rendering) + Vanilla CSS/JS
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (via Supabase)
- **Deployment**: Vercel (Frontend + Serverless Backend)
- **File Storage**: Supabase Storage / Local Uploads (via API)

## 2. Struktur Kodingan (Aturan Utama)
Jika Anda ingin menambahkan fitur baru atau mengubah kodingan yang ada, pastikan mengikuti standar berikut:

### a. Database & Koneksi (Supabase)
Sistem menggunakan `pg` (node-postgres) untuk koneksi ke Supabase.
- Koneksi diatur di `backend/src/config/database.js` atau `db.js`.
- Semua _query_ menggunakan format *parameterized query* (`$1, $2, ...`) untuk mencegah SQL Injection.
  
**Contoh Query Standar:**
```javascript
const result = await db.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
);
return result.rows[0];
```

### b. Menambahkan Fitur / Endpoint Baru
1. **Model** (`backend/src/models/`): Berisi _query_ langsung ke database. Jangan letakkan logika bisnis di sini.
2. **Controller** (`backend/src/controllers/`): Berisi logika bisnis, memanggil fungsi dari Model, mengatur format respons JSON/HTML, dan menangani `try...catch`.
3. **Route** (`backend/src/routes/`): Menyambungkan URL Endpoint ke fungsi Controller.
4. **Middleware**: Gunakan `verifyToken` untuk endpoint yang butuh autentikasi.

### c. Frontend (Javascript Client-Side)
- Jangan pernah _hardcode_ URL API (`http://localhost:3000`). Selalu gunakan variabel environment atau format *relative path* `/api/...` yang akan diatur oleh Vercel.
- Untuk peringatan dan notifikasi (_alert_), **wajib** menggunakan `Swal.fire` (SweetAlert2) agar tampilan interaktif dan modern.
- Saat ada proses _upload_ atau _submit_ form, gunakan *loading popup* SweetAlert agar sistem tidak terkesan macet.

**Contoh Standar Fetch:**
```javascript
Swal.fire({
    title: 'Memproses...',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
});

try {
    const response = await fetch('/api/endpoint', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${getToken()}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    
    const result = await response.json();
    Swal.close();
    
    if (result.success) {
        Swal.fire('Berhasil', result.message, 'success');
    } else {
        Swal.fire('Gagal', result.message, 'error');
    }
} catch (error) {
    Swal.close();
    Swal.fire('Error', error.message, 'error');
}
```

## 3. Instalasi Baru (Kloning Proyek)
Jika ada developer atau anggota tim lain yang baru saja melakukan *clone* (mengunduh) _repository_ ini dan ingin menjalankan sistem dari nol:

1. Buat proyek baru di [Supabase](https://supabase.com/).
2. Buka menu **SQL Editor**.
3. Buka _file_ **`supabase_schema.sql`** yang ada di _folder root_ proyek ini.
4. _Copy_ semua teks yang ada di dalamnya, lalu _Paste_ ke SQL Editor Supabase, dan tekan **Run**.
5. _File_ tersebut akan secara otomatis membuatkan semua kerangka tabel (*schema*), *relations*, dan data *master* bawaan (Layanan, Tarif, dan Admin bawaan).
6. Jangan lupa _copy_ URL Database (*Connection String*) Supabase ke dalam _file_ `.env` Anda.

## 4. Reset Data (Clean Database)
Jika sewaktu-waktu Anda ingin menghapus seluruh data transaksi (_dummy/testing_) namun tetap ingin mempertahankan akun *Admin* dan *Pelanggan* khusus, jalankan *script* SQL berikut di menu **SQL Editor** Supabase:

```sql
-- 1. Hapus isi tabel transaksi (CASCADE menghapus relasi otomatis)
TRUNCATE TABLE activities CASCADE;
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE payments CASCADE;
TRUNCATE TABLE test_reports CASCADE;
TRUNCATE TABLE submission_samples CASCADE;
TRUNCATE TABLE submissions CASCADE;

-- 2. Reset Auto Increment / ID Sequence
ALTER SEQUENCE activities_id_seq RESTART WITH 1;
ALTER SEQUENCE notifications_id_seq RESTART WITH 1;
ALTER SEQUENCE payments_id_seq RESTART WITH 1;
ALTER SEQUENCE test_reports_id_seq RESTART WITH 1;
ALTER SEQUENCE submission_samples_id_seq RESTART WITH 1;
ALTER SEQUENCE submissions_id_seq RESTART WITH 1;

-- 3. Hapus dan Reset Akun Users (Sisakan Admin & 1 Pelanggan)
TRUNCATE TABLE users CASCADE;
ALTER SEQUENCE users_id_seq RESTART WITH 1;

INSERT INTO users (email, password, role, full_name, created_at, updated_at) VALUES 
('admin@uptd.go.id', '$2b$10$zdaaA.ZamnjPKFjeUdE6n.JzRSdsSTxLuTjZberXqO4vb0ojqnkQW', 'admin', 'Admin UPTD', NOW(), NOW()),
('ristyevaa68@gmail.com', '$2b$10$zdaaA.ZamnjPKFjeUdE6n.JzRSdsSTxLuTjZberXqO4vb0ojqnkQW', 'pelanggan', 'Risty Evaa', NOW(), NOW());
```
*(Password untuk kedua akun di atas adalah: `password123`)*

**Perhatian**: Jangan sembarangan mengubah struktur tipe data (`ALTER TABLE`) yang sudah dipakai di kodingan, karena PostgreSQL sangat ketat (strict) terhadap tipe data dibandingkan MySQL.

## 5. Proses Deployment (Vercel)
Untuk melakukan pembaruan ke *server live*:
1. Pastikan Anda berada di _root_ proyek (`uptd-baru`).
2. Jalankan perintah `npx vercel --prod`.
3. Tunggu hingga proses unggah dan _build_ selesai (kurang dari 2 menit).

> File konfigurasi Vercel ada di `vercel.json`. File ini mengatur _routing_ agar semua akses `/api` diteruskan ke backend Express, dan memastikan aplikasi berjalan secara _Serverless_. Jangan ubah file ini tanpa memahami dokumentasi Vercel secara utuh.
