require('dotenv').config();
const mysql = require('mysql2');

// Buat pool koneksi dengan optimasi
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'uptd_lab',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 20, // Tingkatkan dari 10 ke 20
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Matikan ONLY_FULL_GROUP_BY untuk setiap koneksi
pool.on('connection', (connection) => {
    console.log('🔧 Setting sql_mode...');
    connection.query("SET SESSION sql_mode = ''");
});

// Promise wrapper
const promisePool = pool.promise();

module.exports = promisePool;