const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');

router.post('/login', authController.login);
router.post('/register', authController.register);

router.post('/verify-login-otp', authController.verifyLoginOTP);
router.post('/verify-register-otp', authController.verifyRegisterOTP);

router.post('/resend-otp', authController.resendOTP);

module.exports = router;