/**
 * Backward Compatibility Layer.
 * Forward URL endpoint LAMA ke controller BARU.
 * Ini biar frontend kamu yang masih pakai URL lama tetap jalan
 * tanpa harus diubah satu per satu.
 *
 * Nanti kalau frontend udah selesai dimigrasi ke URL baru,
 * file ini boleh dihapus dari server.js.
 */
const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const submissionController = require('../controllers/submissionController');
const skrdController = require('../controllers/skrdController');
const kuisionerController = require('../controllers/kuisionerController');
const notificationController = require('../controllers/notificationController');
const settingController = require('../controllers/settingController');
const reportController = require('../controllers/reportController');
const transactionController = require('../controllers/transactionController');
const publicController = require('../controllers/publicController');
const dashboardController = require('../controllers/dashboardController');
const fileController = require('../controllers/fileController');

const authMiddleware = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const { validate } = require('../middlewares/validationMiddleware');
const { loginLimiter } = require('../middlewares/rateLimitMiddleware');
const upload = require('../config/multer');
const checkUploadSize = require('../middlewares/checkUploadSize');

const {
    registerSchema,
    loginSchema,
    changePasswordSchema
} = require('../validations/authValidation');
const { createSchema: submissionCreateSchema } = require('../validations/submissionValidation');

// =============================================================
// PUBLIC (tanpa auth) — Untuk halaman utama, layanan, jadwal sibuk
// =============================================================
router.get('/services', publicController.getServices);
router.get('/services/:id', publicController.getServiceById);
router.get('/jadwal-sibuk', publicController.getJadwalSibuk);
router.get('/busy-schedule', publicController.getPublicBusySchedule);

// =============================================================
// AUTH — register / login (sudah ada di /api/auth/* juga, tapi
// ada juga yang dipanggil tanpa prefix /auth)
// =============================================================
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/admin/login', loginLimiter, validate(loginSchema), authController.adminLogin);

// =============================================================
// USER (self) — Profile, dashboard, history
// =============================================================
router.get('/user/profile', authMiddleware, userController.getProfile);
router.put('/user/profile', authMiddleware, userController.updateProfile);
router.post(
    '/user/avatar',
    authMiddleware,
    upload.single('avatar'),
    checkUploadSize,
    userController.uploadAvatar
);
router.delete('/user/avatar', authMiddleware, userController.deleteAvatar);
router.post(
    '/user/change-password',
    authMiddleware,
    validate(changePasswordSchema),
    authController.changePassword
);

router.get('/user/dashboard', authMiddleware, submissionController.userDashboard);
router.get('/user/history', authMiddleware, submissionController.userHistory);
router.get('/user/history/:id', authMiddleware, submissionController.userHistoryDetail);

router.post(
    '/user/submission',
    authMiddleware,
    upload.raw.fields([
        { name: 'surat_permohonan', maxCount: 1 },
        { name: 'scan_ktp', maxCount: 1 },
        { name: 'lampiran_pendukung', maxCount: 1 }
    ]),
    checkUploadSize,
    validate(submissionCreateSchema),
    submissionController.create
);

// User transactions
router.get('/user/transactions', authMiddleware, transactionController.userList);
router.get('/user/transactions/:id', authMiddleware, transactionController.userDetail);
router.post(
    '/user/transactions/:id/upload',
    authMiddleware,
    upload.raw.single('payment_proof'),
    checkUploadSize,
    skrdController.uploadPaymentProof
);

// User notifications
router.get('/user/notifications', authMiddleware, notificationController.userList);
router.get('/user/notifications/count', authMiddleware, notificationController.unreadCount);
router.get('/user/notification-settings', authMiddleware, notificationController.getSettings);
router.put('/user/notification-settings', authMiddleware, notificationController.updateSettings);

// =============================================================
// ADMIN — Users, notifications, dashboard, kuisioner
// =============================================================
router.get('/admin/users', authMiddleware, requireRole('admin'), userController.list);
router.get('/admin/users/:id/detail', authMiddleware, requireRole('admin'), userController.detail);
router.put('/admin/users/:id', authMiddleware, requireRole('admin'), userController.update);
router.delete('/admin/users/:id', authMiddleware, requireRole('admin'), userController.delete);
router.post(
    '/admin/users/:id/verify',
    authMiddleware,
    requireRole('admin'),
    userController.verify
);
router.post(
    '/admin/users/:id/deactivate',
    authMiddleware,
    requireRole('admin'),
    userController.deactivate
);
router.post(
    '/admin/users/:id/reset-password',
    authMiddleware,
    requireRole('admin'),
    userController.resetPassword
);
router.post(
    '/admin/users/:id/notify',
    authMiddleware,
    requireRole('admin'),
    userController.sendNotification
);

router.get(
    '/admin/notifications',
    authMiddleware,
    requireRole('admin', 'petugas'),
    notificationController.adminList
);
router.put(
    '/admin/notifications/mark-all-read',
    authMiddleware,
    requireRole('admin', 'petugas'),
    notificationController.markAllAdminRead
);

router.get(
    '/admin/dashboard/stats',
    authMiddleware,
    requireRole('admin', 'petugas'),
    dashboardController.adminStats
);
router.get(
    '/dashboard/complete',
    authMiddleware,
    requireRole('admin', 'petugas'),
    dashboardController.getData
);

// Admin kuisioner
router.get(
    '/admin/kuisioner',
    authMiddleware,
    requireRole('admin', 'petugas'),
    kuisionerController.list
);
router.get(
    '/admin/kuisioner/:id',
    authMiddleware,
    requireRole('admin', 'petugas'),
    kuisionerController.detail
);
router.get(
    '/admin/kuisioner-stats',
    authMiddleware,
    requireRole('admin', 'petugas'),
    kuisionerController.stats
);

// Admin questions
router.get(
    '/admin/kuisioner-questions',
    authMiddleware,
    requireRole('admin'),
    kuisionerController.listQuestions
);

// =============================================================
// FILE — akses file legacy (lama: /api/file/, sekarang plural)
// =============================================================
router.get('/file/:fileType/:filename', authMiddleware, fileController.getFile);

// =============================================================
// SUBMISSIONS legacy — /api/submissions (sudah dipakai admin)
// Ini sudah di-cover sama submissionRoute di /api/submissions
// =============================================================

// =============================================================
// REPORTS legacy
// =============================================================
router.post(
    '/submissions/:id/report',
    authMiddleware,
    requireRole('admin', 'petugas'),
    upload.single('laporan'),
    checkUploadSize,
    reportController.uploadSubmissionReport
);
router.get(
    '/submissions/:id/report',
    authMiddleware,
    reportController.downloadSubmissionReport
);
router.delete(
    '/submissions/:id/report',
    authMiddleware,
    requireRole('admin', 'petugas'),
    reportController.deleteSubmissionReport
);

// =============================================================
// SETTINGS legacy
// =============================================================
router.get(
    '/admin/settings',
    authMiddleware,
    requireRole('admin'),
    settingController.getSystem
);
router.put(
    '/admin/settings',
    authMiddleware,
    requireRole('admin'),
    settingController.updateSystem
);
router.get('/busy-mode', authMiddleware, settingController.getBusyMode);
router.put(
    '/busy-mode',
    authMiddleware,
    requireRole('admin'),
    settingController.updateBusyMode
);

module.exports = router;
