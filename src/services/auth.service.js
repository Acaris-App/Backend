const bcrypt = require('bcrypt');

const userRepository = require('../repositories/user.repository');
const otpRepository = require('../repositories/otp.repository');
const profileRepository = require('../repositories/profile.repository');

const redis = require('../config/redis');

const jwt = require('../config/jwt');
const db = require('../config/db');
const { bucket } = require('../config/gcs');

const { generateOTP, compareOTP } = require('../utils/otp');
const { sendOTPEmail } = require('../utils/email');

const { validateRegister } = require('../validators/auth.validator');
const { checkLoginLimit } = require('./rateLimit.service');

// ================= HELPER GCS PROFILE PICTURE =================
const uploadProfilePicture = async (file, nip) => {
  const ext = file.mimetype.split('/')[1];
  const filename = `profile-pictures/${nip}-${Date.now()}.${ext}`;
  const blob = bucket.file(filename);

  const blobStream = blob.createWriteStream({
    resumable: false,
    contentType: file.mimetype
  });

  return new Promise((resolve, reject) => {
    blobStream.on('finish', () => {
      const url = `https://storage.googleapis.com/${bucket.name}/${filename}`;
      resolve(url);
    });
    blobStream.on('error', reject);
    blobStream.end(file.buffer);
  });
};

// ================= HELPER: BUILD PROFILE DATA =================
// Field name harus identik dengan GET /user/profile agar Android tidak perlu handle dua struktur berbeda
const buildProfileData = async (user) => {
  let profileData = {};

  if (user.role === 'mahasiswa') {
    const mahasiswa = await profileRepository.getMahasiswaProfile(user.id);
    if (mahasiswa) {
      profileData = {
        angkatan:         mahasiswa.angkatan,
        ipk:              mahasiswa.ipk,
        current_semester: mahasiswa.current_semester,  // ← konsisten dengan GET /user/profile
        dosen_pa_id:      mahasiswa.dosen_pa_id,
        nama_dosen_pa:    mahasiswa.nama_dosen_pa  || null,
        nip_dosen_pa:     mahasiswa.nip_dosen_pa   || null,
        foto_dosen_pa:    mahasiswa.foto_dosen_pa  || null
      };
    }
  }

  if (user.role === 'dosen') {
    const dosen = await profileRepository.getDosenProfile(user.id);
    if (dosen) {
      profileData = {
        kode_kelas: dosen.kode_kelas
      };
    }
  }

  return profileData;
};

// ================= VALIDATE KODE KELAS =================
exports.validateKodeKelas = async ({ kode_kelas }) => {

  if (!kode_kelas || typeof kode_kelas !== 'string' || !kode_kelas.trim()) {
    throw { status: 400, message: "kode_kelas wajib diisi" };
  }

  const dosen = await profileRepository.findDosenByKode(kode_kelas.trim());

  if (!dosen) {
    throw { status: 404, message: "Kode kelas tidak ditemukan atau tidak valid" };
  }

  const dosenUser = await userRepository.findById(dosen.user_id);

  return {
    message: "Kode kelas valid",
    data: {
      kode_kelas: kode_kelas.trim(),
      dosen_pa: dosenUser ? dosenUser.name : null
    }
  };
};


// ================= LOGIN (LANGSUNG TOKEN, TANPA OTP) =================
exports.login = async ({ email, password, ip }) => {

  if (!email || !password) {
    throw { status: 400, message: "Email dan password wajib diisi" };
  }

  const userIP = ip || 'unknown';
  await checkLoginLimit(userIP);

  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw { status: 401, message: "Email atau password salah" };
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw { status: 401, message: "Email atau password salah" };
  }

  if (!user.is_verified) {
    throw { status: 403, message: "Akun belum diverifikasi, silakan cek email untuk OTP" };
  }

  const profileData = await buildProfileData(user);

  const token = jwt.generateToken({
    id: user.id,
    role: user.role
  });

  return {
    token,
    role: user.role,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      npm_nip: user.npm_nip,
      profile_picture: user.profile_picture,
      ...profileData
    }
  };
};


