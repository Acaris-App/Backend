const rateLimit = require('express-rate-limit');

// 🔐 Login limiter
exports.loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: 5,
  message: {
    status: "error",
    message: "Terlalu banyak percobaan login, coba lagi nanti"
  }
});

// 🔐 OTP verify limiter
exports.otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 8,
  message: {
    status: "error",
    message: "Terlalu banyak percobaan OTP"
  }
});

// 🔐 Resend limiter
exports.resendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:3,
  message: {
    status: "error",
    message: "Terlalu sering meminta OTP"
  }
});