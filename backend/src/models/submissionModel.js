/**
 * Model untuk tabel `submissions`.
 */
const db = require('../config/database');

// 🔥 SELECT BASE: timpa kolom user dengan data terbaru dari users
const SELECT_BASE = `SELECT 
    s.*,
    u.full_name AS nama_pemohon, 
    u.email AS email_pemohon,
    u.nomor_telepon AS nomor_telepon,
    u.nama_instansi AS nama_instansi,
    u.alamat AS alamat_pemohon,
    (SELECT COUNT(*) FROM submission_samples WHERE submission_id = s.id) AS total_samples,
    (SELECT c.category_name FROM submission_samples ss JOIN test_categories c ON c.id = ss.test_category_id WHERE ss.submission_id = s.id LIMIT 1) AS category_name,
    (SELECT t.type_name FROM submission_samples ss JOIN test_types t ON t.id = ss.test_type_id WHERE ss.submission_id = s.id LIMIT 1) AS type_name,
    (SELECT total_tagihan FROM payments WHERE submission_id = s.id LIMIT 1) AS total_tagihan
`;
const FROM_BASE = `FROM submissions s LEFT JOIN users u ON u.id = s.user_id`;

exports.list = async ({ status, search, user_id, start_date, end_date, test_type, test_category, sort, limit = 20, offset = 0 } = {}) => {
    const params = [];
    let sql = `${SELECT_BASE} ${FROM_BASE} WHERE 1=1`;
    if (status) {
        sql += ' AND s.status = ?';
        params.push(status);
    }
    if (user_id) {
        sql += ' AND s.user_id = ?';
        params.push(user_id);
    }
    if (search) {
        sql += ' AND (s.nama_proyek LIKE ? OR s.no_permohonan LIKE ? OR u.full_name LIKE ? OR u.nama_instansi LIKE ?)';
        const q = `%${search}%`;
        params.push(q, q, q, q);
    }
    if (start_date) {
        sql += ' AND CAST(s.created_at AS DATE) >= ?';
        params.push(start_date);
    }
    if (end_date) {
        sql += ' AND CAST(s.created_at AS DATE) <= ?';
        params.push(end_date);
    }
    if (test_type) {
        sql += ' AND EXISTS (SELECT 1 FROM submission_samples ss2 JOIN test_types tt ON tt.id = ss2.test_type_id WHERE ss2.submission_id = s.id AND tt.type_name LIKE ?)';
        params.push(`%${test_type}%`);
    }
    if (test_category) {
        sql += ' AND EXISTS (SELECT 1 FROM submission_samples ss2 JOIN test_categories c ON c.id = ss2.test_category_id WHERE ss2.submission_id = s.id AND c.category_name LIKE ?)';
        params.push(`%${test_category}%`);
    }
    if (sort === 'oldest') {
        sql += ' ORDER BY s.created_at ASC LIMIT ? OFFSET ?';
    } else {
        sql += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
    }
    params.push(parseInt(limit, 10), parseInt(offset, 10));
    const [rows] = await db.query(sql, params);
    return rows;
};

exports.count = async ({ status, user_id, search, start_date, end_date, test_type, test_category } = {}) => {
    const params = [];
    let sql = `SELECT COUNT(*) AS total FROM submissions s LEFT JOIN users u ON u.id = s.user_id WHERE 1=1`;
    if (status) {
        sql += ' AND s.status = ?';
        params.push(status);
    }
    if (user_id) {
        sql += ' AND s.user_id = ?';
        params.push(user_id);
    }
    if (search) {
        sql += ' AND (s.nama_proyek LIKE ? OR s.no_permohonan LIKE ? OR u.full_name LIKE ? OR u.nama_instansi LIKE ?)';
        const q = `%${search}%`;
        params.push(q, q, q, q);
    }
    if (start_date) {
        sql += ' AND CAST(s.created_at AS DATE) >= ?';
        params.push(start_date);
    }
    if (end_date) {
        sql += ' AND CAST(s.created_at AS DATE) <= ?';
        params.push(end_date);
    }
    if (test_type) {
        sql += ' AND EXISTS (SELECT 1 FROM submission_samples ss2 JOIN test_types tt ON tt.id = ss2.test_type_id WHERE ss2.submission_id = s.id AND tt.type_name LIKE ?)';
        params.push(`%${test_type}%`);
    }
    if (test_category) {
        sql += ' AND EXISTS (SELECT 1 FROM submission_samples ss2 JOIN test_categories c ON c.id = ss2.test_category_id WHERE ss2.submission_id = s.id AND c.category_name LIKE ?)';
        params.push(`%${test_category}%`);
    }
    const [rows] = await db.query(sql, params);
    return rows[0].total;
};

exports.findById = async (id) => {
    const [rows] = await db.query(
        `${SELECT_BASE} ${FROM_BASE} WHERE s.id = ? LIMIT 1`,
        [id]
    );
    return rows[0] || null;
};

