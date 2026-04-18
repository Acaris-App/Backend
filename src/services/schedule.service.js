const scheduleRepository = require('../repositories/schedule.repository');
const profileRepository = require('../repositories/profile.repository');

// ================= GET JADWAL (Dosen) =================
exports.getMySchedules = async ({ user, query }) => {
  if (!user || user.role !== 'dosen') {
    throw { status: 403, message: "Hanya dosen yang dapat mengakses jadwal ini" };
  }

  const schedules = await scheduleRepository.getSchedulesByDosen(user.id, {
    month: query.month,
    year: query.year
  });

  return { total: schedules.length, schedules };
};

// ================= GET JADWAL TERSEDIA (Mahasiswa) =================
exports.getAvailableSchedules = async ({ user, query }) => {
  if (!user || user.role !== 'mahasiswa') {
    throw { status: 403, message: "Hanya mahasiswa yang dapat mengakses endpoint ini" };
  }

  const profile = await profileRepository.getMahasiswaProfile(user.id);
  if (!profile) throw { status: 404, message: "Profil mahasiswa tidak ditemukan" };

  const schedules = await scheduleRepository.getAvailableSchedules(profile.dosen_pa_id, {
    month: query.month,
    year: query.year
  });

  return { total: schedules.length, schedules };
};

// ================= GET DETAIL JADWAL =================
exports.getScheduleDetail = async ({ user, scheduleId }) => {
  const schedule = await scheduleRepository.findById(scheduleId);
  if (!schedule) throw { status: 404, message: "Jadwal tidak ditemukan" };

  if (user.role === 'dosen' && schedule.dosen_id !== user.id) {
    throw { status: 403, message: "Akses ditolak" };
  }

  if (user.role === 'mahasiswa') {
    const profile = await profileRepository.getMahasiswaProfile(user.id);
    if (!profile || profile.dosen_pa_id !== schedule.dosen_id) {
      throw { status: 403, message: "Akses ditolak" };
    }
  }

  return schedule;
};

// ================= TAMBAH JADWAL =================
exports.createSchedule = async ({ user, body }) => {
  if (!user || user.role !== 'dosen') {
    throw { status: 403, message: "Hanya dosen yang dapat membuat jadwal" };
  }

  const { tanggal, waktu_mulai, waktu_selesai, kuota, keterangan } = body;

  if (!tanggal || !waktu_mulai || !waktu_selesai || !kuota) {
    throw { status: 400, message: "tanggal, waktu_mulai, waktu_selesai, dan kuota wajib diisi" };
  }

  if (isNaN(Date.parse(tanggal))) {
    throw { status: 400, message: "Format tanggal tidak valid (gunakan YYYY-MM-DD)" };
  }

  if (new Date(tanggal) < new Date().setHours(0, 0, 0, 0)) {
    throw { status: 400, message: "Tanggal jadwal tidak boleh di masa lalu" };
  }

  const kuotaInt = parseInt(kuota);
  if (isNaN(kuotaInt) || kuotaInt < 1) {
    throw { status: 400, message: "Kuota minimal 1" };
  }

  return await scheduleRepository.createSchedule({
    dosen_id: user.id,
    tanggal,
    waktu_mulai,
    waktu_selesai,
    kuota: kuotaInt,
    keterangan
  });
};

// ================= ✅ EDIT JADWAL (pakai countActiveBookings sebagai sumber kebenaran) =================
exports.updateSchedule = async ({ user, scheduleId, body }) => {
  if (!user || user.role !== 'dosen') {
    throw { status: 403, message: "Hanya dosen yang dapat mengubah jadwal" };
  }

  const existing = await scheduleRepository.findById(scheduleId);
  if (!existing) throw { status: 404, message: "Jadwal tidak ditemukan" };

  if (existing.dosen_id !== user.id) {
    throw { status: 403, message: "Akses ditolak — bukan jadwal Anda" };
  }

  const { tanggal, waktu_mulai, waktu_selesai, kuota, keterangan } = body;

  if (!tanggal || !waktu_mulai || !waktu_selesai || !kuota) {
    throw { status: 400, message: "tanggal, waktu_mulai, waktu_selesai, dan kuota wajib diisi" };
  }

  const kuotaInt = parseInt(kuota);
  if (isNaN(kuotaInt) || kuotaInt < 1) {
    throw { status: 400, message: "Kuota minimal 1" };
  }

  // ✅ Hitung booking aktif langsung dari DB — bukan dari kuota - kuota_tersisa
  const bookingAktif = await scheduleRepository.countActiveBookings(scheduleId);

  if (kuotaInt < bookingAktif) {
    throw {
      status: 400,
      message: `Kuota tidak boleh kurang dari jumlah mahasiswa yang sudah booking (${bookingAktif})`
    };
  }

  // ✅ Kirim bookingAktif ke repository agar kuota_tersisa dihitung ulang dengan benar
  return await scheduleRepository.updateSchedule(scheduleId, {
    tanggal,
    waktu_mulai,
    waktu_selesai,
    kuota: kuotaInt,
    bookingAktif,
    keterangan
  });
};

