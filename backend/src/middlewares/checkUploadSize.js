// backend/src/middlewares/checkUploadSize.js
const fs = require('fs');
const settingModel = require('../models/settingModel');

/**
 * Middleware untuk mengecek ukuran file upload.
 * Batas maksimal diambil dari setting 'max_upload_size' di database.
 * Jika tidak ada, default 5MB.
 */
const checkUploadSize = async (req, res, next) => {
    try {
        // 🔥 Ambil batas upload dari database secara langsung
        let maxSizeMB = await settingModel.getByKey('max_upload_size');
        if (!maxSizeMB) {
            maxSizeMB = '5'; // default 5MB
        }
        
        // VERCEL HARD LIMIT
        if (parseInt(maxSizeMB) > 4) maxSizeMB = '4';
        
        const maxSizeBytes = parseInt(maxSizeMB) * 1024 * 1024;

        let exceeded = false;
        let filesToDelete = [];

        // Cek single file upload
        if (req.file) {
            if (req.file.size > maxSizeBytes) {
                exceeded = true;
            }
            filesToDelete.push(req.file.path);
        }

        // Cek multiple file upload
        if (req.files) {
            Object.keys(req.files).forEach(fieldname => {
                req.files[fieldname].forEach(file => {
                    if (file.size > maxSizeBytes) {
                        exceeded = true;
                    }
                    filesToDelete.push(file.path);
                });
            });
        }

        // Jika ada file yang melebihi batas, hapus file yang sudah terupload
        if (exceeded) {
            filesToDelete.forEach(filepath => {
                try {
                    if (fs.existsSync(filepath)) {
                        fs.unlinkSync(filepath);
                        console.log(`🗑️ Deleted oversized file: ${filepath}`);
                    }
                } catch (e) {
                    console.error('❌ Failed to delete file:', filepath, e);
                }
            });

            return res.status(413).json({
                success: false,
                message: `Ukuran file melebihi batas maksimal (${maxSizeMB}MB)`
            });
        }

        next();
    } catch (err) {
        console.error('❌ Error in checkUploadSize:', err);
        // Jika gagal ambil setting, tetap lanjut (biarkan multer menangani)
        next();
    }
};

module.exports = checkUploadSize;