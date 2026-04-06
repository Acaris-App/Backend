const express = require('express');
const router = express.Router();

const profileRepository = require('../repositories/profile.repository');

const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');


// 🔐 Hanya user login
router.get('/me', authenticate, async (req, res) => {

  const user = req.user;

  let profile = null;

  if (user.role === 'mahasiswa') {
    profile = await profileRepository.getMahasiswaProfile(user.id);
  }

  if (user.role === 'dosen') {
    profile = await profileRepository.getDosenProfile(user.id);
  }

  res.json({
    status: "success",
    data: {
      user,
      profile
    }
  });
});


// 👨‍🎓 Hanya mahasiswa
router.get('/mahasiswa', authenticate, authorize('mahasiswa'), (req, res) => {
  res.json({
    status: "success",
    message: "Akses mahasiswa"
  });
});


// 👨‍🏫 Hanya dosen
router.get('/dosen', authenticate, authorize('dosen'), (req, res) => {
  res.json({
    status: "success",
    message: "Akses dosen"
  });
});


// 👨‍💼 Hanya admin
router.get('/admin', authenticate, authorize('admin'), (req, res) => {
  res.json({
    status: "success",
    message: "Akses admin"
  });
});


// 🔥 Multi-role
router.get('/dashboard', authenticate, authorize('admin', 'dosen'), (req, res) => {
  res.json({
    status: "success",
    message: "Admin & Dosen bisa akses"
  });
});

module.exports = router;