/**
 * Controller untuk halaman USER (pelanggan).
 * Dashboard, profile, submission, history, transaction.
 */
const fs = require('fs');
const FormData = require('form-data');
const db = require('../config/database');
const api = require('../services/apiClient');
const logger = require('../utils/logger');

// Helper: build session user data
const sessionUser = (req) => ({
    ...req.session.user,
    name: req.session.user.full_name || req.session.user.name
});

// ==================== DASHBOARD ====================
exports.dashboard = async (req, res) => {
    const token = req.session?.token;
    if (!token) return res.redirect('/login');

    const fallbackData = {
        totalSubmissions: 0,
        pendingPayment: 0,
        completedTests: 0,
        totalSpending: 0,
        materialTestingCount: 0,
        siteReviewCount: 0,
        paidInvoices: 0,
        duePayments: 0,
        recentSubmissions: [],
        recentTransactions: [],
        weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
        submissionsChange: 0
    };

    try {
        // Ambil data dashboard + history secara paralel
        const [dashboardRes, historyRes] = await Promise.allSettled([
            api.submission.userDashboard(token),
            api.submission.userHistory(token)
        ]);

        let dashboardData = { ...fallbackData };
        if (dashboardRes.status === 'fulfilled' && dashboardRes.value.data?.success) {
            const d = dashboardRes.value.data.data || {};
            dashboardData = {
                ...fallbackData,
                ...d,
                recentSubmissions: (d.recentSubmissions || []).map((sub) => ({
                    id: sub.id,
                    no_permohonan: sub.no_permohonan || sub.id,
                    nama_proyek: sub.nama_proyek || 'Pengujian',
                    status: sub.status || 'Pending',
                    created_at: sub.created_at || sub.tgl_permohonan || null,
                    total_samples: `${sub.totalSamples || sub.total_samples || 0} sampel`
                }))
            };
        }

        // Override recentSubmissions dari history biar konsisten
        if (historyRes.status === 'fulfilled' && historyRes.value.data?.success) {
            const paginatedData = historyRes.value.data.data || {};
            const history = Array.isArray(paginatedData) ? paginatedData : (paginatedData.data || []);
            const recent = history
                .slice(0, 5) // ambil 5 teratas
                .sort((a, b) => {
                    const at = new Date(a.created_at || 0).getTime();
                    const bt = new Date(b.created_at || 0).getTime();
                    return bt - at;
                })
                .map((sub) => {
                    const num = Number.parseInt(sub.id, 10);
                    const validNum = Number.isInteger(num) && num > 0;
                    return {
                        id: sub.id,
                        no_permohonan: validNum ? String(num).padStart(6, '0') : (sub.no_permohonan || sub.id || '-'),
                        nama_proyek: sub.nama_proyek || 'Pengujian',
                        status: sub.status || 'Menunggu Verifikasi',
                        created_at: sub.created_at || sub.tgl_permohonan || null,
                        total_samples: sub.total_samples !== undefined && sub.total_samples !== null
                            ? `${sub.total_samples} sampel`
                            : (sub.kode_pengujian || sub.service_type || '-')
                    };
                });
            if (recent.length > 0) {
                dashboardData.recentSubmissions = recent;
                // JANGAN overwrite totalSubmissions dengan history.length karena history.length hanya limit 20 (paginated)
            }
        }

        res.render('user/dashboard', {
            title: 'Dashboard - UPTD Lab',
            pageTitle: 'Dashboard',
            active: 'dashboard',
            user: sessionUser(req),
            dashboardData
        });
    } catch (err) {
        logger.error('Error loading user dashboard: ' + err.message);
        res.render('user/dashboard', {
            title: 'Dashboard - UPTD Lab',
            pageTitle: 'Dashboard',
            active: 'dashboard',
            user: sessionUser(req),
            dashboardData: fallbackData,
            error: 'Gagal memuat data dashboard'
        });
    }
};

// ==================== PROFILE PAGE ====================
exports.profile = async (req, res) => {
    const token = req.session?.token;
    let notificationCount = 0;
    let notif_email = true;
    let notif_wa = false;

    try {
        if (token) {
            const [countRes, settingsRes] = await Promise.allSettled([
                api.notification.unreadCount(token),
                api.notification.getSettings(token)
            ]);

            if (countRes.status === 'fulfilled' && countRes.value.data?.success) {
                notificationCount = countRes.value.data.data?.unread || 0;
            }
            if (settingsRes.status === 'fulfilled' && settingsRes.value.data?.success) {
                notif_email = settingsRes.value.data.data.notif_email;
                notif_wa = settingsRes.value.data.data.notif_wa;
            }
        }
    } catch (err) {
        logger.warn('Error loading profile data: ' + err.message);
    }

    res.render('user/profile', {
        title: 'Profil Saya',
        pageTitle: 'Profil Saya',
        active: 'profile',
        user: { ...sessionUser(req), notif_email, notif_wa },
        notificationCount
    });
};

