// frontend/src/middleware/maintenanceCheck.js
const db = require('../config/database');

const maintenanceCheck = async (req, res, next) => {
    // Lewati jika user adalah admin (role admin/superadmin)
    if (req.session?.user && (req.session.user.role === 'admin' || req.session.user.role === 'superadmin')) {
        return next();
    }

    try {
        const [rows] = await db.query("SELECT setting_value FROM settings WHERE setting_key = 'maintenance_mode'");
        const maintenanceMode = rows.length > 0 ? rows[0].setting_value === 'true' : false;

        if (maintenanceMode) {
            // Jika maintenance aktif, tampilkan halaman maintenance
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