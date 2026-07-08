/**
 * Model untuk tabel `payments` (SKRD = Surat Ketetapan Retribusi Daerah / invoice).
 */
const db = require('../config/database');

const SELECT_BASE = `
    SELECT 
        p.id, 
        p.submission_id, 
        p.total_tagihan, 
        p.jumlah_dibayar,
        p.sisa_tagihan,
        p.no_invoice,
        (p.created_at + INTERVAL '30 days') AS due_date,
        p.status_pembayaran, 
        p.bukti_pembayaran_notes, 
        p.skrd_file,
        p.skrd_filename, 
        p.bukti_pembayaran_1, 
        p.bukti_pembayaran_2, 
        p.created_at, 
        p.updated_at
`;

exports.list = async ({ status, limit = 20, offset = 0, search, start_date, end_date } = {}) => {
    const params = [];
    let sql = `
        SELECT p.*, 
               s.nama_proyek, s.no_permohonan, s.user_id,
               u.full_name AS nama_pemohon, 
               u.email AS email_pemohon,
               u.nomor_telepon AS nomor_telepon,
               u.nama_instansi AS nama_instansi,
               u.alamat AS alamat_pemohon
        FROM payments p
        LEFT JOIN submissions s ON s.id = p.submission_id
        LEFT JOIN users u ON u.id = s.user_id
        WHERE 1=1
    `;
    if (status) {
        sql += ' AND p.status_pembayaran = ?';
        params.push(status);
    }
    if (search) {
        sql += ' AND (p.no_invoice LIKE ? OR u.full_name LIKE ? OR u.nama_instansi LIKE ? OR s.no_permohonan LIKE ?)';
        const q = `%${search}%`;
        params.push(q, q, q, q);
    }
    if (start_date) {
        sql += ' AND CAST(p.created_at AS DATE) >= ?';
        params.push(start_date);
    }
    if (end_date) {
        sql += ' AND CAST(p.created_at AS DATE) <= ?';
        params.push(end_date);
    }
    sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));
    const [rows] = await db.query(sql, params);
    return rows;
};

exports.count = async ({ status, search, start_date, end_date } = {}) => {
    const params = [];
    let sql = `SELECT COUNT(*) as total FROM payments p LEFT JOIN submissions s ON s.id = p.submission_id LEFT JOIN users u ON u.id = s.user_id WHERE 1=1`;
    if (status) {
        sql += ' AND p.status_pembayaran = ?';
        params.push(status);
    }
    if (search) {
        sql += ' AND (p.no_invoice LIKE ? OR u.full_name LIKE ? OR u.nama_instansi LIKE ? OR s.no_permohonan LIKE ?)';
        const q = `%${search}%`;
        params.push(q, q, q, q);
    }
    if (start_date) {
        sql += ' AND CAST(p.created_at AS DATE) >= ?';
        params.push(start_date);
    }
    if (end_date) {
        sql += ' AND CAST(p.created_at AS DATE) <= ?';
        params.push(end_date);
    }
    const [rows] = await db.query(sql, params);
    return rows[0].total;
};

exports.findById = async (id) => {
    const [rows] = await db.query(
        `SELECT p.*, 
                (p.created_at + INTERVAL '30 days') AS due_date,
                s.nama_proyek, s.no_permohonan, s.user_id,
                u.full_name AS nama_pemohon, 
                u.email AS email_pemohon,
                u.nomor_telepon AS nomor_telepon,
                u.nama_instansi AS nama_instansi,
                u.alamat AS alamat_pemohon,
                s.catatan_tambahan
         FROM payments p
         LEFT JOIN submissions s ON s.id = p.submission_id
         LEFT JOIN users u ON u.id = s.user_id
         WHERE p.id = ? LIMIT 1`,
        [id]
    );
    if (!rows[0]) return null;

    // Load samples dengan service_name
    const [samples] = await db.query(
        `SELECT ss.*, sv.service_name, c.category_name, t.type_name
         FROM submission_samples ss
         LEFT JOIN services sv ON sv.id = ss.service_id
         LEFT JOIN test_categories c ON c.id = ss.test_category_id
         LEFT JOIN test_types t ON t.id = ss.test_type_id
         WHERE ss.submission_id = ?`,
        [rows[0].submission_id]
    );
    rows[0].samples = samples;
    return rows[0];
};

exports.findBySubmissionId = async (submissionId) => {
    const [rows] = await db.query(
        `${SELECT_BASE}, s.nama_pemohon, s.nama_instansi, s.nama_proyek, s.no_permohonan, s.user_id
         FROM payments p
         LEFT JOIN submissions s ON s.id = p.submission_id
         WHERE p.submission_id = ?`,
        [submissionId]
    );
    return rows;
};

