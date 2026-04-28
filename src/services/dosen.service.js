const dosenRepository = require('../repositories/dosen.repository');
const documentRepository = require('../repositories/document.repository');

// ================= GET DAFTAR MAHASISWA BIMBINGAN =================
exports.getMahasiswaBimbingan = async ({ user }) => {
  if (!user || user.role !== 'dosen') {
    throw { status: 403, message: "Hanya dosen yang dapat mengakses endpoint ini" };
  }

  const rows = await dosenRepository.getMahasiswaBimbingan(user.id);

  return rows.map(r => ({
    id:              r.id,
    name:            r.name,
    npm_nip:         r.npm_nip,
    profile_picture: r.profile_picture || null,
    angkatan:        r.angkatan,
    current_semester: r.current_semester
  }));
};

// ================= GET DETAIL & DOKUMEN MAHASISWA =================
exports.getMahasiswaDetail = async ({ user, mahasiswaId }) => {
  if (!user || user.role !== 'dosen') {
    throw { status: 403, message: "Hanya dosen yang dapat mengakses endpoint ini" };
  }

  const mahasiswa = await dosenRepository.getMahasiswaDetail(mahasiswaId, user.id);

  if (!mahasiswa) {
    throw { status: 404, message: "Mahasiswa tidak ditemukan atau bukan bimbingan Anda" };
  }

  const docs = await documentRepository.getDocumentsList(mahasiswaId);

  const documents = docs.map(d => ({
    id:            d.id,
    document_type: d.document_type,
    semester:      d.semester === 0 ? null : d.semester,
    file_path:     d.file_path,
    uploaded_at:   d.uploaded_at
  }));

  return {
    id:              mahasiswa.id,
    name:            mahasiswa.name,
    npm_nip:         mahasiswa.npm_nip,
    email:           mahasiswa.email,
    profile_picture: mahasiswa.profile_picture || null,
    angkatan:        mahasiswa.angkatan,
    ipk:             mahasiswa.ipk !== null ? String(parseFloat(mahasiswa.ipk).toFixed(2)) : null,
    current_semester: mahasiswa.current_semester,
    kode_kelas:      mahasiswa.kode_kelas || null,
    documents
  };
};

// ================= GET RIWAYAT BIMBINGAN MAHASISWA =================
exports.getRiwayatBimbingan = async ({ user, mahasiswaId }) => {
  if (!user || user.role !== 'dosen') {
    throw { status: 403, message: "Hanya dosen yang dapat mengakses endpoint ini" };
  }

  // Pastikan mahasiswa ini memang bimbingan dosen yang login
  const mahasiswa = await dosenRepository.getMahasiswaDetail(mahasiswaId, user.id);
  if (!mahasiswa) {
    throw { status: 404, message: "Mahasiswa tidak ditemukan atau bukan bimbingan Anda" };
  }

  const rows = await dosenRepository.getRiwayatBimbingan(mahasiswaId, user.id);

  return rows.map(row => {
    const tanggal = new Date(row.tanggal);
    const now = new Date().setHours(0, 0, 0, 0);

    let status;
    if (row.booking_status === 'dibatalkan') {
      status = 'dibatalkan';
    } else if (tanggal < now) {
      status = 'selesai';
    } else {
      status = 'menunggu';
    }

    // Format time: "09:00 - 10:00"
    const time = `${row.waktu_mulai.slice(0, 5)} - ${row.waktu_selesai.slice(0, 5)}`;

    return {
      id:               row.booking_id,
      date:             row.tanggal,
      time,
      agenda:           row.agenda || null,
      status,
      keterangan_dosen: row.keterangan || ""
    };
  });
};

// ================= UPDATE KETERANGAN DOSEN =================
exports.updateKeteranganDosen = async ({ user, bookingId, body }) => {
  if (!user || user.role !== 'dosen') {
    throw { status: 403, message: "Hanya dosen yang dapat mengakses endpoint ini" };
  }

  const { keterangan } = body;

  if (keterangan === undefined) {
    throw { status: 400, message: "keterangan wajib diisi" };
  }

  const updated = await dosenRepository.updateKeteranganDosen(bookingId, user.id, keterangan);

  if (!updated) {
    throw { status: 404, message: "Booking tidak ditemukan atau bukan jadwal Anda" };
  }

  return { message: "Keterangan berhasil diperbarui" };
};
