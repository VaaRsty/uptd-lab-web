const db = require('../config/database');

const maintenanceCheck = async (req, res, next) => {
    try {
        const [rows] = await db.query("SELECT setting_value FROM settings WHERE setting_key = 'maintenance_mode'");
        const maintenanceMode = rows.length > 0 ? rows[0].setting_value === 'true' : false;

        if (!maintenanceMode) {
            return next();
        }

        // Jika maintenance aktif:

        // 1. Admin dan Superadmin yang sudah login bebas akses
        if (req.session?.user && (req.session.user.role === 'admin' || req.session.user.role === 'superadmin')) {
            return next();
        }

        // 2. Izinkan rute yang berkaitan dengan login admin agar admin bisa masuk
        const isAdminRoute = req.path === '/admin/login' || req.path.startsWith('/auth/admin/login');
        if (isAdminRoute) {
            return next();
        }

        // Sisanya (termasuk halaman publik dan user biasa) kena blokir maintenance
        return res.status(503).render('maintenance', {
            title: 'Maintenance - UPTD Lab',
            layout: false,
            message: 'Sistem sedang dalam pemeliharaan. Mohon kembali lagi nanti.'
        });
    } catch (error) {
        console.error('Error checking maintenance:', error);
        next();
    }
};

module.exports = maintenanceCheck;