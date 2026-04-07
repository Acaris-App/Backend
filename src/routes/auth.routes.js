const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { uploadImage } = require('../config/multer');

// ✅ Rate limiters berbasis Redis
const { loginLimiter, otpLimiter, resendLimiter } = require('../middlewares/rateLimit.middleware');


// ================= AUTH =================

// 🔐 Login
router.post('/login', loginLimiter, authController.login);

// 📝 Register Mahasiswa (form-data biasa, tanpa file)
router.post('/register/mahasiswa', authController.registerMahasiswa);

// 📝 Register Dosen (form-data + profile picture opsional)
router.post('/register/dosen', uploadImage.single('profile_picture'), authController.registerDosen);

// 🔑 Verify OTP Login
router.post('/verify-login-otp', otpLimiter, authController.verifyLoginOTP);

// 🔑 Verify OTP Register
router.post('/verify-register-otp', otpLimiter, authController.verifyRegisterOTP);

// 🔁 Resend OTP
router.post('/resend-otp', resendLimiter, authController.resendOTP);


module.exports = router;