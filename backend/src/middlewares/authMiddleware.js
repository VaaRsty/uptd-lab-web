/**
 * Middleware autentikasi (SLIM): cuma verifikasi JWT token.
 * Logic register/login PINDAH ke controllers/authController.js.
 */
const tokenService = require('../services/tokenService');
const logger = require('../utils/logger');

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        let token = null;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else if (req.cookies?.token) {
            token = req.cookies.token;
        } else if (req.cookies?.admin_token) {
            token = req.cookies.admin_token;
        } else if (req.query?.token) {
            // Diperbolehkan khusus untuk akses file langsung di tab baru
            // (token di query param hanya aman untuk GET /api/files karena bukan endpoint sensitif)
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token tidak ditemukan'
            });
        }

        const decoded = tokenService.verifyAccess(token);
        req.user = decoded;
        req.userId = decoded.id;
        req.userRole = decoded.role;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token expired' });
        }
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ success: false, message: 'Token tidak valid' });
        }
        logger.error('Auth middleware error: ' + err.message);
        return res.status(500).json({
            success: false,
            message: 'Kesalahan autentikasi'
        });
    }
};

module.exports = authMiddleware;
