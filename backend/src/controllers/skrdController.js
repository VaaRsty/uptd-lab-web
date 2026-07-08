/**
 * Controller untuk SKRD (Surat Ketetapan Retribusi Daerah / invoice).
 */
const paymentModel = require('../models/paymentModel');
const submissionModel = require('../models/submissionModel');
const notificationModel = require('../models/notificationModel');
const path = require('path');
const fs = require('fs');
const { success, error } = require('../utils/responseHelper');
const { uploadToSupabase } = require('../config/multer');

exports.list = async (req, res, next) => {
    try {
        const { status, limit, page = 1, search, start_date, end_date } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit || 20, 10);
        
        const [data, stats, total] = await Promise.all([
            paymentModel.list({ status, limit, offset, search, start_date, end_date }),
            paymentModel.stats(),
            paymentModel.count({ status, search, start_date, end_date })
        ]);

        return success(res, 'Daftar SKRD', { invoices: data, stats, total });
    } catch (err) {
        next(err);
    }
};

exports.detail = async (req, res, next) => {
    try {
        const data = await paymentModel.findById(req.params.id);
        if (!data) return error(res, 404, 'SKRD tidak ditemukan');
        return success(res, 'Detail SKRD', data);
    } catch (err) {
        next(err);
    }
};

exports.create = async (req, res, next) => {
    try {
        const id = await paymentModel.create(req.body);
        const submission = await submissionModel.findById(req.body.submission_id);
        if (submission) {
            await submissionModel.updateStatus(submission.id, 'Belum Bayar');
            await notificationModel.createUser({
                user_id: submission.user_id,
                title: 'SKRD Telah Terbit',
                message: `Tagihan untuk ${submission.nama_proyek} sudah terbit. Silakan lakukan pembayaran.`,
                type: 'skrd'
            });
        }
        return success(res, 'SKRD berhasil dibuat', { id }, 201);
    } catch (err) {
        next(err);
    }
};

exports.updateStatus = async (req, res, next) => {
    try {
        const { status, catatan } = req.body;
        const affected = await paymentModel.updateStatus(req.params.id, status, catatan);
        if (!affected) return error(res, 404, 'SKRD tidak ditemukan');
        return success(res, 'Status SKRD diupdate');
    } catch (err) {
        next(err);
    }
};

exports.uploadFile = async (req, res, next) => {
    try {
        // 1. Validasi file
        if (!req.file) {
            return error(res, 400, 'File SKRD belum diupload');
        }

        // 2. Validasi ID
        const paymentId = parseInt(req.params.id);
        if (isNaN(paymentId) || paymentId <= 0) {
            return error(res, 400, 'ID SKRD tidak valid');
        }

        // 3. Cek apakah SKRD (payment) ada
        const payment = await paymentModel.findById(paymentId);
        if (!payment) {
            return error(res, 404, 'SKRD tidak ditemukan');
        }

        console.log(`📄 Upload SKRD untuk payment ID: ${paymentId}, file: ${req.file.filename}`);

        // 4. Update data SKRD
        const affected = await paymentModel.update(paymentId, {
            skrd_file: req.file.filename,
            skrd_filename: req.file.originalname,
            skrd_uploaded_at: new Date(),
            skrd_uploaded_by: req.user.id
        });

        if (!affected) {
            return error(res, 500, 'Gagal menyimpan data SKRD');
        }

        return success(res, 'File SKRD berhasil diupload', {
            filename: req.file.filename,
            originalname: req.file.originalname
        });

    } catch (err) {
        console.error('❌ Error upload SKRD:', err);
        next(err);
    }
};

exports.downloadFile = async (req, res, next) => {
    try {
        const payment = await paymentModel.findById(req.params.id);
        if (!payment || !payment.file_skrd) {
            return error(res, 404, 'File SKRD tidak ditemukan');
        }
        const fileUrl = payment.file_skrd;
        return res.redirect(fileUrl);
    } catch (err) {
        next(err);
    }
};

