/**
 * Konfigurasi Multer untuk handle upload file di frontend.
 * File disimpan sementara di public/uploads/ lalu di-stream ke backend.
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const env = require('./env');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error('File harus berupa gambar (JPG/PNG/GIF) atau PDF'));
};

module.exports = multer({
    storage,
    limits: { fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024 },
    fileFilter
});
