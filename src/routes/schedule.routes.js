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

// 📋 Riwayat booking milik mahasiswa
router.get('/my-bookings', authenticate, authorize('mahasiswa'), scheduleController.getMyBookings);

// ❌ Batalkan booking (mahasiswa batalkan miliknya, dosen batalkan di jadwalnya)
router.patch('/bookings/:booking_id/cancel', authenticate, authorize('mahasiswa', 'dosen'), scheduleController.cancelBooking);


// ================= MAHASISWA (prefix /mahasiswa/) =================

// GET /schedule/mahasiswa/monthly?year=2026&month=4
// Status per slot: "Tersedia", "Penuh", atau "Di-booking"
router.get('/mahasiswa/monthly', authenticate, authorize('mahasiswa'), scheduleController.getMahasiswaMonthly);

// GET /schedule/mahasiswa/daily?date=2026-04-22
// Tiap slot ada booking_id dan mahasiswa_agenda jika sudah booking
router.get('/mahasiswa/daily', authenticate, authorize('mahasiswa'), scheduleController.getMahasiswaDaily);

// POST /schedule/mahasiswa/book — body: { schedule_id, agenda }
// Validasi: 1 slot per hari per mahasiswa
router.post('/mahasiswa/book', authenticate, authorize('mahasiswa'), scheduleController.mahasiswaBookSchedule);

// GET /schedule/mahasiswa/bookings/history — jadwal lewat + dibatalkan
router.get('/mahasiswa/bookings/history', authenticate, authorize('mahasiswa'), scheduleController.getMahasiswaBookingHistory);


// ================= SHARED (Dosen & Mahasiswa) =================

// GET /schedule/monthly?year=2026&month=4
// Dosen: semua tanggal yang ada jadwal + jumlah slot
// Mahasiswa: hanya tanggal yang masih ada slot tersedia
router.get('/monthly',
  authenticate,
  (req, res, next) => {
    if (req.user.role === 'dosen') return scheduleController.getMonthlySchedulesDosen(req, res, next);
    if (req.user.role === 'mahasiswa') return scheduleController.getMonthlySchedulesMahasiswa(req, res, next);
    res.status(403).json({ status: "error", message: "Akses ditolak" });
  }
);

// GET /schedule/daily?date=2026-04-17
// Dosen: semua slot + daftar mahasiswa yang booking per slot
// Mahasiswa: semua slot tanpa data booking orang lain
router.get('/daily',
  authenticate,
  (req, res, next) => {
    if (req.user.role === 'dosen') return scheduleController.getDailySchedulesDosen(req, res, next);
    if (req.user.role === 'mahasiswa') return scheduleController.getDailySchedulesMahasiswa(req, res, next);
    res.status(403).json({ status: "error", message: "Akses ditolak" });
  }
);

// Get detail satu jadwal
router.get('/:schedule_id', authenticate, scheduleController.getScheduleDetail);


module.exports = router;