// ================= REGISTER MAHASISWA =================
exports.registerMahasiswa = async (payload, file) => {

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    payload.role = 'mahasiswa';

    const { error } = validateRegister(payload);
    if (error) {
      throw { status: 400, message: error.details[0].message };
    }

    const {
      name,
      email,
      password,
      npm_nip,
      angkatan,
      kode_kelas,
      ipk,
      current_semester
    } = payload;

    if (!ipk || ipk < 0 || ipk > 4) {
      throw { status: 400, message: "IPK tidak valid" };
    }

    if (!current_semester || current_semester < 1) {
      throw { status: 400, message: "Semester tidak valid" };
    }

    const existingEmail = await userRepository.findByEmail(email);
    if (existingEmail) throw { status: 400, message: "Email sudah digunakan" };

    const existingNPM = await userRepository.findByNpm(npm_nip);
    if (existingNPM) throw { status: 400, message: "NPM sudah digunakan" };

    const hashedPassword = await bcrypt.hash(password, 10);

    let profilePictureUrl = null;
    if (file) {
      profilePictureUrl = await uploadProfilePicture(file, npm_nip);
    }

    const user = await userRepository.createUserTx(client, {
      name,
      email,
      password: hashedPassword,
      role: 'mahasiswa',
      npm_nip,
      profile_picture: profilePictureUrl
    });

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

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await otpRepository.createOTPTx(client, user.id, code, 'register', expiresAt);

    await client.query('COMMIT');

    await sendOTPEmail(email, code, 'register');

    return {
      message: "Registrasi mahasiswa berhasil, OTP telah dikirim ke email"
    };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};


// ================= REGISTER DOSEN =================
exports.registerDosen = async (payload, file) => {

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    payload.role = 'dosen';

    const { error } = validateRegister(payload);
    if (error) {
      throw { status: 400, message: error.details[0].message };
    }

    const { name, email, password, npm_nip } = payload;

    const existingEmail = await userRepository.findByEmail(email);
    if (existingEmail) throw { status: 400, message: "Email sudah digunakan" };

    const existingNIP = await userRepository.findByNpm(npm_nip);
    if (existingNIP) throw { status: 400, message: "NIP sudah digunakan" };

    const hashedPassword = await bcrypt.hash(password, 10);

    let profilePictureUrl = null;
    if (file) {
      profilePictureUrl = await uploadProfilePicture(file, npm_nip);
    }

    const user = await userRepository.createUserTx(client, {
      name,
      email,
      password: hashedPassword,
      role: 'dosen',
      npm_nip,
      profile_picture: profilePictureUrl
    });

    // kode_kelas di-generate setelah OTP sukses
    await profileRepository.createDosenTx(client, {
      user_id: user.id,
      kode_kelas: null
    });

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await otpRepository.createOTPTx(client, user.id, code, 'register', expiresAt);

    await client.query('COMMIT');

    await sendOTPEmail(email, code, 'register');

    return {
      message: "Registrasi dosen berhasil, OTP telah dikirim ke email"
    };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
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

  // Pakai helper yang sama dengan login — tidak ada duplikasi, field selalu konsisten
  const profileData = await buildProfileData(user);

  // Khusus dosen: generate kode_kelas setelah OTP sukses
  if (user.role === 'dosen') {
    let kodeKelas;
    let isUnique = false;
    while (!isUnique) {
      kodeKelas = 'DSN-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      const existing = await profileRepository.findDosenByKode(kodeKelas);
      if (!existing) isUnique = true;
    }
    await profileRepository.updateDosenKodeKelas(user.id, kodeKelas);
    profileData.kode_kelas = kodeKelas;
  }

  const token = jwt.generateToken({
    id: user.id,
    role: user.role
  });

  return {
    message: "Akun berhasil diverifikasi",
    token,
    role: user.role,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      npm_nip: user.npm_nip,
      profile_picture: user.profile_picture,
      ...profileData
    }
  };
};


// ================= RESEND OTP =================
exports.resendOTP = async ({ email, type }) => {

  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw { status: 404, message: "User tidak ditemukan" };
  }

  if (!['register', 'reset_password'].includes(type)) {
    throw { status: 400, message: "Type OTP tidak valid" };
  }

  await otpRepository.invalidateOTP(user.id, type);

  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await otpRepository.createOTP(user.id, code, type, expiresAt);

  await sendOTPEmail(user.email, code, type);

  return {
    message: "OTP berhasil dikirim ulang"
  };
};