exports.uploadPaymentProof = async (req, res, next) => {
    try {
        if (!req.file) return error(res, 400, 'File bukti bayar belum diupload');
        const file = req.file;
        const ext = require('path').extname(file.originalname);
        const newName = `Bukti_SKRD_${req.params.id}${ext}`;
        const fileUrl = await uploadToSupabase(file.buffer, newName, file.mimetype, 'uploads', 'payment_proof');

        const affected = await paymentModel.update(req.params.id, {
            file_payment_proof: fileUrl,
            status: 'Menunggu Verifikasi Pembayaran'
        });
        if (!affected) return error(res, 404, 'SKRD tidak ditemukan');

        const payment = await paymentModel.findById(req.params.id);
        await notificationModel.createAdmin({
            title: 'Bukti Pembayaran Diupload',
            message: `${payment.nama_pemohon} mengupload bukti pembayaran`,
            href: `/admin/skrd/${payment.id}`
        });

        return success(res, 'Bukti pembayaran diupload, menunggu verifikasi');
    } catch (err) {
        next(err);
    }
};

exports.verifyPayment = async (req, res, next) => {
    try {
        const paymentId = req.params.id;
        const { paid_amount, paid_date, notes } = req.body;

        // Ambil data payment saat ini
        const payment = await paymentModel.findById(paymentId);
        if (!payment) return error(res, 404, 'Payment tidak ditemukan');

        let totalTagihan = parseFloat(payment.total_tagihan) || 0;
        const sudahDibayar = parseFloat(payment.jumlah_dibayar) || 0;
        const newPaidAmount = sudahDibayar + parseFloat(paid_amount);
        
        let sisaTagihan = totalTagihan - newPaidAmount;
        
        // Tentukan status baru
        let newStatus = 'Belum Lunas';
        if (sisaTagihan <= 0) {
            newStatus = 'Lunas';
            // Jika sisaTagihan negatif (artinya dia membayar lebih dari total_tagihan karena denda)
            // kita update total_tagihan menjadi newPaidAmount agar balance-nya 0.
            if (sisaTagihan < 0) {
                totalTagihan = newPaidAmount;
                sisaTagihan = 0;
            }
        } else {
            newStatus = 'Belum Lunas';
        }

        // Update payment
        await paymentModel.update(paymentId, {
            total_tagihan: totalTagihan,
            jumlah_dibayar: newPaidAmount,
            sisa_tagihan: sisaTagihan,
            status_pembayaran: newStatus,
            bukti_pembayaran_notes: notes ? `${payment.bukti_pembayaran_notes || ''}\n[${new Date().toLocaleDateString()}] Verifikasi: Rp ${paid_amount} - ${notes}` : payment.bukti_pembayaran_notes,
            updated_at: new Date()
        });

        return success(res, 'Pembayaran berhasil diverifikasi', { status: newStatus, sisa: sisaTagihan });
    } catch (err) {
        next(err);
    }
};

exports.rejectProof = async (req, res, next) => {
    try {
        const { catatan } = req.body;
        const payment = await paymentModel.findById(req.params.id);
        if (!payment) return error(res, 404, 'SKRD tidak ditemukan');

        await paymentModel.updateStatus(req.params.id, 'Belum Bayar', catatan);

        await notificationModel.createUser({
            user_id: payment.user_id,
            title: 'Bukti Pembayaran Ditolak',
            message: `Bukti pembayaran ditolak: ${catatan || 'Mohon upload ulang'}`,
            type: 'payment_rejected'
        });

        return success(res, 'Bukti pembayaran ditolak');
    } catch (err) {
        next(err);
    }
};

exports.sendReminder = async (req, res, next) => {
    try {
        const payment = await paymentModel.findById(req.params.id);
        if (!payment) return error(res, 404, 'SKRD tidak ditemukan');

        await notificationModel.createUser({
            user_id: payment.user_id,
            title: 'Pengingat Pembayaran',
            message: `Mohon segera selesaikan pembayaran untuk ${payment.nama_proyek}`,
            type: 'payment_reminder'
        });

        return success(res, 'Reminder terkirim');
    } catch (err) {
        next(err);
    }
};

exports.cancel = async (req, res, next) => {
    try {
        const affected = await paymentModel.cancel(req.params.id);
        if (!affected) return error(res, 404, 'SKRD tidak ditemukan');
        return success(res, 'SKRD dibatalkan');
    } catch (err) {
        next(err);
    }
};
