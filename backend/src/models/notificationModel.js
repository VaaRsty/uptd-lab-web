/**
 * Model untuk tabel `notifications` (admin) & `user_notifications` (per-user).
 * Schema DB:
 *   notifications: id, user_id, title, message, href, is_read, created_at
 *   user_notifications: id, user_id, title, message, type, is_read, created_at
 */
const db = require('../config/database');
// const socketUtil = require('../utils/socket'); // Dihapus untuk Vercel

// =========== ADMIN NOTIFICATIONS (tabel: notifications) ===========
// Catatan: tabel notifications tidak punya kolom type atau related_id

exports.listAdmin = async ({ limit = 50, offset = 0 } = {}) => {
    const [rows] = await db.query(
        'SELECT * FROM notifications ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [parseInt(limit, 10), parseInt(offset, 10)]
    );
    return rows;
};

exports.createAdmin = async ({ user_id = null, title, message, href = '#' }) => {
    const [result] = await db.query(
        `INSERT INTO notifications (user_id, title, message, href, is_read, created_at)
         VALUES (?, ?, ?, ?, 0, NOW())`,
        [user_id, title, message, href]
    );
    
    // Emit ke Socket.IO room admin (Dihapus karena Vercel)
    /*
    try {
        const io = socketUtil.getIO();
        if (io) {
            io.to('admin_room').emit('new_notification', {
                id: result.insertId,
                title,
                message,
                href,
                created_at: new Date()
            });
        }
    } catch (e) {
        console.warn('Socket emit error for admin notification:', e);
    }
    */
    
    return result.insertId;
};

exports.markAllAdminRead = async () => {
    const [result] = await db.query('UPDATE notifications SET is_read = 1 WHERE is_read = 0');
    return result.affectedRows;
};

exports.markAdminRead = async (id) => {
    const [result] = await db.query(
        'UPDATE notifications SET is_read = 1 WHERE id = ?',
        [id]
    );
    return result.affectedRows;
};

// =========== USER NOTIFICATIONS (tabel: user_notifications) ===========

exports.listUser = async (userId, { limit = 50, offset = 0 } = {}) => {
    const [rows] = await db.query(
        `SELECT * FROM user_notifications 
         WHERE user_id = ? 
         ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [userId, parseInt(limit, 10), parseInt(offset, 10)]
    );
    return rows;
};

exports.countUnreadUser = async (userId) => {
    const [rows] = await db.query(
        'SELECT COUNT(*) AS total FROM user_notifications WHERE user_id = ? AND is_read = 0',
        [userId]
    );
    return rows[0].total;
};

exports.createUser = async ({ user_id, title, message, type = 'info' }) => {
    const [result] = await db.query(
        `INSERT INTO user_notifications (user_id, title, message, type, is_read, created_at)
         VALUES (?, ?, ?, ?, 0, NOW())`,
        [user_id, title, message, type]
    );
    
    // Emit ke Socket.IO room spesifik user (Dihapus karena Vercel)
    /*
    try {
        const io = socketUtil.getIO();
        if (io) {
            io.to(`user_${user_id}`).emit('new_notification', {
                id: result.insertId,
                title,
                message,
                type,
                created_at: new Date()
            });
        }
    } catch (e) {
        console.warn('Socket emit error for user notification:', e);
    }
    */
    
    return result.insertId;
};

exports.markUserRead = async (id, userId) => {
    const [result] = await db.query(
        'UPDATE user_notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
        [id, userId]
    );
    return result.affectedRows;
};

exports.markAllUserRead = async (userId) => {
    const [result] = await db.query(
        'UPDATE user_notifications SET is_read = 1 WHERE user_id = ?',
        [userId]
    );
    return result.affectedRows;
};
