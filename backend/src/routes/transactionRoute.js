const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../config/multer');
const checkUploadSize = require('../middlewares/checkUploadSize');

router.get('/user', authMiddleware, transactionController.userList);
router.get('/user/:id', authMiddleware, transactionController.userDetail);

// 🔥 TAMBAHKAN ROUTE UNTUK UPLOAD BUKTI PEMBAYARAN
router.post(
    '/user/:id/upload',
    authMiddleware,
    upload.raw.single('payment_proof'),
    checkUploadSize,
    transactionController.uploadPaymentProof
);

module.exports = router;