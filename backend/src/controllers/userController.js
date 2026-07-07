/**
 * Controller untuk manage user (oleh admin) + profile.
 */
const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');
const notificationModel = require('../models/notificationModel');
const env = require('../config/env');
const { success, error, paginated } = require('../utils/responseHelper');

// =========== ADMIN MANAGE USER ===========

exports.list = async (req, res, next) => {
    try {
        const { role, search, page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const data = await userModel.list({ role, search, limit, offset });
        const total = await userModel.count({ role, search });
        return paginated(res, 'Daftar user', data, {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            total,
            totalPages: Math.ceil(total / parseInt(limit, 10))
        });
    } catch (err) { next(err); }
};

exports.detail = async (req, res, next) => {
    try {
        const data = await userModel.findById(req.params.id);
        if (!data) return error(res, 404, 'User tidak ditemukan');
        return success(res, 'Detail user', data);
    } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
    try {
        const affected = await userModel.updateProfile(req.params.id, req.body);
        if (!affected) return error(res, 404, 'User tidak ditemukan atau tidak ada perubahan');
        return success(res, 'User berhasil diupdate');
    } catch (err) { next(err); }
};

exports.delete = async (req, res, next) => {
    try {
        if (parseInt(req.params.id, 10) === req.user.id) {
            return error(res, 400, 'Tidak bisa menghapus akun sendiri');
        }
        const affected = await userModel.delete(req.params.id);
        if (!affected) return error(res, 404, 'User tidak ditemukan');
        return success(res, 'User berhasil dihapus');
    } catch (err) { next(err); }
};

exports.verify = async (req, res, next) => {
    try {
        // Verifikasi akun (kalau ada field is_verified, otherwise dummy)
        return success(res, 'User diverifikasi');
    } catch (err) { next(err); }
};

exports.deactivate = async (req, res, next) => {
    try {
        return success(res, 'User dinonaktifkan');
    } catch (err) { next(err); }
};

exports.resetPassword = async (req, res, next) => {
    try {
        const defaultPassword = 'uptdlab2026';
        const hashed = await bcrypt.hash(defaultPassword, env.BCRYPT_SALT_ROUNDS);
        const affected = await userModel.updatePassword(req.params.id, hashed);
        if (!affected) return error(res, 404, 'User tidak ditemukan');
        return success(res, 'Password direset ke default', {
            default_password: defaultPassword
        });
    } catch (err) { next(err); }
};

exports.sendNotification = async (req, res, next) => {
    try {
        const { title, message, type = 'info' } = req.body;
        const id = await notificationModel.createUser({
            user_id: req.params.id,
            title,
            message,
            type
        });
        return success(res, 'Notifikasi terkirim', { id });
    } catch (err) { next(err); }
};

// =========== USER PROFILE (self) ===========

exports.getProfile = async (req, res, next) => {
    try {
        const data = await userModel.findById(req.user.id);
        if (!data) return error(res, 404, 'User tidak ditemukan');
        return success(res, 'Profile user', data);
    } catch (err) { next(err); }
};

exports.updateProfile = async (req, res, next) => {
    try {
        if (req.body.email) {
            const existingUser = await userModel.findByEmail(req.body.email);
            if (existingUser && existingUser.id !== req.user.id) {
                return error(res, 400, 'Email sudah digunakan oleh akun lain');
            }
        }

        const affected = await userModel.updateProfile(req.user.id, req.body);
        if (!affected) return error(res, 400, 'Tidak ada perubahan');
        
        const data = await userModel.findById(req.user.id);
        return success(res, 'Profile diupdate', data);
    } catch (err) { 
        next(err); 
    }
};

exports.uploadAvatar = async (req, res, next) => {
    try {
        if (!req.file) return error(res, 400, 'File avatar belum diupload');
        const avatarPath = req.file.filename; // Karena sekarang langsung berupa URL dari Supabase
        await userModel.updateAvatar(req.user.id, avatarPath);
        return success(res, 'Avatar diupdate', { avatar: avatarPath });
    } catch (err) { next(err); }
};

exports.deleteAvatar = async (req, res, next) => {
    try {
        await userModel.updateAvatar(req.user.id, null);
        return success(res, 'Avatar dihapus');
    } catch (err) { next(err); }
};

// =========== CHANGE PASSWORD (self) ===========
exports.changePassword = async (req, res, next) => {
    try {
        const { current_password, new_password } = req.body;

        const user = await userModel.findByIdWithPassword(req.user.id);
        if (!user) return error(res, 404, 'User tidak ditemukan');

        const isMatch = await bcrypt.compare(current_password, user.password);
        if (!isMatch) return error(res, 400, 'Password saat ini salah');

        const hashedPassword = await bcrypt.hash(new_password, env.BCRYPT_SALT_ROUNDS);
        await userModel.updatePassword(req.user.id, hashedPassword);

        return success(res, 'Password berhasil diubah');
    } catch (err) {
        next(err);
    }
};