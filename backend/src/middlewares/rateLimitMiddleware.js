const rateLimit = require('express-rate-limit');
const env = require('../config/env');

/**
 * Rate limit global untuk semua route /api.
 * Mencegah abuse & DDoS ringan.
 */
exports.globalLimiter = rateLimit({
    windowMs: env.RATE_LIMIT?.windowMs || 1 * 60 * 1000,
    max: env.RATE_LIMIT?.max || 350,
    message: {
        success: false,
        message: 'Terlalu banyak request, coba lagi nanti'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Rate limit khusus endpoint login.
 * Mencegah brute force password.
 */
exports.loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? (env.RATE_LIMIT.loginMax || 10) : 100,
    message: {
        success: false,
        message: 'Terlalu banyak percobaan login, coba 15 menit lagi'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
});

/**
 * Rate limit khusus endpoint forgot-password.
 * Membatasi 5 request per IP per 15 menit untuk mencegah spam email.
 */
exports.forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: process.env.NODE_ENV === 'production' ? 5 : 50,
    message: {
        success: false,
        message: 'Terlalu banyak permintaan reset password. Silakan coba lagi 15 menit kemudian.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false
});
