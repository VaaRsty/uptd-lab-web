/**
 * Controller untuk laporan hasil pengujian (test_reports).
 */
const reportModel = require('../models/reportModel');
const submissionModel = require('../models/submissionModel');
const notificationModel = require('../models/notificationModel');
const path = require('path');
const fs = require('fs');
const { success, error } = require('../utils/responseHelper');

exports.list = async (req, res, next) => {
    try {
        const data = await reportModel.list(req.query);
        return success(res, 'Daftar laporan', data);
    } catch (err) { next(err); }
};

exports.uploadSubmissionReport = async (req, res, next) => {
    try {
        if (!req.file) return error(res, 400, 'File laporan belum diupload');
        const submissionId = req.params.id;
        const submission = await submissionModel.findById(submissionId);
        if (!submission) return error(res, 404, 'Submission tidak ditemukan');

        const reportId = await reportModel.create({
            submission_id: submissionId,
            file_path: req.file.filename,
            uploaded_by: req.user.id
        });

        await submissionModel.updateStatus(submissionId, 'Selesai');

        await notificationModel.createUser({
            user_id: submission.user_id,
            title: 'Laporan Hasil Sudah Tersedia',
            message: `Laporan untuk ${submission.nama_proyek} sudah bisa diunduh`,
            type: 'report',
            related_id: reportId
        });

        return success(res, 'Laporan berhasil diupload', { id: reportId, filename: req.file.filename });
    } catch (err) { next(err); }
};

exports.downloadSubmissionReport = async (req, res, next) => {
    try {
        const reports = await reportModel.findBySubmissionId(req.params.id);
        if (!reports.length) return error(res, 404, 'Laporan tidak ditemukan');

        const latest = reports[0];
        const fileUrl = latest.file_path;
        
        // Cek ownership
        const submission = await submissionModel.findById(req.params.id);
        if (
            req.user.role === 'pelanggan' &&
            submission.user_id !== req.user.id
        ) {
            return error(res, 403, 'Akses ditolak');
        }

        // Redirect ke URL publik Supabase Storage
        return res.redirect(fileUrl);
    } catch (err) { next(err); }
};

exports.deleteSubmissionReport = async (req, res, next) => {
    try {
        const reports = await reportModel.findBySubmissionId(req.params.id);
        // Hapus file fisik
        for (const r of reports) {
            const filePath = path.join(__dirname, '../../uploads/laporan', r.file_path);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        const affected = await reportModel.deleteBySubmissionId(req.params.id);
        return success(res, 'Laporan dihapus', { affected });
    } catch (err) { next(err); }
};
