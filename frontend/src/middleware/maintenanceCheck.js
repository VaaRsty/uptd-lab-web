const db = require('../config/database');

const maintenanceCheck = async (req, res, next) => {
    // 🔥 LEWATI SEMUA ROUTE PUBLIK (TIDAK BUTUH LOGIN)
    const publicRoutes = ['/', '/services', '/estimasi', '/profile', '/tentang', '/kontak', '/faq', '/login', '/register', '/admin/login', '/kuisioner', '/track'];
    if (publicRoutes.some(route => req.path === route || req.path.startsWith(route + '/'))) {
        return next();
    }

    // 🔥 ADMIN DAN SUPERADMIN BEBAS LEWAT
    if (req.session?.user && (req.session.user.role === 'admin' || req.session.user.role === 'superadmin')) {
        return next();
    }

    try {
        const [rows] = await db.query("SELECT setting_value FROM settings WHERE setting_key = 'maintenance_mode'");
        const maintenanceMode = rows.length > 0 ? rows[0].setting_value === 'true' : false;

        if (maintenanceMode) {
            // 🔥 HANYA USER BIASA YANG KENA BLOKIR
            return res.status(503).render('maintenance', {
                title: 'Maintenance - UPTD Lab',
                layout: false,
                message: 'Sistem sedang dalam pemeliharaan. Mohon kembali lagi nanti.'
            });
        }
        next();
    } catch (error) {
        console.error('Error checking maintenance:', error);
        next();
    }
};

module.exports = maintenanceCheck;