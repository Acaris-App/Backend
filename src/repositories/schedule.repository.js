const db = require('../config/db');

// ================= GET ALL JADWAL (by dosen_id, untuk kalender) =================
exports.getSchedulesByDosen = async (dosenId, filters = {}) => {
  const conditions = ['s.dosen_id = $1'];
  const values = [dosenId];
  let idx = 2;

  if (filters.month && filters.year) {
    conditions.push(`EXTRACT(MONTH FROM s.tanggal) = $${idx++}`);
    values.push(parseInt(filters.month));
    conditions.push(`EXTRACT(YEAR FROM s.tanggal) = $${idx++}`);
    values.push(parseInt(filters.year));
  }

  const where = conditions.join(' AND ');

  const result = await db.query(
    `SELECT s.id, s.tanggal, s.waktu_mulai, s.waktu_selesai,
            s.kuota, s.kuota_tersisa, s.keterangan, s.status,
            s.created_at
     FROM jadwal_bimbingan s
     WHERE ${where}
     ORDER BY s.tanggal ASC, s.waktu_mulai ASC`,
    values
  );

  return result.rows;
};

// ================= GET JADWAL TERSEDIA (untuk mahasiswa booking) =================
exports.getAvailableSchedules = async (dosenId, filters = {}) => {
  const conditions = [
    's.dosen_id = $1',
    "s.status = 'tersedia'",
    's.kuota_tersisa > 0',
    's.tanggal >= CURRENT_DATE'
  ];
  const values = [dosenId];
  let idx = 2;

  if (filters.month && filters.year) {
    conditions.push(`EXTRACT(MONTH FROM s.tanggal) = $${idx++}`);
    values.push(parseInt(filters.month));
    conditions.push(`EXTRACT(YEAR FROM s.tanggal) = $${idx++}`);
    values.push(parseInt(filters.year));
  }

  const where = conditions.join(' AND ');

  const result = await db.query(
    `SELECT s.id, s.tanggal, s.waktu_mulai, s.waktu_selesai,
            s.kuota, s.kuota_tersisa, s.keterangan, s.status
     FROM jadwal_bimbingan s
     WHERE ${where}
     ORDER BY s.tanggal ASC, s.waktu_mulai ASC`,
    values
  );

  return result.rows;
};

// ================= GET DETAIL JADWAL =================
exports.findById = async (scheduleId) => {
  const result = await db.query(
    `SELECT s.id, s.dosen_id, s.tanggal, s.waktu_mulai, s.waktu_selesai,
            s.kuota, s.kuota_tersisa, s.keterangan, s.status, s.created_at
     FROM jadwal_bimbingan s
     WHERE s.id = $1`,
    [scheduleId]
  );

  return result.rows[0];
};

// ================= CREATE JADWAL =================
exports.createSchedule = async (data) => {
  const result = await db.query(
    `INSERT INTO jadwal_bimbingan
      (dosen_id, tanggal, waktu_mulai, waktu_selesai, kuota, kuota_tersisa, keterangan, status)
     VALUES ($1, $2, $3, $4, $5, $5, $6, 'tersedia')
     RETURNING *`,
    [
      data.dosen_id,
      data.tanggal,
      data.waktu_mulai,
      data.waktu_selesai,
      data.kuota,
      data.keterangan || null
    ]
  );

  return result.rows[0];
};

// ================= UPDATE JADWAL =================
exports.updateSchedule = async (scheduleId, data) => {
  const result = await db.query(
    `UPDATE jadwal_bimbingan
     SET tanggal       = $1,
         waktu_mulai   = $2,
         waktu_selesai = $3,
         kuota         = $4,
         keterangan    = $5,
         updated_at    = NOW()
     WHERE id = $6
     RETURNING *`,
    [
      data.tanggal,
      data.waktu_mulai,
      data.waktu_selesai,
      data.kuota,
      data.keterangan || null,
      scheduleId
    ]
  );

  return result.rows[0];
};

// ================= DELETE JADWAL =================
exports.deleteSchedule = async (scheduleId) => {
  const result = await db.query(
    `DELETE FROM jadwal_bimbingan WHERE id = $1 RETURNING *`,
    [scheduleId]
  );

  return result.rows[0];
};

// ================= CEK BOOKING DUPLIKAT =================
exports.findBookingByUserAndSchedule = async (userId, scheduleId) => {
  const result = await db.query(
    `SELECT * FROM booking_bimbingan
     WHERE mahasiswa_id = $1 AND jadwal_id = $2 AND status != 'dibatalkan'`,
    [userId, scheduleId]
  );

  return result.rows[0];
};

// ================= BOOKING =================
exports.createBooking = async (data) => {
  const result = await db.query(
    `INSERT INTO booking_bimbingan (mahasiswa_id, jadwal_id, catatan, status)
     VALUES ($1, $2, $3, 'menunggu')
     RETURNING *`,
    [data.mahasiswa_id, data.jadwal_id, data.catatan || null]
  );

  return result.rows[0];
};

// ================= KURANGI KUOTA =================
exports.decrementKuota = async (scheduleId) => {
  const result = await db.query(
    `UPDATE jadwal_bimbingan
     SET kuota_tersisa = kuota_tersisa - 1,
         status = CASE WHEN kuota_tersisa - 1 <= 0 THEN 'penuh' ELSE status END,
         updated_at = NOW()
     WHERE id = $1 AND kuota_tersisa > 0
     RETURNING *`,
    [scheduleId]
  );

  return result.rows[0];
};

// ================= GET BOOKING BY DOSEN (daftar mahasiswa yang booking) =================
exports.getBookingsByDosen = async (dosenId, scheduleId = null) => {
  const conditions = ['j.dosen_id = $1', "b.status != 'dibatalkan'"];
  const values = [dosenId];
  let idx = 2;

  if (scheduleId) {
    conditions.push(`b.jadwal_id = $${idx++}`);
    values.push(scheduleId);
  }

  const where = conditions.join(' AND ');

  const result = await db.query(
    `SELECT b.id AS booking_id, b.status AS booking_status, b.catatan,
            b.created_at AS booked_at,
            u.name AS mahasiswa_name, u.npm_nip,
            j.tanggal, j.waktu_mulai, j.waktu_selesai
     FROM booking_bimbingan b
     JOIN jadwal_bimbingan j ON b.jadwal_id = j.id
     JOIN users u ON b.mahasiswa_id = u.id
     WHERE ${where}
     ORDER BY j.tanggal ASC, j.waktu_mulai ASC`,
    values
  );

  return result.rows;
};
