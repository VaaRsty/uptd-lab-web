/**
 * Model untuk tabel `settings` (key-value config) & `jadwal_sibuk`.
 */
const db = require('../config/database');

// =========== SETTINGS (key-value) ===========

exports.getAll = async () => {
    const [rows] = await db.query('SELECT setting_key, setting_value FROM settings');
    const result = {};
    rows.forEach((r) => (result[r.setting_key] = r.setting_value));
    return result;
};

exports.getByKey = async (key) => {
    const [rows] = await db.query(
        'SELECT setting_value FROM settings WHERE setting_key = ? LIMIT 1',
        [key]
    );
    return rows[0]?.setting_value ?? null;
};

exports.set = async (key, value) => {
    // UPSERT (insert or update)
    const [result] = await db.query(
        `INSERT INTO settings (setting_key, setting_value, created_at, updated_at)
         VALUES (?, ?, NOW(), NOW())
         ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
        [key, value]
    );
    return result.affectedRows;
};

exports.setBulk = async (settings) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        for (const [key, value] of Object.entries(settings)) {
            await conn.query(
                `INSERT INTO settings (setting_key, setting_value, created_at, updated_at)
                 VALUES (?, ?, NOW(), NOW())
                 ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
                [key, typeof value === 'object' ? JSON.stringify(value) : String(value)]
            );
        }
        await conn.commit();
        return true;
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

// =========== JADWAL SIBUK ===========

exports.listBusyPeriods = async () => {
    const [rows] = await db.query(
        'SELECT id, tanggal_mulai as start_date, tanggal_selesai as end_date, keterangan as reason, created_at FROM jadwal_sibuk ORDER BY tanggal_mulai ASC'
    );
    return rows;
};

exports.findBusyPeriodById = async (id) => {
    const [rows] = await db.query(
        'SELECT id, tanggal_mulai as start_date, tanggal_selesai as end_date, keterangan as reason, created_at FROM jadwal_sibuk WHERE id = ? LIMIT 1',
        [id]
    );
    return rows[0] || null;
};

exports.findActiveBusyPeriods = async () => {
    const [rows] = await db.query(
        `SELECT id, tanggal_mulai as start_date, tanggal_selesai as end_date, keterangan as reason, created_at FROM jadwal_sibuk 
         WHERE CURRENT_DATE BETWEEN tanggal_mulai AND tanggal_selesai
         ORDER BY tanggal_mulai ASC`
    );
    return rows;
};

exports.addBusyPeriod = async ({ start_date, end_date, reason }) => {
    const [result] = await db.query(
        `INSERT INTO jadwal_sibuk (tanggal_mulai, tanggal_selesai, keterangan, created_at)
         VALUES (?, ?, ?, NOW())`,
        [start_date, end_date, reason || null]
    );
    return result.insertId;
};

exports.updateBusyPeriod = async (id, data) => {
    const allowedMap = {
        'start_date': 'tanggal_mulai',
        'end_date': 'tanggal_selesai',
        'reason': 'keterangan'
    };
    const fields = [];
    const values = [];
    for (const [key, dbCol] of Object.entries(allowedMap)) {
        if (data[key] !== undefined) {
            fields.push(`${dbCol} = ?`);
            values.push(data[key]);
        }
    }
    if (!fields.length) return 0;
    values.push(id);
    const [result] = await db.query(
        `UPDATE jadwal_sibuk SET ${fields.join(', ')} WHERE id = ?`,
        values
    );
    return result.affectedRows;
};

exports.deleteBusyPeriod = async (id) => {
    const [result] = await db.query('DELETE FROM jadwal_sibuk WHERE id = ?', [id]);
    return result.affectedRows;
};