// ================= FORGOT PASSWORD (kirim OTP reset) =================
exports.forgotPassword = async ({ email }) => {

  if (!email) {
    throw { status: 400, message: "Email wajib diisi" };
  }

  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw { status: 404, message: "Email tidak terdaftar" };
  }

  await otpRepository.invalidateOTP(user.id, 'reset_password');

  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await otpRepository.createOTP(user.id, code, 'reset_password', expiresAt);

  await sendOTPEmail(user.email, code, 'reset_password');

  return { message: "OTP berhasil dikirim ke email" };
};


// ================= VERIFY RESET OTP (step 2 — cek OTP saja, TIDAK markAsUsed) =================
exports.verifyResetOTP = async ({ email, code }) => {

  if (!email || !code) {
    throw { status: 400, message: "Email dan kode OTP wajib diisi" };
  }

  const user = await userRepository.findByEmail(email);
  if (!user) throw { status: 404, message: "User tidak ditemukan" };

  const otpData = await otpRepository.findOTPByUser(user.id, 'reset_password');

  if (!otpData || otpData.expires_at < new Date()) {
    throw { status: 400, message: "OTP tidak valid atau expired" };
  }

  const isValid = await compareOTP(code.trim(), otpData.code);
  if (!isValid) {
    throw { status: 400, message: "OTP tidak valid atau expired" };
  }

  // ⚠️ Sengaja TIDAK markAsUsed di sini — OTP masih dibutuhkan di /reset-password (step 3)
  return { message: "OTP valid, silakan masukkan password baru" };
};


// ================= RESET PASSWORD (verif OTP lalu set password baru) =================
exports.resetPassword = async ({ email, code, new_password }) => {

  if (!email || !code || !new_password) {
    throw { status: 400, message: "Email, OTP, dan password baru wajib diisi" };
  }

  if (new_password.length < 6) {
    throw { status: 400, message: "Password minimal 6 karakter" };
  }

  const user = await userRepository.findByEmail(email);
  if (!user) throw { status: 404, message: "User tidak ditemukan" };

  const otpData = await otpRepository.findOTPByUser(user.id, 'reset_password');

  if (!otpData || otpData.expires_at < new Date()) {
    throw { status: 400, message: "OTP tidak valid atau expired" };
  }

  const isValid = await compareOTP(code.trim(), otpData.code);
  if (!isValid) {
    throw { status: 400, message: "OTP tidak valid atau expired" };
  }

  await otpRepository.markAsUsed(otpData.id);

  const hashedPassword = await bcrypt.hash(new_password, 10);
  await userRepository.updatePassword(user.id, hashedPassword);

  return { message: "Password berhasil direset, silakan login" };
};


// ================= LOGOUT =================
exports.logout = async ({ token, exp }) => {

  // Hitung sisa TTL token (detik) agar blacklist otomatis bersih saat token expired
  const now = Math.floor(Date.now() / 1000);
  const ttl = exp - now;

  if (ttl > 0) {
    // Simpan token ke Redis dengan TTL = sisa masa aktif token
    await redis.set(`blacklist:${token}`, '1', 'EX', ttl);
  }

  return { message: "Logout berhasil" };
};
exports.changePassword = async ({ userId, old_password, new_password }) => {

  if (!old_password || !new_password) {
    throw { status: 400, message: "Password lama dan baru wajib diisi" };
  }

  if (new_password.length < 6) {
    throw { status: 400, message: "Password baru minimal 6 karakter" };
  }

  const user = await userRepository.findById(userId);
  if (!user) throw { status: 404, message: "User tidak ditemukan" };

  const isMatch = await bcrypt.compare(old_password, user.password);
  if (!isMatch) {
    throw { status: 400, message: "Password lama tidak sesuai" };
  }

  const hashedPassword = await bcrypt.hash(new_password, 10);
  await userRepository.updatePassword(userId, hashedPassword);

  return { message: "Password berhasil diubah" };
};
