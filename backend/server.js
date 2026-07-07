/**
 * Entry point backend UPTD Lab Pengujian.
 * Setup middleware security, mount route, start server.
 */
require('./src/config/env'); // validasi env paling awal

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const path = require('path');

// Dihapus: const socketUtil = require('./src/utils/socket');
const env = require('./src/config/env');
const logger = require('./src/utils/logger');
console.log('🟢 [3] Sebelum require routes...');
const apiRoutes = require('./src/routes');
console.log('🟢 [4] Selesai require routes!');
const { globalLimiter } = require('./src/middlewares/rateLimitMiddleware');
const { notFound, errorHandler } = require('./src/middlewares/errorMiddleware');

const app = express();

// Trust proxy (penting saat dibalik nginx/cloudflare)
app.set('trust proxy', 1);

// Security headers
app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginResourcePolicy: { policy: 'cross-origin' }
    })
);

// CORS whitelist dari env
app.use(
    cors({
        origin: (origin, cb) => {
            if (!origin || env.CORS_ORIGINS.includes(origin)) return cb(null, true);
            return cb(new Error('CORS: Origin tidak diizinkan'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    })
);

// Body parser dengan limit (cegah payload bomb)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());


// Anti HTTP Parameter Pollution
app.use(hpp());

// Compression response
app.use(compression());

// Rate limit di semua route /api
app.use('/api', globalLimiter);

// Health check
app.get('/', (_req, res) => {
    res.json({ status: 'ok', service: 'UPTD Lab Pengujian API', version: '2.0.0' });
});

// API routes
app.use('/api', apiRoutes);

// Avatar publik (gampang ditampilkan di UI tanpa token).
// File sensitif (KTP, surat, dll) akses via /api/files/* yang ada auth-nya.
app.use('/uploads/avatar', express.static(path.join(__dirname, 'uploads/avatar')));

// 404 + Global error handler (PALING BAWAH)
app.use(notFound);


app.use(errorHandler);

// Start server
const server = app.listen(env.PORT, () => {
    console.log(`🚀🚀🚀 SERVER BERHASIL JALAN DI PORT ${env.PORT} !!!`);
    logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
});

// Setup Socket.IO (Dihapus karena Vercel)
// socketUtil.init(server);

// Graceful shutdown
process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Rejection: ' + err.message);
    server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM received, closing server');
    server.close(() => process.exit(0));
});

module.exports = app;
