/**
 * Controller untuk submission (pengajuan pengujian).
 */
const submissionModel = require('../models/submissionModel');
const submissionSampleModel = require('../models/submissionSampleModel');
const notificationModel = require('../models/notificationModel');
const { success, error, paginated } = require('../utils/responseHelper');
const db = require('../config/database');
const { uploadToSupabase, createSignedUploadUrl, supabaseUrl } = require('../config/supabase');

/**
 * Generate signed upload URLs untuk browser upload langsung ke Supabase
 * POST /submissions/upload-urls
 */
exports.generateUploadUrls = async (req, res, next) => {
    try {
        const { files } = req.body; // array of { field, filename }
        if (!files || !Array.isArray(files) || files.length === 0) {
            return res.status(400).json({ success: false, message: 'Daftar file diperlukan' });
        }

        const folderMap = {
            surat_permohonan: 'surat_permohonan',
            scan_ktp: 'scan_ktp',
            lampiran_pendukung: 'lampiran_pendukung'
        };

        const urls = {};
        for (const { field, filename } of files) {
            const folder = folderMap[field] || 'others';
            const ext = require('path').extname(filename || 'file');
            const uniqueName = `${folder}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`;
            const result = await createSignedUploadUrl(uniqueName, 'uploads');
            urls[field] = {
                signedUrl: result.signedUrl,
                publicUrl: result.publicUrl,
                path: result.path
            };
        }

        return res.json({ success: true, data: urls });
    } catch (err) {
        console.error('Error generating upload URLs:', err);
        return res.status(500).json({ success: false, message: 'Gagal membuat upload URL: ' + err.message });
    }
};

