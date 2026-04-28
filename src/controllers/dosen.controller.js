const dosenService = require('../services/dosen.service');

// ================= GET DAFTAR MAHASISWA BIMBINGAN =================
exports.getMahasiswaBimbingan = async (req, res, next) => {
  try {
    const result = await dosenService.getMahasiswaBimbingan({ user: req.user });

    res.json({
      success: true,
      message: "Berhasil mengambil daftar mahasiswa bimbingan",
      data: result
    });
  } catch (err) { next(err); }
};

// ================= GET DETAIL & DOKUMEN MAHASISWA =================
exports.getMahasiswaDetail = async (req, res, next) => {
  try {
    const result = await dosenService.getMahasiswaDetail({
      user: req.user,
      mahasiswaId: req.params.mahasiswaId
    });

    res.json({
      success: true,
      message: "Berhasil mengambil detail mahasiswa",
      data: result
    });
  } catch (err) { next(err); }
};

// ================= GET RIWAYAT BIMBINGAN MAHASISWA =================
exports.getRiwayatBimbingan = async (req, res, next) => {
  try {
    const result = await dosenService.getRiwayatBimbingan({
      user: req.user,
      mahasiswaId: req.params.mahasiswaId
    });

    res.json({
      success: true,
      message: "Berhasil mengambil riwayat bimbingan mahasiswa",
      data: result
    });
  } catch (err) { next(err); }
};

// ================= UPDATE KETERANGAN DOSEN =================
exports.updateKeteranganDosen = async (req, res, next) => {
  try {
    const result = await dosenService.updateKeteranganDosen({
      user: req.user,
      bookingId: req.params.bookingId,
      body: req.body
    });

    res.json({
      success: true,
      message: result.message,
      data: null
    });
  } catch (err) { next(err); }
};
