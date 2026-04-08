const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { uploadImage } = require('../config/multer');
const { authenticate } = require('../middlewares/auth.middleware');

const { loginLimiter, otpLimiter, resendLimiter } = require('../middlewares/rateLimit.middleware');


// ================= AUTH =================

// 🔐 Login — langsung return token (tanpa OTP)
router.post('/login', loginLimiter, authController.login);

// ✅ Validasi kode kelas — step 1 sebelum isi data diri (multi-step register Android)
router.post('/validate-kode-kelas', authController.validateKodeKelas);

// 📝 Register Mahasiswa (profile picture opsional, multipart/form-data)
router.post('/register/mahasiswa', uploadImage.single('profile_picture'), authController.registerMahasiswa);

// 📝 Register Dosen (profile picture opsional)
router.post('/register/dosen', uploadImage.single('profile_picture'), authController.registerDosen);

// 🔑 Verify OTP Register
router.post('/verify-register-otp', otpLimiter, authController.verifyRegisterOTP);

// 🔁 Resend OTP (type: register | reset_password)
router.post('/resend-otp', resendLimiter, authController.resendOTP);

// 🔓 Lupa Password — kirim OTP ke email
router.post('/forgot-password', authController.forgotPassword);

// 🔒 Reset Password — verif OTP lalu set password baru
router.post('/reset-password', authController.resetPassword);

// 🔒 Ubah Password — user sudah login
router.post('/change-password', authenticate, authController.changePassword);

// 🚪 Logout
router.post('/logout', authenticate, authController.logout);


module.exports = router;