exports.list = async (req, res, next) => {
    try {
        const { status, search, user_id, start_date, end_date, test_type, test_category, sort, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const data = await submissionModel.list({ status, search, user_id, start_date, end_date, test_type, test_category, sort, limit, offset });
        const total = await submissionModel.count({ status, user_id, search, start_date, end_date, test_type, test_category });
        return paginated(res, 'Daftar submission', data, {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            total,
            totalPages: Math.ceil(total / parseInt(limit, 10))
        });
    } catch (err) {
        next(err);
    }
};

exports.detail = async (req, res, next) => {
    try {
        const data = await submissionModel.findById(req.params.id);
        if (!data) return error(res, 404, 'Submission tidak ditemukan');

        // 🔥 Timpa data user dengan yang terbaru dari tabel users
        if (data.user_id) {
            const userModel = require('../models/userModel');
            const user = await userModel.findById(data.user_id);
            if (user) {
                data.nama_pemohon = user.full_name || data.nama_pemohon;
                data.email_pemohon = user.email || data.email_pemohon;
                data.nomor_telepon = user.nomor_telepon || data.nomor_telepon;
                data.nama_instansi = user.nama_instansi || data.nama_instansi;
                data.alamat_pemohon = user.alamat || data.alamat_pemohon;
            }
        }

        // ========== AMBIL SAMPLES ==========
        const db = require('../config/database');
        const [samples] = await db.query(
            `SELECT s.*, 
                    c.category_name, 
                    t.type_name, 
                    sv.service_name 
             FROM submission_samples s 
             LEFT JOIN test_categories c ON c.id = s.test_category_id 
             LEFT JOIN test_types t ON t.id = s.test_type_id 
             LEFT JOIN services sv ON sv.id = s.service_id
             WHERE s.submission_id = ?`,
            [req.params.id]
        );
        data.samples = samples;
        console.log(`📦 Samples ditemukan: ${samples.length} item`);

        // ========== AMBIL PAYMENT ==========
        const paymentModel = require('../models/paymentModel');
        const payments = await paymentModel.findBySubmissionId(req.params.id);
        data.payment = payments.length > 0 ? payments[0] : null;

        // ========== AMBIL KUIISIONER ==========
        const kuisionerModel = require('../models/kuisionerModel');
        const kuisioner = await kuisionerModel.findBySubmissionId(req.params.id);
        data.kuisioner = kuisioner || null;

        // ========== AMBIL LAPORAN ==========
        const reportModel = require('../models/reportModel');
        const reports = await reportModel.findBySubmissionId(req.params.id);
        data.report = reports && reports.length > 0 ? reports[0] : null;

        return success(res, 'Detail submission', data);
    } catch (err) {
        next(err);
    }
};

exports.create = async (req, res, next) => {
    try {
        // 1. Ambil service_id dari dropdown (uji_bahan atau uji_konstruksi)
        let serviceId = req.body.service_id; // dari hidden input
        if (!serviceId) {
            // Jika hidden input kosong, ambil dari dropdown
            serviceId = req.body.uji_bahan || req.body.uji_konstruksi || null;
        }

        // 2. Jika serviceId masih kosong, kita bisa tolak atau lanjutkan tanpa sample
        if (!serviceId) {
            console.warn('⚠️ Tidak ada service_id, sample tidak akan disimpan');
            // Tapi kita tetap lanjutkan submission utama
        }

        // 3. Cari detail service dari database berdasarkan serviceId
        let serviceDetail = null;
        if (serviceId) {
            const [rows] = await db.query(
                `SELECT s.*, tc.category_name, tt.type_name 
                 FROM services s
                 LEFT JOIN test_categories tc ON tc.id = s.category_id
                 LEFT JOIN test_types tt ON tt.id = s.test_type_id
                 WHERE s.id = ?`,
                [serviceId]
            );
            serviceDetail = rows[0] || null;
        }

        // 4. Siapkan payload submission utama (tetap sama)
        const payload = {
            ...req.body,
            no_permohonan: req.body.nomor_permohonan || req.body.no_permohonan || null,
            email_pemohon: req.body.email || null, // <-- TAMBAHKAN INI
            user_id: req.user.id,
            // URL file akan diupdate setelah insert
            file_surat_permohonan: null,
            file_ktp: null,
            dokumen_tambahan: null
        };

        // 5. Simpan submission utama
        const id = await submissionModel.create(payload);
        console.log('✅ Submission ID:', id);


        // 6. Siapkan data sample dari form + serviceDetail
        let jenisSample = null;
        if (req.body.jenis_sampel) {
            if (Array.isArray(req.body.jenis_sampel)) {
                jenisSample = req.body.jenis_sampel.join(', ');
            } else {
                jenisSample = req.body.jenis_sampel;
            }
        }
        if (req.body.jenis_sampel_lainnya) {
            jenisSample = jenisSample ? jenisSample + ', ' + req.body.jenis_sampel_lainnya : req.body.jenis_sampel_lainnya;
        }

        // Hitung estimasi selesai
        let estimasiSelesai = null;
        if (req.body.tanggal_sampel) {
            const start = new Date(req.body.tanggal_sampel);
            const duration = serviceDetail?.duration_days || 0;
            const totalHari = 3 + 7 + parseInt(duration);
            const end = new Date(start);
            end.setDate(end.getDate() + totalHari);
            estimasiSelesai = end.toISOString().split('T')[0];
        }

        const sampleData = {
            jenis_sample: jenisSample,
            nama_sampel: req.body.nama_sampel || null,
            jumlah_sample_angka: req.body.jumlah_sample_angka || 1,
            jumlah_sample_satuan: req.body.jumlah_sample_satuan || 'sample',
            tanggal_sampel: req.body.tanggal_sampel || null,
            kemasan_sample: req.body.kemasan_sampel || null,   // <-- perhatikan: di database kolomnya kemasan_sample (tanpa 's' di akhir)
            asal_sample: req.body.asal_sampel || null,         // <-- di database kolomnya asal_sample
            sample_diambil_oleh: req.body.diambil_oleh || 'Pelanggan', // <-- di database kolomnya sample_diambil_oleh
            test_type_id: serviceDetail?.test_type_id || null,
            test_category_id: serviceDetail?.category_id || null,
            service_id: serviceId || null,
            price_at_time: serviceDetail?.price || 0,
            method_at_time: req.body.metode_uji || serviceDetail?.method || null,
            estimasi_selesai: estimasiSelesai
        };

        console.log('📦 Sample data:', sampleData);

        // 7. Simpan sample jika service_id ada
        if (sampleData.service_id) {
            try {
                await submissionModel.createSamples(id, [sampleData]);
                console.log('✅ Sample berhasil disimpan');
            } catch (sampleErr) {
                console.error('⚠️ Gagal menyimpan sample:', sampleErr.message);
                // Kita tidak throw error agar submission utama tetap berhasil
            }
        } else {
            console.warn('⚠️ Tidak ada service_id, sample tidak disimpan');
        }

        // --- TAMBAHAN BARU: Buat transaksi (payment) otomatis sesuai dengan tagihan awal ---
        try {
            const estimasiTagihan = (sampleData.price_at_time || 0) * (sampleData.jumlah_sample_angka || 1);
            const paymentModel = require('../models/paymentModel');
            await paymentModel.create({
                submission_id: id,
                nominal: estimasiTagihan,
                keterangan: 'Estimasi awal (belum terbit SKRD)'
            });
            console.log(`✅ Transaksi berhasil dibuat (Total ${estimasiTagihan})`);
        } catch (paymentErr) {
            console.error('⚠️ Gagal membuat transaksi awal:', paymentErr.message);
        }

        // 8. Notifikasi admin
        try {
            await notificationModel.createAdmin({
                title: 'Pengajuan Baru',
                message: `${payload.nama_pemohon} mengajukan ${payload.nama_proyek}`,
                href: `/admin/submissions/${id}`
            });
        } catch (notifErr) {
            console.error('⚠️ Gagal mengirim notifikasi admin:', notifErr.message);
        }

        // ✅ RESPOND SUKSES DULU — jangan tunggu upload file
        success(res, 'Submission berhasil dibuat', { id }, 201);

        // ====== UPLOAD FILE DI BACKGROUND (setelah response dikirim) ======
        // Vercel masih jalankan kode ini beberapa detik setelah res dikirim
        const updatedUrls = {};

        // Cek URL dari direct upload (browser ke Supabase)
        if (req.body.file_surat_permohonan_url) updatedUrls.file_surat_permohonan = req.body.file_surat_permohonan_url;
        if (req.body.file_ktp_url) updatedUrls.file_ktp = req.body.file_ktp_url;
        if (req.body.dokumen_tambahan_url) updatedUrls.dokumen_tambahan = req.body.dokumen_tambahan_url;

        // Upload server-side jika tidak ada URL dari browser
        if (req.files && Object.keys(updatedUrls).length === 0) {
            const pathMod = require('path');
            const uploads = [];
            if (req.files.surat_permohonan?.[0]) {
                const f = req.files.surat_permohonan[0];
                uploads.push(uploadToSupabase(f.buffer, `SuratPermohonan_${id}${pathMod.extname(f.originalname)}`, f.mimetype, 'uploads', 'surat_permohonan')
                    .then(url => { updatedUrls.file_surat_permohonan = url; }).catch(e => console.error('bg upload surat:', e.message)));
            }
            if (req.files.scan_ktp?.[0]) {
                const f = req.files.scan_ktp[0];
                uploads.push(uploadToSupabase(f.buffer, `KTP_${id}${pathMod.extname(f.originalname)}`, f.mimetype, 'uploads', 'scan_ktp')
                    .then(url => { updatedUrls.file_ktp = url; }).catch(e => console.error('bg upload ktp:', e.message)));
            }
            if (req.files.lampiran_pendukung?.[0]) {
                const f = req.files.lampiran_pendukung[0];
                uploads.push(uploadToSupabase(f.buffer, `Lampiran_${id}${pathMod.extname(f.originalname)}`, f.mimetype, 'uploads', 'lampiran_pendukung')
                    .then(url => { updatedUrls.dokumen_tambahan = url; }).catch(e => console.error('bg upload lampiran:', e.message)));
            }
            // Tunggu semua upload (best-effort, max sisa waktu Vercel)
            if (uploads.length > 0) await Promise.allSettled(uploads);
        }

        // Update DB dengan file URL jika ada
        if (Object.keys(updatedUrls).length > 0) {
            await submissionModel.update(id, updatedUrls).catch(e => console.error('bg update urls:', e.message));
            console.log('✅ Background upload selesai, URLs tersimpan:', updatedUrls);
        }
        // ====== SELESAI BACKGROUND ======

    } catch (err) {
        console.error('❌ ERROR:', err);
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server',
            error: err.message,
            stack: err.stack
        });
    }
};

