const db = require('../config/db');

exports.getMahasiswaProfile = async (userId) => {
  const result = await db.query(`
    SELECT m.angkatan, m.ipk, m.current_semester, m.dosen_pa_id,
           u.name AS nama_dosen_pa,
           u.npm_nip AS nip_dosen_pa,
           u.profile_picture AS foto_dosen_pa
    FROM mahasiswa m
    LEFT JOIN dosen_pa dp ON m.dosen_pa_id = dp.user_id
    LEFT JOIN users u ON dp.user_id = u.id
    WHERE m.user_id = $1
  `, [userId]);

  return result.rows[0];
};

exports.getDosenProfile = async (userId) => {
  const result = await db.query(`
    SELECT kode_kelas
    FROM dosen_pa
    WHERE user_id = $1
  `, [userId]);

  return result.rows[0];
};

exports.findDosenByKode = async (kode_kelas) => {
  const result = await db.query(
    `SELECT * FROM dosen_pa WHERE kode_kelas = $1`,
    [kode_kelas]
  );

  return result.rows[0];
};

exports.createMahasiswaTx = async (client, data) => {
  await client.query(
    `INSERT INTO mahasiswa 
    (user_id, angkatan, ipk, current_semester, dosen_pa_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      data.user_id,
      data.angkatan,
      data.ipk,
      data.current_semester,
      data.dosen_pa_id
    ]
  );
};

exports.createDosenTx = async (client, data) => {
  await client.query(
    `INSERT INTO dosen_pa (user_id, kode_kelas)
     VALUES ($1, $2)`,
    [data.user_id, data.kode_kelas]
  );
};

exports.updateDosenKodeKelas = async (userId, kodeKelas) => {
  await db.query(
    `UPDATE dosen_pa SET kode_kelas = $1 WHERE user_id = $2`,
    [kodeKelas, userId]
  );
};

exports.updateSemester = async (userId, semester) => {
  await db.query(
    `UPDATE mahasiswa 
     SET current_semester = $1, updated_at = NOW()
     WHERE user_id = $2`,
    [semester, userId]
  );
};