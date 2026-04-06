const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { loginLimiter, otpLimiter, resendLimiter } = require('../middlewares/rateLimit.middleware');

router.post('/login', loginLimiter, authController.login);
router.post('/register', authController.register);

router.post('/verify-login-otp', otpLimiter, authController.verifyLoginOTP);
router.post('/verify-register-otp', otpLimiter, authController.verifyRegisterOTP);

router.post('/resend-otp', resendLimiter, authController.resendOTP);

module.exports = router;