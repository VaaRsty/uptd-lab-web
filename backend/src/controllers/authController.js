const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../config/database');
const tokenService = require('../services/tokenService');
const nodemailer = require('nodemailer');

const authController = {
    // ── LOGIN (user/pelanggan) ────────────────────────────────────────────
    login: async (req, res) => {
        try {
            const { email, password } = req.body;

            const [users] = await db.query(
                'SELECT * FROM users WHERE email = ? AND role = ?',
                [email, 'pelanggan']
            );

            if (users.length === 0) {
                return res.status(401).json({ success: false, message: 'Email atau password salah' });
            }

            const user = users[0];
            const valid = await bcrypt.compare(password, user.password);
            if (!valid) {
                return res.status(401).json({ success: false, message: 'Email atau password salah' });
            }

            const payload = { id: user.id, email: user.email, full_name: user.full_name, role: user.role };
            const token        = tokenService.signAccess(payload);
            const refreshToken = tokenService.signRefresh({ id: user.id });

            // Catat aktivitas (opsional, jika tabel ada)
            db.query(
                'INSERT INTO activities (user_id, activity_name, ip_address, user_agent) VALUES (?, ?, ?, ?)',
                [user.id, 'Login ke sistem', req.ip, req.headers['user-agent']]
            ).catch(() => {});

            res.json({
                success: true,
                message: 'Login berhasil',
                data: { token, refreshToken, user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role, avatar: user.avatar } }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
        }
    },

    // ── ADMIN LOGIN ────────────────────────────────────────────────────────
    adminLogin: async (req, res) => {
        try {
            const { email, password } = req.body;

            const [users] = await db.query(
                'SELECT * FROM users WHERE email = ? AND role = ?',
                [email, 'admin']
            );

            if (users.length === 0) {
                return res.status(401).json({ success: false, message: 'Email atau password salah' });
            }

            const adminUser = users[0];
            const valid = await bcrypt.compare(password, adminUser.password);
            if (!valid) {
                return res.status(401).json({ success: false, message: 'Email atau password salah' });
            }

            const payload = { id: adminUser.id, email: adminUser.email, full_name: adminUser.full_name, role: adminUser.role };
            const token        = tokenService.signAccess(payload);
            const refreshToken = tokenService.signRefresh({ id: adminUser.id });

            // Catat aktivitas
            db.query(
                'INSERT INTO activities (user_id, activity_name, ip_address, user_agent) VALUES (?, ?, ?, ?)',
                [adminUser.id, 'Admin login ke sistem', req.ip, req.headers['user-agent']]
            ).catch(() => {});

            return res.json({
                success: true,
                message: 'Login berhasil',
                data: { token, refreshToken, user: { id: adminUser.id, full_name: adminUser.full_name, email: adminUser.email, role: adminUser.role, avatar: adminUser.avatar } }
            });

        } catch (error) {
            console.error('Admin Login Error:', error);
            res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
        }
    },

    // ── REGISTER ──────────────────────────────────────────────────────────
    register: async (req, res) => {
        try {
            const { full_name, email, password, nama_instansi, alamat, nomor_telepon } = req.body;

            const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
            if (existing.length > 0) {
                return res.status(400).json({ success: false, message: 'Email sudah terdaftar' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const [result] = await db.query(
                'INSERT INTO users (full_name, email, password, nama_instansi, alamat, nomor_telepon, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
                [full_name, email, hashedPassword, nama_instansi || null, alamat || null, nomor_telepon || null, 'pelanggan']
            );

            const payload = { id: result.insertId, email, full_name, role: 'pelanggan' };
            const token        = tokenService.signAccess(payload);
            const refreshToken = tokenService.signRefresh({ id: result.insertId });

            db.query(
                'INSERT INTO activities (user_id, activity_name, ip_address, user_agent) VALUES (?, ?, ?, ?)',
                [result.insertId, 'User baru mendaftar', req.ip, req.headers['user-agent']]
            ).catch(() => {});

            res.status(201).json({
                success: true,
                message: 'Registrasi berhasil',
                data: { token, refreshToken, user: { id: result.insertId, full_name, email, role: 'pelanggan' } }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
        }
    },

    // ── REFRESH TOKEN ─────────────────────────────────────────────────────
    refresh: async (req, res) => {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) {
                return res.status(400).json({ success: false, message: 'Refresh token wajib diisi' });
            }

            const decoded = tokenService.verifyRefresh(refreshToken);

            // Handle hardcoded admin refresh
            if (decoded.id === 0) {
                const adminEmail = process.env.ADMIN_EMAIL || 'admin@admin.com';
                const payload = { id: 0, email: adminEmail, full_name: 'Administrator', role: 'admin' };
                const newToken = tokenService.signAccess(payload);
                return res.json({ success: true, data: { token: newToken } });
            }

            const [users] = await db.query(
                'SELECT id, email, full_name, role FROM users WHERE id = ?',
                [decoded.id]
            );
            if (users.length === 0) {
                return res.status(401).json({ success: false, message: 'User tidak ditemukan' });
            }

            const user    = users[0];
            const payload = { id: user.id, email: user.email, full_name: user.full_name, role: user.role };
            const newToken = tokenService.signAccess(payload);

            res.json({ success: true, data: { token: newToken } });
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ success: false, message: 'Refresh token expired, silakan login ulang' });
            }
            res.status(401).json({ success: false, message: 'Refresh token tidak valid' });
        }
    },

    // ── LOGOUT ────────────────────────────────────────────────────────────
    logout: async (req, res) => {
        try {
            const userId = req.user?.id;
            if (userId) {
                db.query(
                    'INSERT INTO activities (user_id, activity_name, ip_address, user_agent) VALUES (?, ?, ?, ?)',
                    [userId, 'Logout dari sistem', req.ip, req.headers['user-agent']]
                ).catch(() => {});
            }
            res.json({ success: true, message: 'Logout berhasil' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
        }
    },

    // ── CHANGE PASSWORD ───────────────────────────────────────────────────
    changePassword: async (req, res) => {
        try {
            const userId = req.user?.id;
            const { old_password, new_password } = req.body;

            const [users] = await db.query('SELECT password FROM users WHERE id = ?', [userId]);
            if (users.length === 0) {
                return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
            }

            const valid = await bcrypt.compare(old_password, users[0].password);
            if (!valid) {
                return res.status(400).json({ success: false, message: 'Password lama tidak sesuai' });
            }

            const hashed = await bcrypt.hash(new_password, 10);
            await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, userId]);

            res.json({ success: true, message: 'Password berhasil diubah' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
        }
    },

    // ── VERIFY TOKEN (dipakai frontend untuk cek sesi aktif) ──────────────
    verifyToken: async (req, res) => {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return res.status(401).json({ success: false, message: 'Token tidak ditemukan' });
            }

            const decoded = tokenService.verifyAccess(token);

            // Handle hardcoded admin verify
            if (decoded.id === 0 && decoded.role === 'admin') {
                return res.json({ 
                    success: true, 
                    data: { user: { id: 0, full_name: decoded.full_name, email: decoded.email, role: 'admin' } } 
                });
            }

            const [users] = await db.query(
                'SELECT id, full_name, email, role FROM users WHERE id = ?',
                [decoded.id]
            );
            if (users.length === 0) {
                return res.status(401).json({ success: false, message: 'User tidak ditemukan' });
            }

            res.json({ success: true, data: { user: users[0] } });
        } catch (error) {
            res.status(401).json({ success: false, message: 'Token tidak valid' });
        }
    },

    // ── FORGOT PASSWORD (User) ────────────────────────────────────────────
    forgotPassword: async (req, res) => {
        try {
            const { email } = req.body;
            if (!email) {
                return res.status(400).json({ success: false, message: 'Email wajib diisi' });
            }

            const [users] = await db.query('SELECT id, email, full_name FROM users WHERE email = ? AND role = ?', [email, 'pelanggan']);
            if (users.length === 0) {
                // Return success anyway to prevent email enumeration
                return res.json({ success: true, message: 'Jika email terdaftar, instruksi reset akan dikirim.' });
            }

            const user = users[0];
            const resetToken = jwt.sign(
                { id: user.id, email: user.email }, 
                process.env.JWT_ACCESS_SECRET || 'fallback_secret', 
                { expiresIn: '1h' }
            );
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

            if (process.env.MAIL_HOST) {
                const transporter = nodemailer.createTransport({
                    host: process.env.MAIL_HOST,
                    port: process.env.MAIL_PORT,
                    auth: {
                        user: process.env.MAIL_USER,
                        pass: process.env.MAIL_PASS
                    }
                });

                await transporter.sendMail({
                    from: `"UPTD Lab Pengujian" <${process.env.MAIL_USER}>`,
                    to: user.email,
                    subject: 'Reset Password UPTD Lab Pengujian',
                    text: `Halo ${user.full_name},\n\nKlik link berikut untuk reset password Anda:\n${resetLink}\n\nLink berlaku selama 1 jam.\n\nTerima kasih.`
                });
            } else {
                // Fallback untuk development
                console.log('=============================================');
                console.log(`🔑 [DEV MODE] Reset Password Link for ${user.email}:`);
                console.log(resetLink);
                console.log('=============================================');
            }

            res.json({ success: true, message: 'Jika email terdaftar, instruksi reset akan dikirim.' });
        } catch (error) {
            console.error('Forgot Password Error:', error);
            res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
        }
    },

    // ── RESET PASSWORD (User) ─────────────────────────────────────────────
    resetPassword: async (req, res) => {
        try {
            const { token, new_password } = req.body;
            if (!token || !new_password) {
                return res.status(400).json({ success: false, message: 'Token dan password baru wajib diisi' });
            }

            const secret = process.env.JWT_ACCESS_SECRET || 'fallback_secret';
            let decoded;
            try {
                decoded = jwt.verify(token, secret);
            } catch (err) {
                return res.status(400).json({ success: false, message: 'Token tidak valid atau sudah kedaluwarsa' });
            }

            const hashed = await bcrypt.hash(new_password, 10);
            const [result] = await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, decoded.id]);
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
            }

            res.json({ success: true, message: 'Password berhasil direset. Silakan login dengan password baru.' });
        } catch (error) {
            console.error('Reset Password Error:', error);
            res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
        }
    }
};

module.exports = authController;