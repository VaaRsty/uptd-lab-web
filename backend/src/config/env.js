require('dotenv').config();

const required = [
    'NODE_ENV',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET'
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
    // eslint-disable-next-line no-console
    console.error('❌ Missing required env vars:', missing.join(', '));
    process.exit(1);
}

if (process.env.JWT_ACCESS_SECRET.length < 32) {
    // eslint-disable-next-line no-console
    console.error(
        '❌ JWT_ACCESS_SECRET terlalu pendek (min 32 char). Generate dengan: openssl rand -hex 64'
    );
    process.exit(1);
}

module.exports = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: parseInt(process.env.PORT, 10) || 5000,
    CORS_ORIGINS: (process.env.CORS_ORIGINS || '*').split(',').map((s) => s.trim()).filter(Boolean),
    JWT: {
        accessSecret: process.env.JWT_ACCESS_SECRET,
        refreshSecret: process.env.JWT_REFRESH_SECRET,
        accessExpires: process.env.JWT_ACCESS_EXPIRES || '3h',
        refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d'
    },
    BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,
    MAX_UPLOAD_SIZE_MB: parseInt(process.env.MAX_UPLOAD_SIZE_MB, 10) || 5,
    RATE_LIMIT: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
        max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
        loginMax: parseInt(process.env.LOGIN_RATE_LIMIT_MAX, 10) || 5
    },
    MAIL: {
        host: process.env.MAIL_HOST,
        port: parseInt(process.env.MAIL_PORT, 10) || 587,
        user: process.env.MAIL_USER,
        password: process.env.MAIL_PASSWORD
    }
};
