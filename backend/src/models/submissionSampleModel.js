// backend/src/models/submissionSampleModel.js
const db = require('../config/database');

/**
 * Simpan satu sample ke tabel submission_samples
 * @param {Object} data - Data sample
 * @returns {Promise<number>} ID sample yang baru
 */
exports.create = async (data) => {
    const [result] = await db.query(
        `INSERT INTO submission_samples 
        (submission_id, jenis_sample, nama_identitas_sample, jumlah_sample_angka, 
         jumlah_sample_satuan, tanggal_pengambilan, kemasan_sample, asal_sample, 
         sample_diambil_oleh, test_type_id, test_category_id, service_id, 
         price_at_time, method_at_time, estimasi_selesai) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            data.submission_id,
            data.jenis_sample || null,
            data.nama_identitas_sample || null,
            data.jumlah_sample_angka || 1,
            data.jumlah_sample_satuan || 'sample',
            data.tanggal_pengambilan || null,
            data.kemasan_sample || null,
            data.asal_sample || null,
            data.sample_diambil_oleh || 'Pelanggan',
            data.test_type_id || null,
            data.test_category_id || null,
            data.service_id || null,
            data.price_at_time || 0,
            data.method_at_time || null,
            data.estimasi_selesai || null
        ]
    );
    return result.insertId;
};

/**
 * Simpan banyak sample sekaligus
 * @param {number} submissionId - ID submission
 * @param {Array} samples - Array data sample
 * @returns {Promise<Array>} Array ID sample yang baru
 */
exports.createMany = async (submissionId, samples) => {
    if (!samples || !Array.isArray(samples) || samples.length === 0) {
        return [];
    }
    
    const results = [];
    for (const sample of samples) {
        const id = await exports.create({
            submission_id: submissionId,
            ...sample
        });
        results.push(id);
    }
    return results;
};

/**
 * Ambil semua sample berdasarkan submission_id
 */
exports.findBySubmissionId = async (submissionId) => {
    const [rows] = await db.query(
        `SELECT ss.*, 
                t.type_name, 
                c.category_name,
                srv.service_name,
                srv.method,
                srv.duration_days
         FROM submission_samples ss
         LEFT JOIN test_types t ON t.id = ss.test_type_id
         LEFT JOIN test_categories c ON c.id = ss.test_category_id
         LEFT JOIN services srv ON srv.id = ss.service_id
         WHERE ss.submission_id = ?
         ORDER BY ss.id ASC`,
        [submissionId]
    );
    return rows;
};

/**
 * Hapus semua sample berdasarkan submission_id
 */
exports.deleteBySubmissionId = async (submissionId) => {
    const [result] = await db.query(
        'DELETE FROM submission_samples WHERE submission_id = ?',
        [submissionId]
    );
    return result.affectedRows;
};

/**
 * Hapus satu sample berdasarkan id
 */
exports.deleteById = async (id) => {
    const [result] = await db.query(
        'DELETE FROM submission_samples WHERE id = ?',
        [id]
    );
    return result.affectedRows;
};
