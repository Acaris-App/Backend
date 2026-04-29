const db = require('../config/db');

// ================= GET DAFTAR MAHASISWA BIMBINGAN =================
exports.getMahasiswaBimbingan = async (dosenId) => {
  const result = await db.query(
    `SELECT u.id, u.name, u.npm_nip, u.profile_picture,
            m.angkatan, m.current_semester
     FROM mahasiswa m
     JOIN users u ON m.user_id = u.id
     WHERE m.dosen_pa_id = $1
       AND u.is_verified = true
     ORDER BY u.name ASC`,
    [dosenId]
  );
  return result.rows;
};

// ================= GET DETAIL MAHASISWA =================
exports.getMahasiswaDetail = async (mahasiswaId, dosenId) => {
  const result = await db.query(
    `SELECT u.id, u.name, u.npm_nip, u.email, u.profile_picture,
            m.angkatan, m.ipk, m.current_semester, m.dosen_pa_id,
            dp.kode_kelas
     FROM mahasiswa m
     JOIN users u ON m.user_id = u.id
     LEFT JOIN dosen_pa dp ON dp.user_id = m.dosen_pa_id
     WHERE m.user_id = $1
       AND m.dosen_pa_id = $2`,
    [mahasiswaId, dosenId]
  );
  return result.rows[0];
};

// ================= GET RIWAYAT BIMBINGAN MAHASISWA =================
exports.getRiwayatBimbingan = async (mahasiswaId, dosenId) => {
  const result = await db.query(
    `SELECT b.id AS booking_id,
            j.tanggal, j.waktu_mulai, j.waktu_selesai,
            b.catatan AS agenda,
            b.status AS booking_status
     FROM booking_bimbingan b
     JOIN jadwal_bimbingan j ON b.jadwal_id = j.id
     WHERE b.mahasiswa_id = $1
       AND j.dosen_id = $2
     ORDER BY j.tanggal DESC, j.waktu_mulai DESC`,
    [mahasiswaId, dosenId]
  );
  return result.rows;
};

// ================= UPDATE KETERANGAN DOSEN =================
exports.updateKeteranganDosen = async (bookingId, dosenId, keterangan) => {
  const result = await db.query(
    `UPDATE booking_bimbingan b
     SET keterangan = $1
     FROM jadwal_bimbingan j
     WHERE b.jadwal_id = j.id
       AND b.id = $2
       AND j.dosen_id = $3
     RETURNING b.*`,
    [keterangan, bookingId, dosenId]
  );
  return result.rows[0];
};
