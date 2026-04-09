const scheduleRepository = require('../repositories/schedule.repository');
const profileRepository = require('../repositories/profile.repository');

// ================= HELPER: PASTIKAN DOSEN PUNYA PROFIL =================
const getDosenProfile = async (userId) => {
  const profile = await profileRepository.getDosenProfile(userId);
  if (!profile) throw { status: 404, message: "Profil dosen tidak ditemukan" };
  return profile;
};

// ================= GET JADWAL (Dosen — untuk kalender kelola jadwal) =================
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

// ================= GET JADWAL TERSEDIA (Mahasiswa — untuk kalender booking) =================
exports.getAvailableSchedules = async ({ user, query }) => {

  if (!user || user.role !== 'mahasiswa') {
    throw { status: 403, message: "Hanya mahasiswa yang dapat mengakses endpoint ini" };
  }

  // Mahasiswa hanya bisa lihat jadwal dosen PA-nya sendiri
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

  // Dosen hanya bisa lihat jadwal miliknya
  if (user.role === 'dosen' && schedule.dosen_id !== user.id) {
    throw { status: 403, message: "Akses ditolak" };
  }

  // Mahasiswa hanya bisa lihat jadwal dosen PA-nya
  if (user.role === 'mahasiswa') {
    const profile = await profileRepository.getMahasiswaProfile(user.id);
    if (!profile || profile.dosen_pa_id !== schedule.dosen_id) {
      throw { status: 403, message: "Akses ditolak" };
    }
  }

  return schedule;
};

// ================= TAMBAH JADWAL (Dosen) =================
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

  const schedule = await scheduleRepository.createSchedule({
    dosen_id: user.id,
    tanggal,
    waktu_mulai,
    waktu_selesai,
    kuota: kuotaInt,
    keterangan
  });

  return schedule;
};

// ================= EDIT JADWAL (Dosen) =================
exports.updateSchedule = async ({ user, scheduleId, body }) => {

  if (!user || user.role !== 'dosen') {
    throw { status: 403, message: "Hanya dosen yang dapat mengubah jadwal" };
  }

  const existing = await scheduleRepository.findById(scheduleId);
  if (!existing) throw { status: 404, message: "Jadwal tidak ditemukan" };

  if (existing.dosen_id !== user.id) {
    throw { status: 403, message: "Akses ditolak — bukan jadwal Anda" };
  }

  if (existing.status === 'penuh') {
    throw { status: 400, message: "Jadwal yang sudah penuh tidak dapat diedit" };
  }

  const { tanggal, waktu_mulai, waktu_selesai, kuota, keterangan } = body;

  if (!tanggal || !waktu_mulai || !waktu_selesai || !kuota) {
    throw { status: 400, message: "tanggal, waktu_mulai, waktu_selesai, dan kuota wajib diisi" };
  }

  const kuotaInt = parseInt(kuota);
  if (isNaN(kuotaInt) || kuotaInt < 1) {
    throw { status: 400, message: "Kuota minimal 1" };
  }

  // Kuota baru tidak boleh lebih kecil dari yang sudah terpakai
  const sudahTerpakai = existing.kuota - existing.kuota_tersisa;
  if (kuotaInt < sudahTerpakai) {
    throw {
      status: 400,
      message: `Kuota tidak boleh kurang dari jumlah booking yang sudah ada (${sudahTerpakai})`
    };
  }

  const updated = await scheduleRepository.updateSchedule(scheduleId, {
    tanggal,
    waktu_mulai,
    waktu_selesai,
    kuota: kuotaInt,
    keterangan
  });

  return updated;
};

// ================= HAPUS JADWAL (Dosen) =================
exports.deleteSchedule = async ({ user, scheduleId }) => {

  if (!user || user.role !== 'dosen') {
    throw { status: 403, message: "Hanya dosen yang dapat menghapus jadwal" };
  }

  const existing = await scheduleRepository.findById(scheduleId);
  if (!existing) throw { status: 404, message: "Jadwal tidak ditemukan" };

  if (existing.dosen_id !== user.id) {
    throw { status: 403, message: "Akses ditolak — bukan jadwal Anda" };
  }

  // Tidak boleh hapus jadwal yang sudah ada booking aktif
  const sudahTerpakai = existing.kuota - existing.kuota_tersisa;
  if (sudahTerpakai > 0) {
    throw {
      status: 400,
      message: `Jadwal tidak dapat dihapus karena sudah ada ${sudahTerpakai} mahasiswa yang booking`
    };
  }

  await scheduleRepository.deleteSchedule(scheduleId);

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

  // Pastikan hanya bisa booking jadwal dosen PA sendiri
  const profile = await profileRepository.getMahasiswaProfile(user.id);
  if (!profile || profile.dosen_pa_id !== schedule.dosen_id) {
    throw { status: 403, message: "Anda hanya dapat booking jadwal dosen PA Anda" };
  }

  if (schedule.status !== 'tersedia') {
    throw { status: 400, message: "Jadwal sudah penuh atau tidak tersedia" };
  }

  // Cek kuota real-time
  if (schedule.kuota_tersisa <= 0) {
    throw { status: 400, message: "Kuota jadwal sudah penuh" };
  }

  // Cek duplikat booking
  const duplikat = await scheduleRepository.findBookingByUserAndSchedule(user.id, jadwal_id);
  if (duplikat) {
    throw { status: 400, message: "Anda sudah melakukan booking untuk jadwal ini" };
  }

  // Buat booking
  const booking = await scheduleRepository.createBooking({
    mahasiswa_id: user.id,
    jadwal_id,
    catatan
  });

  // Kurangi kuota (atomic — WHERE kuota_tersisa > 0 sebagai safety net)
  const updatedSchedule = await scheduleRepository.decrementKuota(jadwal_id);
  if (!updatedSchedule) {
    throw { status: 400, message: "Kuota jadwal sudah penuh" };
  }

  return {
    booking_id: booking.id,
    jadwal_id: schedule.id,
    tanggal: schedule.tanggal,
    waktu_mulai: schedule.waktu_mulai,
    waktu_selesai: schedule.waktu_selesai,
    sisa_kuota: updatedSchedule.kuota_tersisa
  };
};

// ================= GET DAFTAR BOOKING (Dosen — pantau mahasiswa yang booking) =================
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