exports.findByUserId = async (userId, { limit = 20, offset = 0, status } = {}) => {
    const params = [userId];
    let sql = `
        SELECT s.*, 
               (SELECT COUNT(*) FROM submission_samples WHERE submission_id = s.id) as total_samples
        FROM submissions s 
        WHERE s.user_id = ?
    `;
    if (status) {
        sql += ' AND s.status = ?';
        params.push(status);
    }
    sql += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));
    const [rows] = await db.query(sql, params);
    return rows;
};

// ====== CREATE, UPDATE, CANCEL, DLL ======
exports.create = async (data) => {
    const [result] = await db.query(
        `INSERT INTO submissions 
        (user_id, no_permohonan, nama_pemohon, nama_instansi, alamat_pemohon, 
         nomor_telepon, email_pemohon, nama_proyek, lokasi_proyek, 
         file_surat_permohonan, file_ktp, dokumen_tambahan, catatan_tambahan, 
         status, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Menunggu Verifikasi', NOW())`,
        [
            data.user_id,
            data.no_permohonan || null,
            data.nama_pemohon,
            data.nama_instansi || null,
            data.alamat_pemohon || null,
            data.nomor_telepon || null,
            data.email_pemohon || null,
            data.nama_proyek,
            data.lokasi_proyek || null,
            data.file_surat_permohonan || null,
            data.file_ktp || null,
            data.dokumen_tambahan || null,
            data.catatan_tambahan || null
        ]
    );
    return result.insertId;
};

exports.update = async (id, data) => {
    const allowed = [
        'no_permohonan',
        'nama_pemohon',
        'nama_instansi',
        'alamat_pemohon',
        'nomor_telepon',
        'email_pemohon',
        'nama_proyek',
        'lokasi_proyek',
        'catatan_tambahan',
        'catatan_admin',
        'jadwal_sampling',
        'status',
        'file_surat_permohonan',
        'file_ktp',
        'dokumen_tambahan'
    ];
    const fields = [];
    const values = [];
    for (const key of allowed) {
        if (data[key] !== undefined) {
            fields.push(`${key} = ?`);
            values.push(data[key]);
        }
    }
    if (!fields.length) return 0;
    values.push(id);
    const [result] = await db.query(
        `UPDATE submissions SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
        values
    );
    return result.affectedRows;
};

exports.updateStatus = async (id, status, catatan_admin = null) => {
    const [result] = await db.query(
        'UPDATE submissions SET status = ?, catatan_admin = COALESCE(?, catatan_admin), updated_at = NOW() WHERE id = ?',
        [status, catatan_admin, id]
    );
    return result.affectedRows;
};

exports.cancel = async (id) => {
    const [result] = await db.query(
        "UPDATE submissions SET status = 'Dibatalkan', updated_at = NOW() WHERE id = ?",
        [id]
    );
    return result.affectedRows;
};

exports.countByStatus = async () => {
    const [rows] = await db.query(
        'SELECT status, COUNT(*) AS total FROM submissions GROUP BY status'
    );
    return rows;
};

exports.countByStatusUser = async (userId) => {
    const [rows] = await db.query(
        'SELECT status, COUNT(*) AS total FROM submissions WHERE user_id = ? GROUP BY status',
        [userId]
    );
    return rows;
};

exports.userOwnsFile = async (userId, filename) => {
    const [rows] = await db.query(
        `SELECT id FROM submissions 
         WHERE user_id = ? 
         AND (file_surat_permohonan = ? OR file_ktp = ? OR dokumen_tambahan LIKE ?)
         LIMIT 1`,
        [userId, filename, filename, `%${filename}%`]
    );
    return rows.length > 0;
};

exports.createSamples = async (submissionId, samplesData) => {
    if (!samplesData || !Array.isArray(samplesData) || samplesData.length === 0) {
        console.log('⚠️ Tidak ada data sample untuk disimpan');
        return [];
    }
    const results = [];
    for (const sample of samplesData) {
        try {
            const [result] = await db.query(
                `INSERT INTO submission_samples 
                (submission_id, jenis_sample, nama_identitas_sample, jumlah_sample_angka, 
                 jumlah_sample_satuan, tanggal_pengambilan, kemasan_sample, asal_sample, 
                 sample_diambil_oleh, test_type_id, test_category_id, service_id, 
                 price_at_time, method_at_time, estimasi_selesai) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    submissionId,
                    sample.jenis_sample || null,
                    sample.nama_sampel || null,
                    sample.jumlah_sample_angka || 1,
                    sample.jumlah_sample_satuan || 'sample',
                    sample.tanggal_sampel || null,
                    sample.kemasan_sample || null,
                    sample.asal_sample || null,
                    sample.diambil_oleh || 'Pelanggan',
                    sample.test_type_id || null,
                    sample.test_category_id || null,
                    sample.service_id || null,
                    sample.price_at_time || 0,
                    sample.method_at_time || null,
                    sample.estimasi_selesai || null
                ]
            );
            results.push(result.insertId);
        } catch (err) {
            console.error('❌ Gagal menyimpan sample:', err.message);
            throw err;
        }
    }
    return results;
};