exports.deleteBySubmissionId = async (submissionId) => {
    const [result] = await db.query('DELETE FROM payments WHERE submission_id = ?', [submissionId]);
    return result.affectedRows;
};

exports.stats = async () => {
    // pendingCount (Belum Bayar)
    const [pendingRes] = await db.query("SELECT COUNT(*) as count FROM payments WHERE status_pembayaran = 'Belum Bayar'");
    // waitingVerification (Menunggu Verifikasi)
    const [waitingRes] = await db.query("SELECT COUNT(*) as count FROM payments WHERE status_pembayaran = 'Menunggu Verifikasi'");
    // partialCount (Belum Lunas)
    const [partialRes] = await db.query("SELECT COUNT(*) as count FROM payments WHERE status_pembayaran = 'Belum Lunas'");
    // paidCount (Lunas)
    const [paidRes] = await db.query("SELECT COUNT(*) as count FROM payments WHERE status_pembayaran = 'Lunas'");
    
    // totalReceivable (total_tagihan - sisa_tagihan for Belum Bayar/Belum Lunas/Menunggu Verifikasi)
    const [receivableRes] = await db.query("SELECT SUM(total_tagihan) as total FROM payments WHERE status_pembayaran != 'Lunas' AND status_pembayaran != 'Dibatalkan'");
    
    // monthlyIncome (Lunas for current month)
    const [monthlyRes] = await db.query(`
        SELECT SUM(total_tagihan) as total 
        FROM payments 
        WHERE status_pembayaran = 'Lunas' 
        AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE) 
        AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)
    `);

    const formatRp = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);

    return {
        pendingCount: pendingRes[0].count,
        waitingVerification: waitingRes[0].count,
        partialCount: partialRes[0].count,
        paidCount: paidRes[0].count,
        totalReceivable: formatRp(receivableRes[0].total),
        monthlyIncome: formatRp(monthlyRes[0].total)
    };
};

exports.findBySubmissionId = async (submissionId) => {
    const [rows] = await db.query(
        `${SELECT_BASE} FROM payments p WHERE p.submission_id = ? ORDER BY p.created_at DESC`,
        [submissionId]
    );
    return rows;
};

exports.findByUserId = async (userId, { limit = 20, offset = 0 } = {}) => {
    const [rows] = await db.query(
        `${SELECT_BASE}, s.nama_pemohon, s.nama_instansi, s.nama_proyek, s.no_permohonan,
         (SELECT COUNT(*) FROM submission_samples WHERE submission_id = s.id) AS total_samples
         FROM payments p
         LEFT JOIN submissions s ON s.id = p.submission_id
         WHERE s.user_id = ? ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
        [userId, parseInt(limit, 10), parseInt(offset, 10)]
    );
    return rows;
};

exports.create = async (data) => {
    const [result] = await db.query(
        `INSERT INTO payments 
        (submission_id, total_tagihan, no_invoice, status_pembayaran, created_at)
        VALUES (?, ?, ?, 'Belum Bayar', NOW())`,
        [data.submission_id, data.nominal, data.keterangan || null]
    );
    return result.insertId;
};

exports.updateStatus = async (id, status, catatan = null) => {
    const [result] = await db.query(
        'UPDATE payments SET status_pembayaran = ?, bukti_pembayaran_notes = COALESCE(?, bukti_pembayaran_notes), updated_at = NOW() WHERE id = ?',
        [status, catatan, id]
    );
    return result.affectedRows;
};

exports.update = async (id, data) => {
    const fields = [];
    const values = [];
    
    // Daftar field yang diizinkan
    const allowed = [
        'total_tagihan',
        'no_invoice',
        'status_pembayaran',
        'bukti_pembayaran_notes',
        'skrd_file',
        'skrd_filename',
        'bukti_pembayaran_1',
        'bukti_pembayaran_2',
        'bukti_pembayaran_1_uploaded_at',
        'bukti_pembayaran_2_uploaded_at',
        'jumlah_dibayar',
        'sisa_tagihan',
        'skrd_uploaded_at',
        'skrd_uploaded_by'
    ];

    for (const key of allowed) {
        if (data[key] !== undefined) {
            fields.push(`${key} = ?`);
            values.push(data[key]);
        }
    }

    if (!fields.length) return 0;
    values.push(id);
    const [result] = await db.query(
        `UPDATE payments SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
        values
    );
    return result.affectedRows;
};

exports.cancel = async (id) => {
    const [result] = await db.query(
        "UPDATE payments SET status_pembayaran = 'Dibatalkan', updated_at = NOW() WHERE id = ?",
        [id]
    );
    return result.affectedRows;
};
