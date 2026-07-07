/**
 * Mount semua route domain di sini.
 */
const express = require('express');
const router = express.Router();

console.log('📌 [INDEX] Starting route registration...');

// Route baru (clean RESTful)
router.use('/auth', require('./authRoute'));

router.use('/public', require('./publicRoute'));

router.use('/user', require('./userRoute'));

// 🔥 PASTIKAN INI ADA DAN TIDAK ERROR
router.use('/users', require('./userRoute'));

router.use('/submissions', require('./submissionRoute'));

router.use('/skrd', require('./skrdRoute'));

router.use('/kuisioner', require('./kuisionerRoute'));

router.use('/notifications', require('./notificationRoute'));

router.use('/settings', require('./settingRoute'));

router.use('/reports', require('./reportRoute'));

router.use('/transactions', require('./transactionRoute'));

router.use('/files', require('./fileRoute'));

router.use('/dashboard', require('./dashboardRoute'));

// Backward Compatibility
router.use('/', require('./legacyAliasRoute'));

console.log('📌 [INDEX] All routes mounted successfully');

module.exports = router;