exports.update = async (req, res, next) => {
    try {
        const existing = await submissionModel.findById(req.params.id);
        if (!existing) return error(res, 404, 'Submission tidak ditemukan');

        const affected = await submissionModel.update(req.params.id, req.body);
        if (!affected) return error(res, 400, 'Tidak ada data yang diupdate');

        // Notifikasi ke user (jika status berubah)
        if (req.body.status && req.body.status !== existing.status) {
            await notificationModel.createUser({
                user_id: existing.user_id,
                title: 'Status Pengajuan Berubah',
                message: `Pengajuan ${existing.nama_proyek} sekarang: ${req.body.status}`,
                type: 'status_update',
                related_id: req.params.id
            });
        }

        return success(res, 'Submission diupdate');
    } catch (err) {
        next(err);
    }
};

exports.delete = async (req, res, next) => {
    try {
        const affected = await submissionModel.delete(req.params.id);
        if (!affected) return error(res, 404, 'Submission tidak ditemukan');
        return success(res, 'Submission dihapus');
    } catch (err) {
        next(err);
    }
};

exports.cancel = async (req, res, next) => {
    try {
        const existing = await submissionModel.findById(req.params.id);
        if (!existing) return error(res, 404, 'Submission tidak ditemukan');

        // User pelanggan hanya boleh cancel submission miliknya
        if (req.user.role === 'pelanggan' && existing.user_id !== req.user.id) {
            return error(res, 403, 'Akses ditolak');
        }

        await submissionModel.cancel(req.params.id);
        return success(res, 'Submission dibatalkan');
    } catch (err) {
        next(err);
    }
};

