/**
 * Controller halaman ADMIN.
 * Sebagian besar hanya render template, data fetch via AJAX dari frontend
 * (atau ada beberapa yang ambil data via apiClient sebelum render).
 */
const api = require('../services/apiClient');
const logger = require('../utils/logger');

// ==================== DASHBOARD ====================
exports.dashboard = async (req, res) => {
    const token = req.session?.token;
    // if (!token) return res.redirect('/admin/login');

    const fallbackData = {
        stats: { income: 'Rp 0', pending: 0, completed: 0, awaitingPayment: 0 },
        activities: [],
        submissions: [],
        chartLabels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'],
        chartValues: [0, 0, 0, 0, 0, 0]
    };

    try {
        const response = await api.dashboard.adminStats(token);
        const dashboardData =
            response.data?.success && response.data.data ? response.data.data : fallbackData;

        res.render('admin/dashboard', {
            title: 'Dashboard Admin - UPTD Lab',
            page: 'dashboard',
            currentPage: 'dashboard',
            user: req.session.user,
            data: dashboardData,
            error: null
        });
    } catch (err) {
        logger.error('Error loading admin dashboard: ' + err.message);
        res.render('admin/dashboard', {
            title: 'Dashboard Admin - UPTD Lab',
            page: 'dashboard',
            currentPage: 'dashboard',
            user: req.session.user,
            data: fallbackData,
            error: 'Gagal memuat data dari server'
        });
    }
};

// ==================== SUBMISSIONS ====================
exports.submissions = async (req, res) => {
    const token = req.session?.token;
    // if (!token) return res.redirect('/admin/login');

    const page = parseInt(req.query.page, 10) || 1;
    const status = req.query.status || '';
    const search = req.query.search || '';

    try {
        const response = await api.submission.list(token, { page, status, search, limit: 10 });
        const payload = response.data?.success ? response.data : { data: [], pagination: {} };

        res.render('admin/submissions', {
            title: 'Manajemen Pengajuan',
            page: 'submissions',
            user: req.session.user,
            submissions: payload.data || [],
            pagination: {
                page: payload.pagination?.page || page,
                totalPages: payload.pagination?.totalPages || 0,
                total: payload.pagination?.total || 0
            },
            filters: { status, search }
        });
    } catch (err) {
        logger.error('Error loading admin submissions: ' + err.message);
        if (err.response?.status === 401) return res.redirect('/admin/login');

        res.render('admin/submissions', {
            title: 'Manajemen Pengajuan',
            page: 'submissions',
            user: req.session.user,
            submissions: [],
            pagination: { page: 1, totalPages: 0, total: 0 },
            filters: { status, search }
        });
    }
};

exports.detailSubmission = (req, res) => {
    res.render('admin/detail-submission', {
        title: 'Detail Pengajuan',
        page: 'submissions',
        currentPage: 'submissions',
        submissionId: req.params.id,
        user: req.session?.user
    });
};

// ==================== SKRD ====================
exports.skrd = (req, res) => {
    res.render('admin/skrd', {
        title: 'Manajemen SKRD - UPTD Lab',
        page: 'skrd',
        currentPage: 'skrd',
        user: req.session?.user
    });
};

exports.detailSkrd = (req, res) => {
    res.render('admin/detail-skrd', {
        title: 'Detail SKRD - UPTD Lab',
        page: 'skrd',
        currentPage: 'skrd',
        user: req.session?.user,
        id: req.params.id
    });
};

// ==================== USERS ====================
exports.users = (req, res) => {
    res.render('admin/users', {
        title: 'Data Pemohon',
        page: 'users',
        user: req.session?.user
    });
};

exports.userDetail = (req, res) => {
    res.render('admin/detail-user', {
        title: 'Detail Pemohon',
        page: 'users',
        userId: req.params.id,
        user: req.session?.user
    });
};

// ==================== SETTINGS ====================
exports.settings = (req, res) => {
    res.render('admin/settings', {
        title: 'Pengaturan Sistem',
        page: 'settings',
        user: req.session?.user
    });
};

// ==================== REPORTS ====================
exports.reports = (req, res) => {
    res.render('admin/reports', {
        title: 'Laporan & Statistik',
        page: 'reports',
        user: req.session?.user
    });
};

// ==================== KUISIONER ====================
exports.kuisioner = (req, res) => {
    res.render('admin/kuisioner', {
        title: 'Manajemen Kuisioner - UPTD Lab',
        page: 'kuisioner',
        currentPage: 'kuisioner',
        user: req.session?.user
    });
};
