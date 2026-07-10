// backend/src/middlewares/checkUploadSize.js
const fs = require('fs');
const settingModel = require('../models/settingModel');

/**
 * Middleware untuk mengecek ukuran file upload.
 * Batas maksimal diambil dari setting 'max_upload_size' di database.
 * Jika tidak ada, default 5MB.
 */
const checkUploadSize = async (req, res, next) => {
    // Nilai default hardcoded — tidak bergantung database
    let maxSizeMB = 4;
    
    try {
        // Coba ambil dari database, jika gagal/kosong pakai default
        const dbValue = await Promise.race([
            settingModel.getByKey('max_upload_size'),
            new Promise(resolve => setTimeout(() => resolve(null), 2000)) // timeout 2 detik
        ]);
        if (dbValue && !isNaN(parseInt(dbValue))) {
            maxSizeMB = Math.min(parseInt(dbValue), 4); // max 4MB
        }
    } catch (_) {
        // Ignore error — gunakan default 4MB
    }
    
    const maxSizeBytes = maxSizeMB * 1024 * 1024;


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
};

module.exports = checkUploadSize;