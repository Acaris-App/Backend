const bcrypt = require('bcrypt');

const userRepository = require('../repositories/user.repository');
const otpRepository = require('../repositories/otp.repository');
const profileRepository = require('../repositories/profile.repository');

const jwt = require('../config/jwt');
const db = require('../config/db');

const { generateOTP, compareOTP } = require('../utils/otp');
const { sendOTPEmail } = require('../utils/email');

const { validateRegister } = require('../validators/auth.validator');
const { checkLoginLimit } = require('./rateLimit.service');

// ================= LOGIN =================
exports.login = async ({ email, password, ip }) => {

  if (!email || !password) {
    throw { status: 400, message: "Email dan password wajib diisi" };
  }

  // 🔥 FIX: hanya sekali limiter
  const userIP = ip || 'unknown';
  console.log('Login IP:', userIP);

  await checkLoginLimit(userIP);

  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw { status: 401, message: "Email atau password salah" };
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw { status: 401, message: "Email atau password salah" };
  }

  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await otpRepository.createOTP(user.id, code, 'login', expiresAt);

  // 🔥 NON-BLOCKING EMAIL (AMAN)
  sendOTPEmail(user.email, code, 'login')
    .catch(err => console.error('Email error:', err.message));

  return {
    message: "OTP telah dikirim ke email"
  };
};


// ================= REGISTER =================
exports.register = async (payload) => {

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    const { error } = validateRegister(payload);
    if (error) {
      throw { status: 400, message: error.details[0].message };
    }

    const {
      name,
      email,
      password,
      role,
      npm_nip,
      angkatan,
      kode_kelas,
      ipk,
      current_semester
    } = payload;

    // 🔥 VALIDASI TAMBAHAN
    if (role === 'mahasiswa') {
      if (!ipk || ipk < 0 || ipk > 4) {
        throw { status: 400, message: "IPK tidak valid" };
      }

      if (!current_semester || current_semester < 1) {
        throw { status: 400, message: "Semester tidak valid" };
      }
    }

    const existingEmail = await userRepository.findByEmail(email);
    if (existingEmail) throw { status: 400, message: "Email sudah digunakan" };

    const existingNPM = await userRepository.findByNpm(npm_nip);
    if (existingNPM) throw { status: 400, message: "NPM/NIP sudah digunakan" };

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userRepository.createUserTx(client, {
      name,
      email,
      password: hashedPassword,
      role,
      npm_nip
    });

    // ================= MAHASISWA =================
    if (role === 'mahasiswa') {

      const dosen = await profileRepository.findDosenByKode(kode_kelas);

      if (!dosen) {
        throw { status: 400, message: "Kode kelas tidak valid" };
      }

      await profileRepository.createMahasiswaTx(client, {
        user_id: user.id,
        angkatan,
        ipk,
        current_semester,
        dosen_pa_id: dosen.user_id
      });
    }

    // ================= DOSEN =================
    if (role === 'dosen') {

      const kodeKelasGenerated =
        'DSN-' + Math.random().toString(36).substring(2, 6).toUpperCase();

      await profileRepository.createDosenTx(client, {
        user_id: user.id,
        kode_kelas: kodeKelasGenerated
      });
    }

    // OTP
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await otpRepository.createOTPTx(client, user.id, code, 'register', expiresAt);

    await client.query('COMMIT');

    await sendOTPEmail(email, code, 'register');

    return {
      message: "Registrasi berhasil, OTP telah dikirim"
    };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};


// ================= VERIFY LOGIN OTP =================
exports.verifyLoginOTP = async ({ email, code }) => {

  if (!email || !code) {
    throw { status: 400, message: "Email dan OTP wajib diisi" };
  }

  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw { status: 404, message: "User tidak ditemukan" };
  }

  const otpData = await otpRepository.findOTPByUser(user.id, 'login');

  if (!otpData || otpData.expires_at < new Date()) {
    throw { status: 400, message: "OTP tidak valid atau expired" };
  }

  const isValid = await compareOTP(code.trim(), otpData.code);

  if (!isValid) {
    throw { status: 400, message: "OTP tidak valid atau expired" };
  }

  await otpRepository.markAsUsed(otpData.id);

  const token = jwt.generateToken({
    id: user.id,
    role: user.role
  });

  return { token };
};


// ================= VERIFY REGISTER OTP =================
exports.verifyRegisterOTP = async ({ email, code }) => {

  const user = await userRepository.findByEmail(email);
  if (!user) throw { status: 404, message: "User tidak ditemukan" };

  const otpData = await otpRepository.findOTPByUser(user.id, 'register');

  if (!otpData || otpData.expires_at < new Date()) {
    throw { status: 400, message: "OTP tidak valid atau expired" };
  }

  const isValid = await compareOTP(code.trim(), otpData.code);

  if (!isValid) {
    throw { status: 400, message: "OTP tidak valid atau expired" };
  }

  await otpRepository.markAsUsed(otpData.id);
  await userRepository.verifyUser(user.id);

  return {
    message: "Akun berhasil diverifikasi"
  };
};


// ================= RESEND OTP =================
exports.resendOTP = async ({ email, type }) => {

  const user = await userRepository.findByEmail(email);
  if (!user) throw { status: 404, message: "User tidak ditemukan" };

  if (!['login', 'register'].includes(type)) {
    throw { status: 400, message: "Type OTP tidak valid" };
  }

  // 🔥 invalidate OTP lama
  await otpRepository.invalidateOTP(user.id, type);

  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await otpRepository.createOTP(user.id, code, type, expiresAt);

  await sendOTPEmail(user.email, code, type);

  return {
    message: "OTP berhasil dikirim ulang"
  };
};