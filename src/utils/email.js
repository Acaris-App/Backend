require('dotenv').config();

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  connectionTimeout: 5000
});

// ================= TEMPLATE =================
const generateOTPTemplate = (code) => {
  return `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #d9d9d9; border-radius: 12px; overflow: hidden;">

    <div style="background-color: #3674b5; padding: 20px; text-align: center;">
      <img src="https://raw.githubusercontent.com/Aku-Mars/gambar/refs/heads/main/neko.png" 
           alt="Acaris Logo" 
           style="width: 80px; height: auto; margin-bottom: 10px;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Acaris</h1>
    </div>

    <div style="padding: 30px; background-color: #ffffff; text-align: center;">
      <h2 style="color: #1A1A1A; margin-bottom: 10px; font-weight: 600;">Verifikasi Kode OTP</h2>
      <p style="color: #666666; font-size: 16px; margin-bottom: 25px;">
        Gunakan kode di bawah ini untuk melanjutkan proses Anda.
      </p>

      <div style="background-color: #f3f3f3; padding: 15px; border-radius: 8px; display: inline-block; letter-spacing: 5px; border: 1px solid #d9d9d9;">
        <span style="font-size: 32px; font-weight: bold; color: #1A1A1A;">${code}</span>
      </div>

      <p style="color: #9d9999; font-size: 14px; margin-top: 25px;">
        Kode ini hanya berlaku selama <strong>5 menit</strong>.<br>
        Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini.
      </p>
    </div>

    <div style="background-color: #f9fafb; padding: 15px; text-align: center; border-top: 1px solid #d9d9d9;">
      <p style="color: #7f7f7f; font-size: 12px; margin: 0;">
        &copy; 2024 Acaris System. All rights reserved.
      </p>
    </div>

  </div>
  `;
};

// ================= SEND EMAIL =================
// 🚧 DEV MODE: Email tidak dikirim, OTP ditampilkan di console
// Untuk production, uncomment blok nodemailer di bawah dan hapus DEV MODE block

exports.sendOTPEmail = async (to, code, type = 'login') => {

  // ── DEV MODE ──────────────────────────────────────────────────
  // console.log("==================================================");
  // console.log(`🔑 OTP [${type.toUpperCase()}]`);
  // console.log(`   To   : ${to}`);
  // console.log(`   Code : ${code}`);
  // console.log("==================================================");
  // return; // skip pengiriman email
  // ──────────────────────────────────────────────────────────────

  // ── PRODUCTION (uncomment saat deploy) ────────────────────────
  const subjectMap = {
    login: "OTP Login Acaris",
    register: "OTP Verifikasi Akun",
    reset_password: "OTP Reset Password"
  };
  const subject = subjectMap[type] || "OTP Acaris";
  try {
    const info = await transporter.sendMail({
      from: `"Acaris System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: generateOTPTemplate(code)
    });
    console.log("✅ EMAIL SENT:", info.response);
  } catch (err) {
    console.error("❌ EMAIL ERROR:", err.message);
    throw err;
  }
  // ──────────────────────────────────────────────────────────────
};