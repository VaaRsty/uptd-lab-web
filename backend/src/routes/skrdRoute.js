const express = require('express');
const router = express.Router();
const skrdController = require('../controllers/skrdController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const { validate } = require('../middlewares/validationMiddleware');
const upload = require('../config/multer');
const checkUploadSize = require('../middlewares/checkUploadSize');
const { createSchema, updateStatusSchema } = require('../validations/skrdValidation');

router.get('/', authMiddleware, skrdController.list);
router.get('/:id', authMiddleware, skrdController.detail);
router.get('/:id/download-skrd', authMiddleware, skrdController.downloadFile);

router.post(
    '/',
    authMiddleware,
    requireRole('admin', 'petugas'),
    validate(createSchema),
    skrdController.create
);

router.put(
    '/:id/status',
    authMiddleware,
    requireRole('admin', 'petugas'),
    validate(updateStatusSchema),
    skrdController.updateStatus
);

router.post(
    '/:id/upload-skrd',
    authMiddleware,
    requireRole('admin', 'petugas'),
    upload.single('skrd'),
    checkUploadSize,
    skrdController.uploadFile
);

router.post(
    '/:id/upload-payment-proof',
    authMiddleware,
    upload.raw.single('payment_proof'),
    checkUploadSize,
    skrdController.uploadPaymentProof
);

router.post(
    '/:id/verify-payment',
    authMiddleware,
    requireRole('admin', 'petugas'),
    skrdController.verifyPayment
);

router.post(
    '/:id/reject-proof',
    authMiddleware,
    requireRole('admin', 'petugas'),
    skrdController.rejectProof
);

router.post(
    '/:id/remind',
    authMiddleware,
    requireRole('admin', 'petugas'),
    skrdController.sendReminder
);

router.post('/:id/cancel', authMiddleware, skrdController.cancel);

module.exports = router;