// ==================== UPDATE PROFILE ====================
exports.updateProfile = async (req, res) => {
    const token = req.session?.token;
    const userId = req.session?.user?.id;
    if (!token || !userId) return res.redirect('/login');

    try {
        const response = await api.user.updateProfile(token, req.body);
        if (response.data.success) {
            req.session.user = { ...req.session.user, ...req.body };
            return res.redirect('/user/profile?success=true&message=Profil+berhasil+diupdate');
        }
        return res.redirect(
            '/user/profile?error=' + encodeURIComponent(response.data.message || 'Gagal update profil')
        );
    } catch (err) {
        logger.error('Error updating profile: ' + err.message);
        return res.redirect(
            '/user/profile?error=' +
                encodeURIComponent(err.response?.data?.message || 'Gagal update profil')
        );
    }
};

// ==================== HISTORY ====================
exports.history = async (req, res) => {
    const token = req.session?.token;
    if (!token) return res.redirect('/login');

    try {
        const response = await api.submission.userHistory(token);
        const submissions = response.data?.success ? response.data.data || [] : [];

        res.render('user/history', {
            title: 'Riwayat Pengajuan - UPTD Lab',
            pageTitle: 'History Submission',
            currentPage: 'history',
            user: sessionUser(req),
            submissions,
            success: req.query.success === 'true',
            message: req.query.message || ''
        });
    } catch (err) {
        logger.error('Error loading history: ' + err.message);
        res.render('user/history', {
            title: 'Riwayat Pengajuan - UPTD Lab',
            pageTitle: 'History Submission',
            currentPage: 'history',
            user: sessionUser(req),
            submissions: [],
            success: false,
            message: ''
        });
    }
};

exports.historyDetail = (req, res) => {
    const token = req.session?.token;
    const submissionId = req.params.id;
    if (!token) return res.redirect('/login');
    if (!submissionId || isNaN(submissionId)) return res.redirect('/user/history');

    res.render('user/history-detail', {
        title: 'Detail Pengajuan - UPTD Lab',
        pageTitle: 'Detail Pengajuan',
        currentPage: 'history',
        user: sessionUser(req),
        notificationCount: 0,
        id: submissionId,
        token
    });
};

// ==================== SUBMISSION FORM PAGE ====================
exports.submissionPage = async (req, res) => {
    const userId = req.session?.user?.id;
    if (!userId) return res.redirect('/login');

    try {
        const [users] = await db.query(
            `SELECT 
                full_name AS name, nama_instansi AS company, email,
                nomor_telepon AS phone, alamat AS address
             FROM users WHERE id = ?`,
            [userId]
        );

        const [services] = await db.query(`
            SELECT 
                tt.id AS type_id, tt.type_name AS "typeName",
                tc.id AS category_id, tc.category_name AS "categoryName",
                s.id AS service_id, s.service_name AS name,
                s.min_sample AS sample_value, s.satuan AS sample_unit,
                CONCAT(s.min_sample, ' ', s.satuan) AS sample,
                s.duration_days AS duration, s.price, s.method, s.satuan AS unit
            FROM test_types tt
            JOIN test_categories tc ON tt.id = tc.test_type_id
            JOIN services s ON tc.id = s.category_id
            ORDER BY tt.id, tc.id, s.id
        `);

        // Busy mode
        let busyMode = { active: false, activePeriods: [] };
        try {
            const [settings] = await db.query(
                "SELECT setting_value FROM settings WHERE setting_key = 'busy_mode_active'"
            );
            const active = settings.length > 0 ? settings[0].setting_value === '1' : false;
            if (active) {
                const [periods] = await db.query(
                    `SELECT id, keterangan,
                            TO_CHAR(tanggal_mulai, 'YYYY-MM-DD') AS tanggal_mulai,
                            TO_CHAR(tanggal_selesai, 'YYYY-MM-DD') AS tanggal_selesai
                     FROM jadwal_sibuk
                     WHERE tanggal_selesai >= CURRENT_DATE
                     ORDER BY tanggal_mulai ASC`
                );
                busyMode = { active: true, activePeriods: periods };
            }
        } catch (err) {
            logger.warn('Error loading busy mode: ' + err.message);
        }

        const groupedServices = groupServices(services);
        const userData = users[0] || { name: '', company: '', email: '', phone: '', address: '' };

        res.render('user/submission', {
            title: 'Form Pengajuan Pengujian',
            currentPage: 'submission',
            user: userData,
            services: groupedServices,
            busyMode,
            formData: {},
            error: null,
            token: ''
        });
    } catch (err) {
        logger.error('Error rendering submission page: ' + err.message);
        res.status(500).send('Internal Server Error');
    }
};

