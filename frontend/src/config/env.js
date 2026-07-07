/**
 * Validasi env saat startup. Kalau ada yang missing, server gagal start.
 */
require('dotenv').config();

const required = ['NODE_ENV', 'API_URL', 'SESSION_SECRET'];

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
    // eslint-disable-next-line no-console
    console.error('❌ Missing required env vars:', missing.join(', '));
    process.exit(1);
}

if (process.env.SESSION_SECRET.length < 32) {
    // eslint-disable-next-line no-console
    console.error(
        '❌ SESSION_SECRET terlalu pendek (min 32 char). Generate: openssl rand -hex 64'
    );
    process.exit(1);
}

module.exports = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: parseInt(process.env.PORT, 10) || 3000,
    API_URL: process.env.API_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
    COOKIE: {
        secure: process.env.COOKIE_SECURE === 'true',
        maxAge: (parseInt(process.env.COOKIE_MAX_AGE_DAYS, 10) || 7) * 24 * 60 * 60 * 1000
    },
    DB: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT, 10) || 3306
    },
    MAX_UPLOAD_SIZE_MB: parseInt(process.env.MAX_UPLOAD_SIZE_MB, 10) || 50
};