// ================= ✅ HAPUS JADWAL (cek dari DB, hapus booking dulu via transaksi) =================
exports.deleteSchedule = async ({ user, scheduleId }) => {
  if (!user || user.role !== 'dosen') {
    throw { status: 403, message: "Hanya dosen yang dapat menghapus jadwal" };
  }

  const existing = await scheduleRepository.findById(scheduleId);
  if (!existing) throw { status: 404, message: "Jadwal tidak ditemukan" };

  if (existing.dosen_id !== user.id) {
    throw { status: 403, message: "Akses ditolak — bukan jadwal Anda" };
  }

  // ✅ Hitung dari DB langsung — tidak percaya kolom kuota_tersisa
  const bookingAktif = await scheduleRepository.countActiveBookings(scheduleId);

  if (bookingAktif > 0) {
    throw {
      status: 400,
      message: `Jadwal tidak dapat dihapus karena sudah ada ${bookingAktif} mahasiswa yang booking`
    };
  }

  // ✅ Hapus dalam transaksi: booking dulu baru jadwal (avoid FK violation)
  await scheduleRepository.deleteScheduleWithBookings(scheduleId);

  return { message: "Jadwal berhasil dihapus" };
};

// ================= BOOKING JADWAL (Mahasiswa) =================
exports.bookSchedule = async ({ user, body }) => {
  if (!user || user.role !== 'mahasiswa') {
    throw { status: 403, message: "Hanya mahasiswa yang dapat booking jadwal" };
  }

  const { jadwal_id, catatan } = body;

  if (!jadwal_id) {
    throw { status: 400, message: "jadwal_id wajib diisi" };
  }

  const schedule = await scheduleRepository.findById(jadwal_id);
  if (!schedule) throw { status: 404, message: "Jadwal tidak ditemukan" };

  const profile = await profileRepository.getMahasiswaProfile(user.id);
  if (!profile || profile.dosen_pa_id !== schedule.dosen_id) {
    throw { status: 403, message: "Anda hanya dapat booking jadwal dosen PA Anda" };
  }

  if (schedule.status !== 'tersedia') {
    throw { status: 400, message: "Jadwal sudah penuh atau tidak tersedia" };
  }

  if (schedule.kuota_tersisa <= 0) {
    throw { status: 400, message: "Kuota jadwal sudah penuh" };
  }

  const duplikat = await scheduleRepository.findBookingByUserAndSchedule(user.id, jadwal_id);
  if (duplikat) {
    throw { status: 400, message: "Anda sudah melakukan booking untuk jadwal ini" };
  }

  // ✅ Status langsung 'terkonfirmasi'
  const booking = await scheduleRepository.createBooking({
    mahasiswa_id: user.id,
    jadwal_id,
    catatan
  });

  const updatedSchedule = await scheduleRepository.decrementKuota(jadwal_id);
  if (!updatedSchedule) {
    throw { status: 400, message: "Kuota jadwal sudah penuh" };
  }

  return {
    booking_id:   booking.id,
    jadwal_id:    schedule.id,
    tanggal:      schedule.tanggal,
    waktu_mulai:  schedule.waktu_mulai,
    waktu_selesai: schedule.waktu_selesai,
    status:       booking.status,
    sisa_kuota:   updatedSchedule.kuota_tersisa
  };
};

// ================= ✅ BATALKAN BOOKING — kuota dikembalikan =================
exports.cancelBooking = async ({ user, bookingId }) => {

  const booking = await scheduleRepository.findBookingById(bookingId);
  if (!booking) throw { status: 404, message: "Booking tidak ditemukan" };

  // Mahasiswa hanya bisa batalkan booking miliknya sendiri
  if (user.role === 'mahasiswa' && booking.mahasiswa_id !== user.id) {
    throw { status: 403, message: "Akses ditolak" };
  }

  // Dosen hanya bisa batalkan booking di jadwalnya sendiri
  if (user.role === 'dosen' && booking.dosen_id !== user.id) {
    throw { status: 403, message: "Akses ditolak" };
  }

  if (booking.status === 'dibatalkan') {
    throw { status: 400, message: "Booking sudah dibatalkan sebelumnya" };
  }

  await scheduleRepository.updateBookingStatus(bookingId, 'dibatalkan');

  // ✅ Kembalikan kuota_tersisa + set status jadwal kembali 'tersedia'
  await scheduleRepository.incrementKuota(booking.jadwal_id);

  return { message: "Booking berhasil dibatalkan, kuota jadwal telah dikembalikan" };
};

