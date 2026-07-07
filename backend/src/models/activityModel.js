/**
 * Model untuk tabel `activities` (audit log).
 */
const db = require('../config/database');
const logger = require('../utils/logger');

exports.log = async ({ user_id, activity_name, ip_address, user_agent }) => {
    try {
        await db.query(
            `INSERT INTO activities (user_id, activity_name, ip_address, user_agent, created_at)
             VALUES (?, ?, ?, ?, NOW())`,
            [user_id, activity_name, ip_address || '-', user_agent || '-']
        );
    } catch (err) {
        logger.warn('Activity log failed: ' + err.message);
    }
};

exports.list = async ({ user_id, limit = 50, offset = 0, type, search } = {}) => {
    const params = [];
    let sql = `SELECT a.*, u.email, u.full_name 
               FROM activities a 
               LEFT JOIN users u ON u.id = a.user_id 
               WHERE 1=1`;

    if (user_id) {
        sql += ' AND a.user_id = ?';
        params.push(user_id);
    }

    // 🔥 FILTER TYPE (abaikan jika 'all' atau kosong)
    if (type && type !== 'all' && type !== '') {
        sql += ' AND LOWER(a.activity_name) LIKE ?';
        params.push(`%${type.toLowerCase()}%`);
        console.log(`🔍 [activityModel] Filtering by type: ${type}`);
    }

    if (search) {
        sql += ' AND (a.activity_name LIKE ? OR u.full_name LIKE ? OR a.ip_address LIKE ?)';
        const q = `%${search}%`;
        params.push(q, q, q);
        console.log(`🔍 [activityModel] Filtering by search: ${search}`);
    }

    sql += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    console.log('📝 [activityModel] SQL:', sql);
    console.log('📝 [activityModel] Params:', params);

    const [rows] = await db.query(sql, params);

    // Hitung total untuk pagination
    let countSql = `SELECT COUNT(*) as total FROM activities a LEFT JOIN users u ON u.id = a.user_id WHERE 1=1`;
    const countParams = [];
    if (user_id) {
        countSql += ' AND a.user_id = ?';
        countParams.push(user_id);
    }
    if (type && type !== 'all' && type !== '') {
        countSql += ' AND LOWER(a.activity_name) LIKE ?';
        countParams.push(`%${type.toLowerCase()}%`);
    }
    if (search) {
        countSql += ' AND (a.activity_name LIKE ? OR u.full_name LIKE ? OR a.ip_address LIKE ?)';
        const q = `%${search}%`;
        countParams.push(q, q, q);
    }
    const [countResult] = await db.query(countSql, countParams);

    console.log(`📊 [activityModel] Found ${rows.length} rows, total ${countResult[0].total}`);

    return {
        data: rows,
        total: countResult[0].total,
        limit: parseInt(limit),
        offset: parseInt(offset)
    };
};
