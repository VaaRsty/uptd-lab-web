/**
 * Controller untuk transaksi user (kombinasi submission + payment).
 */
const paymentModel = require('../models/paymentModel');
const { success, error } = require('../utils/responseHelper');
const { uploadToSupabase } = require('../config/multer');

exports.userList = async (req, res, next) => {
    try {
        const data = await paymentModel.findByUserId(req.user.id, req.query);
        return success(res, 'Riwayat transaksi', data);
    } catch (err) { next(err); }
};

exports.userDetail = async (req, res, next) => {
    try {
        const data = await paymentModel.findById(req.params.id);
        if (!data) return error(res, 404, 'Transaksi tidak ditemukan');
        if (data.user_id !== req.user.id && req.user.role === 'pelanggan') {
            return error(res, 403, 'Akses ditolak');
        }
        return success(res, 'Detail transaksi', data);
    } catch (err) { next(err); }
};

/**
 * Upload bukti pembayaran oleh user
 * POST /api/transactions/user/:id/upload
 */
exports.uploadPaymentProof = async (req, res, next) => {
    try {
        const transactionId = req.params.id;
        const userId = req.user.id;
        const file = req.file;
        const notes = req.body.notes || '';

        // Cek apakah transaksi milik user
        const payment = await paymentModel.findById(transactionId);
        if (!payment) {
            return error(res, 404, 'Transaksi tidak ditemukan');
        }

        // Cek ownership
        if (payment.user_id !== userId) {
            return error(res, 403, 'Akses ditolak');
        }

        // Cek apakah sudah ada bukti 1 atau 2
        const hasProof1 = payment.bukti_pembayaran_1;
        const hasProof2 = payment.bukti_pembayaran_2;

        if (hasProof1 && hasProof2) {
            return error(res, 400, 'Anda sudah mengupload 2 bukti pembayaran');
        }

        if (!file) {
            return error(res, 400, 'File bukti pembayaran wajib diupload');
        }

        // Tentukan kolom yang akan diisi
        let fieldName = 'bukti_pembayaran_1';
        let fieldTime = 'bukti_pembayaran_1_uploaded_at';
        if (hasProof1) {
            fieldName = 'bukti_pembayaran_2';
            fieldTime = 'bukti_pembayaran_2_uploaded_at';
        }

        // Upload ke Supabase
        const ext = require('path').extname(file.originalname);
        const prefix = fieldName === 'bukti_pembayaran_1' ? 'Bukti1' : 'Bukti2';
        const newName = `${prefix}_Transaksi_${transactionId}${ext}`;
        const fileUrl = await uploadToSupabase(file.buffer, newName, file.mimetype, 'uploads', fieldName);

        // Update database
        const updateData = {
            [fieldName]: fileUrl,
            [fieldTime]: new Date(),
            bukti_pembayaran_notes: notes
        };

        await paymentModel.update(transactionId, updateData);

        // Ubah status payment menjadi 'Menunggu Verifikasi' jika sebelumnya 'Belum Bayar'
        if (payment.status_pembayaran === 'Belum Bayar') {
            await paymentModel.updateStatus(transactionId, 'Menunggu Verifikasi');
        }

        // Kirim notifikasi ke admin (opsional)
        // ... kalau ada notifikasi admin

        return success(res, 'Bukti pembayaran berhasil diupload');
    } catch (err) {
        next(err);
    }
};