exports.getDocuments = async (req, res, next) => {
    try {
        const data = await submissionModel.findById(req.params.id);
        if (!data) return error(res, 404, 'Submission tidak ditemukan');
        return success(res, 'Dokumen submission', {
            file_surat_permohonan: data.file_surat_permohonan,
            file_ktp: data.file_ktp,
            dokumen_tambahan: data.dokumen_tambahan
        });
    } catch (err) {
        next(err);
    }
};

exports.userHistory = async (req, res, next) => {
    try {
        const { status, limit = 20, offset = 0 } = req.query;
        const data = await submissionModel.findByUserId(req.user.id, {
            status,
            limit,
            offset
        });
        return success(res, 'Riwayat pengajuan', data);
    } catch (err) {
        next(err);
    }
};

exports.userHistoryDetail = async (req, res, next) => {
    try {
        const data = await submissionModel.findById(req.params.id);
        if (!data) return error(res, 404, 'Submission tidak ditemukan');
        if (data.user_id !== req.user.id && req.user.role === 'pelanggan') {
            return error(res, 403, 'Akses ditolak');
        }
        
        // ========== AMBIL PAYMENT ==========
        const paymentModel = require('../models/paymentModel');
        const payments = await paymentModel.findBySubmissionId(req.params.id);
        data.payment = payments.length > 0 ? payments[0] : null;
        
        // ========== AMBIL SAMPLES ==========
        const db = require('../config/database');
        const [samples] = await db.query(
            `SELECT s.*, c.category_name, t.type_name 
             FROM submission_samples s 
             LEFT JOIN test_categories c ON c.id = s.test_category_id 
             LEFT JOIN test_types t ON t.id = s.test_type_id 
             WHERE s.submission_id = ?`,
            [req.params.id]
        );
        data.samples = samples;

        // ========== 🔥 AMBIL LAPORAN (TAMBAHKAN INI) ==========
        const reportModel = require('../models/reportModel');
        const reports = await reportModel.findBySubmissionId(req.params.id);
        data.report = reports && reports.length > 0 ? reports[0] : null;

        // ========== AMBIL KUIISIONER (OPSIONAL) ==========
        const kuisionerModel = require('../models/kuisionerModel');
        const kuisioner = await kuisionerModel.findBySubmissionId(req.params.id);
        data.kuisioner = kuisioner || null;

        return success(res, 'Detail pengajuan', data);
    } catch (err) {
        next(err);
    }
};

