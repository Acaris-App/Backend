const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');

// ✅ FIX: Aktifkan rate limiter berbasis Redis (aman untuk multi-instance Cloud Run)
const { loginLimiter, otpLimiter, resendLimiter } = require('../middlewares/rateLimit.middleware');


// ================= AUTH =================

// 🔐 Login
router.post('/login', loginLimiter, authController.login);

// 📝 Register
router.post('/register', authController.register);

// 🔑 Verify OTP Login
router.post('/verify-login-otp', otpLimiter, authController.verifyLoginOTP);

// 🔑 Verify OTP Register
router.post('/verify-register-otp', otpLimiter, authController.verifyRegisterOTP);

// 🔁 Resend OTP
router.post('/resend-otp', resendLimiter, authController.resendOTP);


module.exports = router;