const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { uploadImage } = require('../config/multer');


// ================= PROFILE =================

// 1️⃣ Get profil lengkap (semua role, mahasiswa include documents)
router.get('/profile', authenticate, userController.getMe);

// 2️⃣ Update data diri — teks saja, JSON (semua role)
router.put('/profile', authenticate, userController.updateProfileText);

// 3️⃣ Update foto profil — multipart/form-data (semua role)
router.post('/profile/photo', authenticate, uploadImage.single('profile_picture'), userController.updateProfilePhoto);


// ================= ROLE ACCESS =================

// 👨‍🎓 Hanya mahasiswa
router.get('/mahasiswa', authenticate, authorize('mahasiswa'), (req, res) => {
  res.json({ status: "success", message: "Akses mahasiswa" });
});

// 👨‍🏫 Hanya dosen
router.get('/dosen', authenticate, authorize('dosen'), (req, res) => {
  res.json({ status: "success", message: "Akses dosen" });
});

// 👨‍💼 Hanya admin
router.get('/admin', authenticate, authorize('admin'), (req, res) => {
  res.json({ status: "success", message: "Akses admin" });
});

// 🔥 Multi-role
router.get('/dashboard', authenticate, authorize('admin', 'dosen'), (req, res) => {
  res.json({ status: "success", message: "Admin & Dosen bisa akses" });
});


module.exports = router;
