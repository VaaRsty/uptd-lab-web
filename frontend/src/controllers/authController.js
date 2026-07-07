/**
 * Controller AUTH (login, register, logout) untuk halaman EJS.
 * Pakai apiClient untuk panggil backend.
 */
const api = require('../services/apiClient');
const logger = require('../utils/logger');

// Helper untuk save session aman (regenerate session ID setelah login)
function saveLoginSession(req, userData, token) {
    return new Promise((resolve, reject) => {
        req.session.regenerate((regenErr) => {
            if (regenErr) return reject(regenErr);

            req.session.token = token;
            req.session.user = {
                id: userData.id,
                email: userData.email,
                full_name: userData.full_name || userData.name,
                nama_instansi: userData.nama_instansi || null,
                role: userData.role || 'pelanggan',
                avatar: userData.avatar || null
            };

            req.session.save((saveErr) => {
                if (saveErr) return reject(saveErr);
                resolve();
            });
        });
    });
}

// ==================== LOGIN PAGE ====================
exports.loginPage = (req, res) => {
    if (req.session?.user?.role === 'pelanggan') {
        return res.redirect('/user/dashboard');
    }
    res.render('login', {
        title: 'Login - UPTD Lab',
        error: null,
        success: req.query.registered === 'true'
            ? 'Registrasi berhasil! Silakan login.'
            : null,
        formData: {},
        user: null
    });
};

exports.adminLoginPage = (req, res) => {
    if (req.session?.user && ['admin', 'petugas', 'superadmin'].includes(req.session.user.role)) {
        return res.redirect('/admin/dashboard');
    }
    res.render('admin/login', {
        title: 'Admin Login',
        error: null,
        layout: false
    });
};

exports.registerPage = (req, res) => {
    if (req.session?.user?.role === 'pelanggan') {
        return res.redirect('/user/dashboard');
    }
    res.render('register', {
        title: 'Daftar Akun - UPTD Lab',
        error: null,
        success: null,
        formData: {},
        user: null
    });
};

// ==================== LOGIN POST ====================
exports.login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.json({ success: false, message: 'Email dan password wajib diisi' });
    }

    try {
        const response = await api.auth.login(email, password);
        if (!response.data.success) {
            return res.json({ success: false, message: response.data.message || 'Login gagal' });
        }

        const userData = response.data.data.user || response.data.data;
        const token = response.data.data.token || response.data.data;

        await saveLoginSession(req, userData, token);

        return res.json({
            success: true,
            data: {
                id: userData.id,
                email: userData.email,
                full_name: userData.full_name || userData.name,
                role: userData.role || 'pelanggan',
                avatar: userData.avatar || null,
                token
            },
            redirect:
                userData.role === 'admin' || userData.role === 'petugas'
                    ? '/admin/dashboard'
                    : '/user/dashboard'
        });
    } catch (err) {
        logger.warn('Login failed: ' + (err.response?.data?.message || err.message));
        return res.json({
            success: false,
            message: err.response?.data?.message || 'Terjadi kesalahan saat login'
        });
    }
};

// ==================== ADMIN LOGIN POST ====================
exports.adminLogin = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.json({ success: false, message: 'Email dan password wajib diisi' });
    }

    try {
        const response = await api.auth.adminLogin(email, password);
        if (!response.data.success) {
            return res.json({ success: false, message: response.data.message || 'Login gagal' });
        }

        const userData = response.data.data.user || response.data.data;
        const token = response.data.data.token || response.data.data;

        await saveLoginSession(req, { ...userData, role: userData.role || 'admin' }, token);

        return res.json({
            success: true,
            data: {
                id: userData.id,
                email: userData.email,
                full_name: userData.full_name || userData.name,
                role: userData.role || 'admin',
                avatar: userData.avatar || null,
                token
            },
            redirect: '/admin/dashboard'
        });
    } catch (err) {
        logger.warn('Admin login failed: ' + (err.response?.data?.message || err.message));
        return res.json({
            success: false,
            message: err.response?.data?.message || 'Terjadi kesalahan saat login'
        });
    }
};

// ==================== REGISTER POST ====================
exports.register = async (req, res) => {
    const data = req.body;

    if (data.password !== data.confirm_password) {
        return res.render('register', {
            title: 'Daftar Akun - UPTD Lab',
            error: 'Password dan konfirmasi password tidak cocok!',
            formData: data,
            user: null
        });
    }

    try {
        const response = await api.auth.register(data);
        if (response.data.success) {
            return res.redirect('/login?registered=true');
        }
        return res.render('register', {
            title: 'Daftar Akun - UPTD Lab',
            error: response.data.message || 'Registrasi gagal',
            formData: data,
            user: null
        });
    } catch (err) {
        logger.warn('Register failed: ' + (err.response?.data?.message || err.message));
        const errors = err.response?.data?.errors;
        const errorMsg = errors?.length
            ? errors.map((e) => e.message).join(', ')
            : err.response?.data?.message || 'Gagal terhubung ke server';

        return res.render('register', {
            title: 'Daftar Akun - UPTD Lab',
            error: errorMsg,
            formData: data,
            user: null
        });
    }
};

// ==================== LOGOUT ====================
exports.logout = (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const clearCookie = () =>
        res.clearCookie('uptd.sid', { path: '/', httpOnly: true });

    if (!req.session) {
        clearCookie();
        return res.redirect('/');
    }

    req.session.destroy((err) => {
        if (err) logger.error('Logout error: ' + err.message);
        clearCookie();
        return res.redirect('/');
    });
};