// ================= GET DAFTAR BOOKING (Dosen) =================
exports.getBookings = async ({ user, query }) => {
  if (!user || user.role !== 'dosen') {
    throw { status: 403, message: "Hanya dosen yang dapat melihat daftar booking" };
  }

  const bookings = await scheduleRepository.getBookingsByDosen(
    user.id,
    query.jadwal_id || null
  );

  return { total: bookings.length, bookings };
};

// ================= ✅ GET BOOKING MILIK MAHASISWA =================
exports.getMyBookings = async ({ user }) => {
  if (!user || user.role !== 'mahasiswa') {
    throw { status: 403, message: "Hanya mahasiswa yang dapat mengakses ini" };
  }

  const bookings = await scheduleRepository.getBookingsByMahasiswa(user.id);

  return { total: bookings.length, bookings };
};

// ================= GET MONTHLY DATES (Dosen) =================
exports.getMonthlySchedulesDosen = async ({ user, query }) => {
  if (!user || user.role !== 'dosen') {
    throw { status: 403, message: "Hanya dosen yang dapat mengakses endpoint ini" };
  }

  const { year, month } = query;

  if (!year || !month) {
    throw { status: 400, message: "year dan month wajib diisi" };
  }

  const dates = await scheduleRepository.getMonthlyDates(user.id, year, month, false);

  return {
    year: parseInt(year),
    month: parseInt(month),
    total_tanggal: dates.length,
    dates
  };
};

// ================= GET MONTHLY DATES (Mahasiswa) =================
exports.getMonthlySchedulesMahasiswa = async ({ user, query }) => {
  if (!user || user.role !== 'mahasiswa') {
    throw { status: 403, message: "Hanya mahasiswa yang dapat mengakses endpoint ini" };
  }

  const { year, month } = query;

  if (!year || !month) {
    throw { status: 400, message: "year dan month wajib diisi" };
  }

  const profile = await profileRepository.getMahasiswaProfile(user.id);
  if (!profile) throw { status: 404, message: "Profil mahasiswa tidak ditemukan" };

  // Mahasiswa hanya lihat tanggal yang masih ada slot tersedia
  const dates = await scheduleRepository.getMonthlyDates(profile.dosen_pa_id, year, month, true);

  return {
    year: parseInt(year),
    month: parseInt(month),
    total_tanggal: dates.length,
    dates
  };
};

// ================= GET DAILY SLOTS (Dosen) =================
exports.getDailySchedulesDosen = async ({ user, query }) => {
  if (!user || user.role !== 'dosen') {
    throw { status: 403, message: "Hanya dosen yang dapat mengakses endpoint ini" };
  }

  const { date } = query;

  if (!date) {
    throw { status: 400, message: "date wajib diisi (format: YYYY-MM-DD)" };
  }

  if (isNaN(Date.parse(date))) {
    throw { status: 400, message: "Format date tidak valid (gunakan YYYY-MM-DD)" };
  }

  // Dosen dapat melihat semua slot + daftar mahasiswa yang booking
  const slots = await scheduleRepository.getDailySlots(user.id, date, true);

  return {
    date,
    total_slot: slots.length,
    slots
  };
};

// ================= GET DAILY SLOTS (Mahasiswa) =================
exports.getDailySchedulesMahasiswa = async ({ user, query }) => {
  if (!user || user.role !== 'mahasiswa') {
    throw { status: 403, message: "Hanya mahasiswa yang dapat mengakses endpoint ini" };
  }

  const { date } = query;

  if (!date) {
    throw { status: 400, message: "date wajib diisi (format: YYYY-MM-DD)" };
  }

  if (isNaN(Date.parse(date))) {
    throw { status: 400, message: "Format date tidak valid (gunakan YYYY-MM-DD)" };
  }

  const profile = await profileRepository.getMahasiswaProfile(user.id);
  if (!profile) throw { status: 404, message: "Profil mahasiswa tidak ditemukan" };

  // Mahasiswa tidak dapat melihat daftar booking mahasiswa lain
  const slots = await scheduleRepository.getDailySlots(profile.dosen_pa_id, date, false);

  return {
    date,
    total_slot: slots.length,
    slots
  };
};
