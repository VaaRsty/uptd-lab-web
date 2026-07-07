# 🚀 Panduan Lengkap Hosting Vercel (Tahap Terakhir)

Karena Anda menggunakan satu folder utama (`uptd-baru`) yang berisi **Frontend** dan **Backend** secara bersamaan, kita akan melakukan hosting **keduanya sekaligus ke dalam SATU proyek Vercel**! 

Hal ini sangat menguntungkan karena Anda tidak perlu mengatur dua domain berbeda.

---

## 🛑 Langkah 1: Persiapan File Vercel
Saya baru saja memperbarui file `vercel.json` di folder laptop Anda secara otomatis agar Vercel tahu cara membaca folder `frontend` dan `backend` sekaligus. Anda tidak perlu mengubah kode apa pun lagi.

## 🐙 Langkah 2: Upload Kode ke GitHub
Vercel membutuhkan kode Anda berada di GitHub agar bisa di-hosting otomatis.

1. Buka [github.com](https://github.com) dan masuk ke akun Anda.
2. Buat repository baru (klik tombol **+ New**). Beri nama bebas (misal: `uptd-lab-web`), biarkan dalam status **Public** atau **Private**, lalu klik **Create repository**.
3. Buka **Terminal** (CMD / PowerShell / Terminal VS Code) di folder project Anda (`d:\Magang\new\uptd-baru`), lalu ketik perintah berikut satu per satu:

```bash
git init
git add .
git commit -m "Upload pertama untuk Vercel"
git branch -M main
```

4. Selanjutnya, **copy 2 baris perintah terakhir** yang ada di layar GitHub Anda (yang berawalan `git remote add origin...` dan `git push...`), lalu **Paste** di terminal Anda dan tekan Enter.
5. Tunggu sampai proses *upload* selesai (100%).

---

## 🌐 Langkah 3: Sambungkan ke Vercel
1. Buka [vercel.com](https://vercel.com) dan login menggunakan akun GitHub Anda.
2. Di halaman Dashboard, klik tombol hitam **Add New...** lalu pilih **Project**.
3. Di bagian *Import Git Repository*, nama project GitHub Anda (`uptd-lab-web`) akan muncul. Klik tombol **Import**.
4. Beri nama *Project Name* bebas (misal: `uptd-lab-online`).
5. **JANGAN klik Deploy dulu!** Kita harus memasukkan Environment Variables rahasia Anda.

---

## 🔑 Langkah 4: Memasukkan Environment Variables (Sangat Penting)
Di layar yang sama (sebelum menekan Deploy), buka bagian **Environment Variables** (klik tanda panah ke bawah).

Masukkan kunci-kunci di bawah ini satu per satu secara berpasangan (Name & Value), lalu klik tombol **Add** setiap selesai satu baris:

### Dari Supabase:
| Name | Value |
| :--- | :--- |
| `DATABASE_URL` | *(Paste link postgresql://... dari Supabase, ingat ganti passwordnya)* |
| `SUPABASE_URL` | *(Paste link Project URL Supabase)* |
| `SUPABASE_ANON_KEY` | *(Paste kode sb_publishable... dari Supabase)* |

### Kunci Rahasia Backend & Frontend:
*Catatan: Anda bisa membuat kata sandi acak sendiri untuk nilai-nilai di bawah ini, asalkan cukup panjang.*

| Name | Value |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | *(Bikin kata acak panjang, misal: abcdef123456...)* |
| `JWT_ACCESS_SECRET` | *(Bikin kata acak panjang yg berbeda)* |
| `JWT_REFRESH_SECRET` | *(Bikin kata acak panjang yg berbeda)* |
| `BCRYPT_SALT_ROUNDS` | `12` |
| `MAX_UPLOAD_SIZE_MB` | `5` |
| `JWT_ACCESS_EXPIRES` | `3h` |
| `JWT_REFRESH_EXPIRES` | `7d` |

### URL Website:
Karena Frontend dan Backend berada dalam SATU Vercel, kita biarkan kosong/dinamis atau sesuaikan jika Anda sudah punya domain khusus. Untuk Vercel gratisan, kosongkan saja dulu Name ini, atau jika sistem meminta, isi sementara dengan:
| Name | Value |
| :--- | :--- |
| `FRONTEND_URL` | *(Kosongkan atau isi `*`)* |
| `BASE_URL` | *(Kosongkan atau isi `*`)* |
| `API_URL` | `/api` |

*(Catatan: Aplikasi Anda sudah saya program agar menggunakan URL relatif jika `FRONTEND_URL` tidak diatur, sehingga Vercel akan otomatis menyesuaikan nama domainnya!)*

---

## 🚀 Langkah 5: DEPLOY!
1. Jika semua kunci sudah dimasukkan, silakan klik tombol biru **Deploy**.
2. Tunggu proses *building* berjalan (sekitar 1-3 menit).
3. Jika berhasil, layar akan dipenuhi kembang api! 🎉
4. Klik tombol **Continue to Dashboard** lalu klik tombol **Visit** untuk melihat *website* Anda yang sudah _online_!

Selamat! Sistem UPTD Laboratorium Konstruksi Anda kini sudah resmi mengudara secara publik! 🌍
