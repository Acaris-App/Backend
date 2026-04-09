const express = require('express');
const router = express.Router();

const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const scheduleController = require('../controllers/schedule.controller');


// ================= DOSEN =================

// 📅 Get jadwal milik dosen (untuk kalender kelola jadwal)
// Query: ?month=4&year=2026
router.get('/my', authenticate, authorize('dosen'), scheduleController.getMySchedules);

// ➕ Tambah jadwal bimbingan
router.post('/', authenticate, authorize('dosen'), scheduleController.createSchedule);

// ✏️ Edit jadwal bimbingan
router.put('/:schedule_id', authenticate, authorize('dosen'), scheduleController.updateSchedule);

// 🗑️ Hapus jadwal bimbingan
router.delete('/:schedule_id', authenticate, authorize('dosen'), scheduleController.deleteSchedule);

// 👥 Lihat daftar mahasiswa yang booking (PBI-21)
// Query opsional: ?jadwal_id=5 untuk filter per jadwal
router.get('/bookings', authenticate, authorize('dosen'), scheduleController.getBookings);


// ================= MAHASISWA =================

// 📅 Get jadwal tersedia dosen PA (untuk kalender booking)
// Query: ?month=4&year=2026
router.get('/available', authenticate, authorize('mahasiswa'), scheduleController.getAvailableSchedules);

// 📌 Booking jadwal bimbingan
router.post('/book', authenticate, authorize('mahasiswa'), scheduleController.bookSchedule);


// ================= SHARED (Dosen & Mahasiswa) =================

// 🔍 Get detail satu jadwal
router.get('/:schedule_id', authenticate, scheduleController.getScheduleDetail);


module.exports = router;
