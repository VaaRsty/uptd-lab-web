const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Konfigurasi storage di memori untuk Vercel / Supabase
const storage = multer.memoryStorage();

// Filter file (Tambahkan pengecekan null/undefined)
const fileFilter = (req, file, cb) => {
    if (!file) {
        return cb(new Error('Tidak ada file yang diunggah'), false);
    }

    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Hanya file gambar (JPG/PNG/GIF) atau PDF yang diperbolehkan!'), false);
    }
};

const { uploadToSupabase } = require('./supabase');

const upload = multer({
    storage: storage,
    limits: { 
        fileSize: 50 * 1024 * 1024
    },
    fileFilter: fileFilter
});

const supabaseUploadWrapper = async (req, res, next) => {
    try {
        if (req.file) {
            const url = await uploadToSupabase(req.file.buffer, req.file.originalname, req.file.mimetype, 'uploads', req.file.fieldname || 'others');
            req.file.filename = url;
        }
        if (req.files) {
            if (Array.isArray(req.files)) {
                for (const file of req.files) {
                    const url = await uploadToSupabase(file.buffer, file.originalname, file.mimetype, 'uploads', file.fieldname || 'others');
                    file.filename = url;
                }
            } else {
                for (const key in req.files) {
                    for (const file of req.files[key]) {
                        const url = await uploadToSupabase(file.buffer, file.originalname, file.mimetype, 'uploads', file.fieldname || 'others');
                        file.filename = url;
                    }
                }
            }
        }
        next();
    } catch (err) {
        console.error('Error in supabaseUploadWrapper:', err);
        return res.status(500).json({ success: false, message: 'Gagal mengunggah file ke Supabase Storage' });
    }
};

const customUpload = {
    single: (fieldName) => [upload.single(fieldName), supabaseUploadWrapper],
    array: (fieldName, maxCount) => [upload.array(fieldName, maxCount), supabaseUploadWrapper],
    fields: (fields) => [upload.fields(fields), supabaseUploadWrapper]
};

module.exports = customUpload;