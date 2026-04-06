const fs = require('fs');
const path = require('path');

const documentRepository = require('../repositories/document.repository');
const profileRepository = require('../repositories/profile.repository');

exports.uploadDocument = async ({ user, body, file }) => {

  try {

    // ================= BASIC =================
    if (!file) {
      throw { status: 400, message: "File wajib diupload" };
    }

    if (!user || user.role !== 'mahasiswa') {
      throw { status: 403, message: "Hanya mahasiswa yang dapat upload dokumen" };
    }

    const { document_type, semester } = body;

    const allowedTypes = ['krs', 'khs', 'transkrip'];

    if (!allowedTypes.includes(document_type)) {
      throw { status: 400, message: "document_type tidak valid" };
    }

    // ================= PROFILE =================
    const profile = await profileRepository.getMahasiswaProfile(user.id);

    if (!profile) {
      throw { status: 404, message: "Profile mahasiswa tidak ditemukan" };
    }

    const currentSemester = profile.current_semester;

    // ================= PARSE SEMESTER =================
    let semesterInt = null;

    if (document_type !== 'transkrip') {

      if (!semester) {
        throw { status: 400, message: "Semester wajib diisi" };
      }

      semesterInt = parseInt(semester);

      if (isNaN(semesterInt)) {
        throw { status: 400, message: "Semester harus berupa angka" };
      }

      if (semesterInt < 1) {
        throw { status: 400, message: "Semester minimal adalah 1" };
      }

      // 🔥 FIX LOGIKA (boleh upload sampai semester saat ini)
      if (semesterInt > currentSemester) {
        throw {
          status: 400,
          message: `Semester tidak valid. Semester saat ini: ${currentSemester}, maksimal upload semester ${currentSemester}`
        };
      }
    }

    // ================= DUPLICATE CHECK =================
    const existing = await documentRepository.findByUserTypeSemester(
      user.id,
      document_type,
      semesterInt
    );

    if (existing) {
      throw {
        status: 400,
        message: `${document_type.toUpperCase()} semester ${semesterInt} sudah diupload`
      };
    }

    // ================= VALIDASI URUTAN =================
    const lastKRS = await documentRepository.getLastSemester(user.id, 'krs');
    const lastKHS = await documentRepository.getLastSemester(user.id, 'khs');

    // 🔥 KRS HARUS BERURUTAN
    if (document_type === 'krs') {
      if (semesterInt !== lastKRS + 1) {
        throw {
          status: 400,
          message: `KRS harus berurutan. Terakhir: ${lastKRS}, berikutnya: ${lastKRS + 1}`
        };
      }
    }

    // 🔥 KHS HARUS BERURUTAN + WAJIB ADA KRS
    if (document_type === 'khs') {

      if (semesterInt !== lastKHS + 1) {
        throw {
          status: 400,
          message: `KHS harus berurutan. Terakhir: ${lastKHS}, berikutnya: ${lastKHS + 1}`
        };
      }

      // 🔥 VALIDASI: KRS HARUS ADA
      const krs = await documentRepository.findByUserTypeSemester(
        user.id,
        'krs',
        semesterInt
      );

      if (!krs) {
        throw {
          status: 400,
          message: `Tidak boleh upload KHS semester ${semesterInt} karena KRS belum diupload`
        };
      }
    }

    // ================= FOLDER PER USER =================
    const userDir = path.join('uploads', String(user.id));

    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    // ================= SAFE NAME =================
    const safeName = (user.name || 'user')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-');

    const date = new Date().toISOString().split('T')[0];
    const unique = Date.now();

    let newFilename = '';

    if (document_type === 'transkrip') {
      newFilename = `${safeName}-${document_type}-${date}-${unique}.pdf`;
    } else {
      newFilename = `${safeName}-${document_type}-semester-${semesterInt}-${date}-${unique}.pdf`;
    }

    const newPath = path.join(userDir, newFilename);

    // ================= RENAME FILE =================
    fs.renameSync(file.path, newPath);

    // ================= SAVE DB =================
    const document = await documentRepository.createDocument({
      user_id: user.id,
      document_type,
      semester: semesterInt,
      file_path: newPath
    });

    // ================= AUTO UPDATE SEMESTER =================
    if (document_type === 'khs') {

      const lastKHSAfter = await documentRepository.getLastSemester(user.id, 'khs');

      if (semesterInt === lastKHSAfter) {
        const newSemester = semesterInt + 1;

        if (newSemester > currentSemester) {
          await profileRepository.updateSemester(user.id, newSemester);
        }
      }
    }

    return document;

  } catch (err) {

    // 🔥 CLEANUP FILE JIKA ERROR
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    throw err;
  }
};

exports.checkCompleteness = async (user) => {

  if (!user || user.role !== 'mahasiswa') {
    throw { status: 403, message: "Hanya mahasiswa" };
  }

  const profile = await profileRepository.getMahasiswaProfile(user.id);

  if (!profile) {
    throw { status: 404, message: "Profile tidak ditemukan" };
  }

  const currentSemester = profile.current_semester;

  const docs = await documentRepository.getDocumentsByUser(user.id);

  const krsList = docs
    .filter(d => d.document_type === 'krs')
    .map(d => d.semester);

  const khsList = docs
    .filter(d => d.document_type === 'khs')
    .map(d => d.semester);

  const missingKRS = [];
  const missingKHS = [];

  for (let i = 1; i <= currentSemester; i++) {
    if (!krsList.includes(i)) missingKRS.push(i);
  }

  for (let i = 1; i < currentSemester; i++) {
    if (!khsList.includes(i)) missingKHS.push(i);
  }

  return {
    current_semester: currentSemester,
    krs: {
      uploaded: krsList,
      missing: missingKRS,
      is_complete: missingKRS.length === 0
    },
    khs: {
      uploaded: khsList,
      missing: missingKHS,
      is_complete: missingKHS.length === 0
    }
  };
};