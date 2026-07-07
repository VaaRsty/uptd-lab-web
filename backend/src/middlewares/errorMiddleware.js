const logger = require('../utils/logger');
const env = require('../config/env');

/**
 * Handler untuk endpoint yang tidak ditemukan (404).
 */
exports.notFound = (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint tidak ditemukan'
    });
};

/**
 * Global error handler.
 * Semua controller cukup pakai next(err), error akan ditangkap di sini.
 */
// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, req, res, next) => {
    logger.error({
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip
    });

    // Multer file size error
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'Ukuran file melebihi batas maksimal'
        });
    }

    // CORS error
    if (err.message && err.message.includes('CORS')) {
        return res.status(403).json({
            success: false,
            message: 'Origin tidak diizinkan'
        });
    }

    const statusCode = err.statusCode || err.status || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message,
        stack: err.stack
    });
};
