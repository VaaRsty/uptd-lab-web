const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validationMiddleware');
const { loginLimiter, forgotPasswordLimiter } = require('../middlewares/rateLimitMiddleware');
const {
    registerSchema,
    loginSchema,
    changePasswordSchema,
    refreshTokenSchema
} = require('../validations/authValidation');

// Public
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/admin/login', loginLimiter, validate(loginSchema), authController.adminLogin);
router.post('/refresh', validate(refreshTokenSchema), authController.refresh);
router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected
router.post('/logout', authMiddleware, authController.logout);
router.post(
    '/change-password',
    authMiddleware,
    validate(changePasswordSchema),
    authController.changePassword
);

module.exports = router;
