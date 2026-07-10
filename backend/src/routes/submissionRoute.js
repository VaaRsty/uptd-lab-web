const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submissionController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const { validate } = require('../middlewares/validationMiddleware');
const upload = require('../config/multer');
const checkUploadSize = require('../middlewares/checkUploadSize');
const { createSchema, updateSchema } = require('../validations/submissionValidation');

// User endpoints (urut spesifik dulu)
router.get('/user/history', authMiddleware, submissionController.userHistory);
router.get('/user/history/:id', authMiddleware, submissionController.userHistoryDetail);
router.get('/user/dashboard', authMiddleware, submissionController.userDashboard);

// Admin/list endpoints
router.get('/', authMiddleware, requireRole('admin', 'petugas'), submissionController.list);
router.get('/:id', authMiddleware, submissionController.detail);
router.get('/:id/documents', authMiddleware, submissionController.getDocuments);

router.put(
    '/:id',
    authMiddleware,
    requireRole('admin', 'petugas'),
    validate(updateSchema),
    submissionController.update
);
router.post('/:id/cancel', authMiddleware, submissionController.cancel);

// =========== UPLOAD / HAPUS LAPORAN HASIL PENGUJIAN ===========
router.post(
    '/:id/report',
    authMiddleware,
    requireRole('admin', 'petugas'),
    upload.single('laporan'),
    checkUploadSize,
    submissionController.uploadReport
);

router.delete(
    '/:id/report',
    authMiddleware,
    requireRole('admin', 'petugas'),
    submissionController.deleteReport
);

// Generate signed upload URLs untuk direct browser-to-Supabase upload
router.post('/upload-urls', authMiddleware, submissionController.generateUploadUrls);

// Create submission — menerima multipart/form-data (file dikirim langsung dari browser)
router.post(
    '/',
    authMiddleware,
    upload.raw.fields([
        { name: 'surat_permohonan', maxCount: 1 },
        { name: 'scan_ktp', maxCount: 1 },
        { name: 'lampiran_pendukung', maxCount: 1 }
    ]),
    checkUploadSize,
    validate(createSchema),
    submissionController.create
);

module.exports = router;
