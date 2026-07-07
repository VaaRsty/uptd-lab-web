/**
 * Model untuk tabel `users`.
 * Kolom: id, email, password, role, full_name, employee_id,
 *        nama_instansi, alamat, nomor_telepon, avatar,
 *        created_at, updated_at, notif_email, notif_wa
 */
const db = require('../config/database');

exports.findByEmail = async (email) => {
    const [rows] = await db.query(
        'SELECT * FROM users WHERE email = ? LIMIT 1',
        [email]
    );
    return rows[0] || null;
};

exports.findById = async (id) => {
    const [rows] = await db.query(
        `SELECT id, email, role, full_name, employee_id, nama_instansi,
                alamat, nomor_telepon, avatar, notif_email, notif_wa,
                created_at, updated_at,
                (SELECT COUNT(*) FROM submissions WHERE user_id = users.id) AS total_transactions,
                (SELECT COUNT(*) FROM submissions WHERE user_id = users.id AND status LIKE '%Selesai%') AS completed_transactions,
                (SELECT COUNT(*) FROM submissions WHERE user_id = users.id AND status NOT LIKE '%Selesai%') AS pending_transactions,
                (SELECT SUM(total_tagihan) FROM payments WHERE submission_id IN (SELECT id FROM submissions WHERE user_id = users.id) AND status_pembayaran = 'Lunas') AS total_payments
         FROM users WHERE id = ? LIMIT 1`,
        [id]
    );
    return rows[0] || null;
};

exports.findByIdWithPassword = async (id) => {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
};

exports.create = async ({
    email,
    password,
    full_name,
    nama_instansi,
    alamat,
    nomor_telepon,
    role = 'pelanggan'
}) => {
    const [result] = await db.query(
        `INSERT INTO users 
        (email, password, full_name, nama_instansi, alamat, nomor_telepon, role, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [email, password, full_name, nama_instansi, alamat, nomor_telepon, role]
    );
    return result.insertId;
};

exports.updatePassword = async (userId, hashedPassword) => {
    const [result] = await db.query(
        'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
        [hashedPassword, userId]
    );
    return result.affectedRows;
};

exports.updateProfile = async (userId, data) => {
    const allowed = [
        'full_name',
        'email',
        'nama_instansi',
        'alamat',
        'nomor_telepon',
        'avatar',
        'notif_email',
        'notif_wa',
        'employee_id',
        'role'
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
    values.push(userId);
    const [result] = await db.query(
        `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
        values
    );
    return result.affectedRows;
};

exports.updateAvatar = async (userId, avatarPath) => {
    const [result] = await db.query(
        'UPDATE users SET avatar = ?, updated_at = NOW() WHERE id = ?',
        [avatarPath, userId]
    );
    return result.affectedRows;
};

exports.list = async ({ role, search, limit = 50, offset = 0 } = {}) => {
    const params = [];
    let sql = `SELECT id, email, role, full_name, employee_id, nama_instansi,
                      nomor_telepon, avatar, created_at,
                      (SELECT COUNT(*) FROM submissions WHERE user_id = users.id) AS total_transactions
               FROM users WHERE 1=1`;
    if (role) {
        sql += ' AND role = ?';
        params.push(role);
    }
    if (search) {
        sql += ' AND (email LIKE ? OR full_name LIKE ? OR nama_instansi LIKE ?)';
        const q = `%${search}%`;
        params.push(q, q, q);
    }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));
    const [rows] = await db.query(sql, params);
    return rows;
};

exports.count = async ({ role, search } = {}) => {
    const params = [];
    let sql = 'SELECT COUNT(*) AS total FROM users WHERE 1=1';
    if (role) {
        sql += ' AND role = ?';
        params.push(role);
    }
    if (search) {
        sql += ' AND (email LIKE ? OR full_name LIKE ? OR nama_instansi LIKE ?)';
        const q = `%${search}%`;
        params.push(q, q, q);
    }
    const [rows] = await db.query(sql, params);
    return rows[0].total;
};

exports.delete = async (id) => {
    const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows;
};