exports.userDashboard = async (req, res, next) => {
    try {
        const recent = await submissionModel.findByUserId(req.user.id, { limit: 5 });
        const statsArray = await submissionModel.countByStatusUser(req.user.id);
        
        let totalSubmissions = 0, completedTests = 0;
        statsArray.forEach(s => {
            totalSubmissions += parseInt(s.total, 10);
            if (s.status === 'Selesai') completedTests += parseInt(s.total, 10);
        });

        const db = require('../config/database');
        const [paymentStats] = await db.query(
            "SELECT SUM(total_tagihan) as totalSpending FROM payments p JOIN submissions s ON s.id = p.submission_id WHERE s.user_id = ? AND p.status_pembayaran = 'Lunas'", 
            [req.user.id]
        );
        const [pendingPaymentStats] = await db.query(
            "SELECT COUNT(*) as count FROM payments p JOIN submissions s ON s.id = p.submission_id WHERE s.user_id = ? AND p.status_pembayaran = 'Belum Bayar'", 
            [req.user.id]
        );
        const pendingPayment = pendingPaymentStats[0]?.count || 0;
        const totalSpending = paymentStats[0]?.totalSpending || 0;

        // Hitung aktivitas 7 hari terakhir
        const [weeklyStats] = await db.query(`
            SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, COUNT(*) as count 
            FROM submissions 
            WHERE user_id = ? 
              AND created_at >= CURRENT_DATE - INTERVAL '6 DAY'
            GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
        `, [req.user.id]);

        const weeklyActivity = [0, 0, 0, 0, 0, 0, 0];
        const chartLabels = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const pastDate = new Date(today);
            pastDate.setDate(today.getDate() - i);
            const dateStr = pastDate.toISOString().split('T')[0];
            chartLabels.push(dateStr.slice(5)); // misal '06-25'
            
            const match = weeklyStats.find(s => {
                const sDate = new Date(s.date);
                sDate.setMinutes(sDate.getMinutes() - sDate.getTimezoneOffset());
                return sDate.toISOString().split('T')[0] === dateStr;
            });
            if (match) {
                weeklyActivity[6 - i] = match.count;
            }
        }

        return success(res, 'Dashboard user', {
            recentSubmissions: recent,
            totalSubmissions,
            pendingPayment,
            completedTests,
            totalSpending,
            weeklyActivity,
            chartLabels
        });
    } catch (err) {
        next(err);
    }
};

// =========== UPLOAD LAPORAN (HASIL PENGUJIAN) ===========
exports.uploadReport = async (req, res, next) => {
    try {
        const submissionId = req.params.id;

        // 1. Cek submission
        const submission = await submissionModel.findById(submissionId);
        if (!submission) {
            return error(res, 404, 'Submission tidak ditemukan');
        }

        // 2. Cek file
        if (!req.file) {
            return error(res, 400, 'File laporan belum diupload');
        }

        // 3. Simpan ke tabel test_reports
        const reportModel = require('../models/reportModel');

        // 🔥 CEK APAKAH SUDAH ADA LAPORAN UNTUK SUBMISSION INI
        const existingReports = await reportModel.findBySubmissionId(submissionId);
        if (existingReports.length > 0) {
            // Jika sudah ada, hapus yang lama (opsional, atau update)
            await reportModel.deleteBySubmissionId(submissionId);
        }

        const reportId = await reportModel.create({
            submission_id: submissionId,
            file_laporan: req.file.filename,  // 🔥 PAKAI file_laporan (bukan file_path)
            no_laporan: `LAP-${submissionId}-${Date.now()}`,
            tanggal_selesai: new Date(),
            catatan_laporan: req.body.catatan || null
        });

        // 4. Update status submission menjadi 'Selesai' (opsional)
        await submissionModel.updateStatus(submissionId, 'Selesai');

        // 5. Notifikasi ke user
        const notificationModel = require('../models/notificationModel');
        await notificationModel.createUser({
            user_id: submission.user_id,
            title: 'Laporan Hasil Pengujian Tersedia',
            message: `Laporan untuk ${submission.nama_proyek} telah tersedia. Silakan unduh di halaman detail pengajuan.`,
            type: 'report'
        });

        return success(res, 'Laporan berhasil diupload', {
            reportId,
            filename: req.file.filename
        });

    } catch (err) {
        console.error('❌ Error upload report:', err);
        next(err);
    }
};

exports.deleteReport = async (req, res, next) => {
    try {
        const submissionId = req.params.id;

        // 1. Cek submission
        const submission = await submissionModel.findById(submissionId);
        if (!submission) {
            return error(res, 404, 'Submission tidak ditemukan');
        }

        // 2. Hapus laporan dari database
        const reportModel = require('../models/reportModel');
        const affected = await reportModel.deleteBySubmissionId(submissionId);

        if (!affected) {
            return error(res, 404, 'Laporan tidak ditemukan');
        }

        // 3. (Opsional) Update status submission kembali ke 'Lunas' atau status sebelumnya?
        // Tergantung kebutuhan, bisa dibiarkan.

        return success(res, 'Laporan berhasil dihapus');

    } catch (err) {
        console.error('❌ Error delete report:', err);
        next(err);
    }
};