// ==================== POST SUBMISSION ====================
exports.createSubmission = async (req, res) => {
    const token = req.session?.token;
    if (!token) {
        return res.status(401).json({ success: false, message: 'Unauthorized - Silakan login kembali' });
    }

    try {
        const formData = new FormData();

        Object.keys(req.body).forEach((key) => {
            const val = req.body[key];
            formData.append(key, Array.isArray(val) ? val.join(',') : (val || ''));
        });

        if (req.files) {
            ['surat_permohonan', 'scan_ktp', 'lampiran_pendukung'].forEach((field) => {
                if (req.files[field]?.[0]) {
                    const file = req.files[field][0];
                    if (file.buffer) {
                        formData.append(field, file.buffer, {
                            filename: file.originalname,
                            contentType: file.mimetype
                        });
                    }
                }
            });
        }

        const response = await api.submission.create(token, formData);

        if (response.data.success) {
            return res.json({
                success: true,
                message: 'Pengajuan berhasil dikirim',
                data: response.data.data
            });
        }
        return res.json({ success: false, message: response.data.message || 'Gagal mengirim pengajuan' });
    } catch (err) {
        logger.error('Error posting submission: ' + err.message);

        let msg = 'Gagal mengirim pengajuan. Silakan coba lagi.';
        if (err.code === 'ECONNREFUSED') {
            msg = 'Tidak dapat terhubung ke server backend. Pastikan backend berjalan di port 5000.';
        } else if (err.response?.data?.errors?.length) {
            msg = err.response.data.errors.map((e) => e.message).join(', ');
        } else if (err.response?.data?.message) {
            msg = err.response.data.message;
        }

        return res.json({ success: false, message: msg });
    }
};

// ==================== TRANSACTIONS ====================
exports.transactions = async (req, res) => {
    const token = req.session?.token;
    if (!token) return res.redirect('/login');

    try {
        const response = await api.transaction.userList(token);
        const transactions = response.data?.success ? response.data.data || [] : [];

        res.render('user/transaction', {
            title: 'Transaksi Saya - UPTD Lab',
            pageTitle: 'Transaction List',
            currentPage: 'transaction',
            user: sessionUser(req),
            notificationCount: 0,
            transactions
        });
    } catch (err) {
        logger.error('Error loading transactions: ' + err.message);
        res.render('user/transaction', {
            title: 'Transaksi Saya - UPTD Lab',
            pageTitle: 'Transaction List',
            currentPage: 'transaction',
            user: sessionUser(req),
            notificationCount: 0,
            transactions: []
        });
    }
};

exports.transactionDetail = async (req, res) => {
    const token = req.session?.token;
    const transactionId = req.params.id;
    if (!token) return res.redirect('/login');

    try {
        const response = await api.transaction.userDetail(token, transactionId);
        const transaction = response.data?.success ? response.data.data : null;

        res.render('user/transaction-detail', {
            title: 'Detail Transaksi - UPTD Lab',
            pageTitle: 'Detail Transaksi',
            active: 'transaction',
            user: sessionUser(req),
            id: transactionId,
            transaction
        });
    } catch (err) {
        logger.error('Error loading transaction detail: ' + err.message);
        res.render('user/transaction-detail', {
            title: 'Detail Transaksi - UPTD Lab',
            pageTitle: 'Detail Transaksi',
            active: 'transaction',
            user: sessionUser(req),
            id: transactionId,
            transaction: null
        });
    }
};

// ==================== UPLOAD PAYMENT PROOF ====================
exports.uploadPaymentProof = async (req, res) => {
    const token = req.session?.token;
    const transactionId = req.params.id;
    if (!token) return res.redirect('/login');

    if (!req.file) {
        return res.redirect(
            `/user/transaction/${transactionId}?error=` +
                encodeURIComponent('File bukti pembayaran wajib diupload')
        );
    }

    try {
        const formData = new FormData();
        formData.append('payment_proof', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });
        if (req.body.notes) formData.append('notes', req.body.notes);

        const response = await api.skrd.uploadPaymentProof(token, transactionId, formData);

        if (response.data.success) {
            return res.redirect(
                `/user/transaction/${transactionId}?success=true&message=Upload+berhasil`
            );
        }
        return res.redirect(
            `/user/transaction/${transactionId}?error=` + encodeURIComponent(response.data.message)
        );
    } catch (err) {
        logger.error('Error uploading payment proof: ' + err.message);
        return res.redirect(
            `/user/transaction/${transactionId}?error=` +
                encodeURIComponent('Gagal upload bukti pembayaran')
        );
    }
};

// =========== Helper untuk submission page ===========
function groupServices(services) {
    const grouped = [];
    const typeMap = new Map();

    services.forEach((item) => {
        if (!typeMap.has(item.type_id)) {
            typeMap.set(item.type_id, {
                typeId: item.type_id,
                typeName: item.typeName,
                categories: []
            });
            grouped.push(typeMap.get(item.type_id));
        }
        const currentType = typeMap.get(item.type_id);
        let category = currentType.categories.find((c) => c.categoryId === item.category_id);
        if (!category) {
            category = {
                categoryId: item.category_id,
                categoryName: item.categoryName,
                items: []
            };
            currentType.categories.push(category);
        }
        category.items.push({
            id: item.service_id,
            name: item.name,
            sample: item.sample,
            sample_value: item.sample_value,
            sample_unit: item.sample_unit,
            duration: item.duration,
            price: item.price,
            method: item.method,
            unit: item.unit || 'sample'
        });
    });

    return grouped;
}
