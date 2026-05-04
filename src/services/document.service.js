const documentRepository = require('../repositories/document.repository');
const profileRepository = require('../repositories/profile.repository');
const { bucket } = require('../config/gcs');

// ================= HELPER GCS UPLOAD =================
const uploadToGCS = async (file, filename, userId) => {
  const filePath = `${userId}/${filename}`;
  const blob = bucket.file(filePath);

  const blobStream = blob.createWriteStream({
    resumable: false,
    contentType: file.mimetype
  });

  return new Promise((resolve, reject) => {
    blobStream.on('finish', () => {
      const url = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
      resolve(url);
    });
    blobStream.on('error', reject);
    blobStream.end(file.buffer);
  });
};

// ================= HELPER GCS DELETE =================
const deleteFromGCS = async (filename, userId) => {
  try {
    const filePath = `${userId}/${filename}`;
    await bucket.file(filePath).delete();
    console.log(`[GCS] File dihapus: ${filePath}`);
  } catch (err) {
    console.error(`[GCS] Gagal hapus file: ${err.message}`);
  }
};

// ================= UPLOAD DOCUMENT =================
exports.uploadDocument = async ({ user, body, file }) => {
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

  const profile = await profileRepository.getMahasiswaProfile(user.id);

  if (!profile) {
      throw { status: 404, message: "Profile mahasiswa tidak ditemukan" };
  }

  const currentSemester = profile.current_semester;

  // transkrip tidak butuh semester, gunakan 0 agar tidak violate NOT NULL constraint
  let semesterInt = 0;

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

      if (semesterInt > currentSemester) {
        throw {
          status: 400,
          message: `Semester tidak valid. Semester saat ini: ${currentSemester}, maksimal upload semester ${currentSemester}`
        };
      }
  }

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

  // Validasi urutan: semester N butuh minimal 1 file di semester N-1
  if (document_type !== 'transkrip' && semesterInt > 1) {
      const prevSemesterHasFile = await documentRepository.hasAnyDocumentForSemester(
        user.id,
        semesterInt - 1
      );

      if (!prevSemesterHasFile) {
        throw {
          status: 400,
          message: `Semester ${semesterInt - 1} belum memiliki dokumen. Upload minimal 1 file (KRS atau KHS) untuk semester ${semesterInt - 1} terlebih dahulu`
        };
      }
  }

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

  const fileUrl = await uploadToGCS(file, newFilename, user.id);

  let document;
  try {
      document = await documentRepository.createDocument({
        user_id: user.id,
        document_type,
        semester: semesterInt,
        file_path: fileUrl
      });
  } catch (dbErr) {
      // DB gagal → rollback file dari GCS
      await deleteFromGCS(newFilename, user.id);
      throw dbErr;
  }

  return document;

};

// ================= GET DOCUMENTS =================
exports.getDocuments = async ({ user, query = {} }) => {

  if (!user || user.role !== 'mahasiswa') {
    throw { status: 403, message: "Hanya mahasiswa yang dapat melihat dokumen" };
  }

  const { document_type, semester } = query;

  const allowedTypes = ['krs', 'khs', 'transkrip'];
  if (document_type && !allowedTypes.includes(document_type)) {
    throw { status: 400, message: "document_type tidak valid. Gunakan: krs, khs, atau transkrip" };
  }

  if (semester && isNaN(parseInt(semester))) {
    throw { status: 400, message: "Semester harus berupa angka" };
  }

  const docs = await documentRepository.getDocumentsList(user.id, { document_type, semester });

  const grouped = {
    krs: [],
    khs: [],
    transkrip: null
  };

  for (const doc of docs) {
    if (doc.document_type === 'transkrip') {
      grouped.transkrip = doc;
    } else {
      grouped[doc.document_type].push(doc);
    }
  }

  return {
    total: docs.length,
    documents: grouped
  };
};

// ================= CHECK COMPLETENESS =================
exports.checkCompleteness = async (user) => {
  if (!user || user.role !== 'mahasiswa') {
      throw { status: 403, message: "Hanya mahasiswa yang dapat mengecek kelengkapan dokumen" };
    }

    const profile = await profileRepository.getMahasiswaProfile(user.id);

    if (!profile) {
      throw { status: 404, message: "Profile mahasiswa tidak ditemukan" };
    }

    const currentSemester = profile.current_semester;

    const allDocs = await documentRepository.getDocumentsByUser(user.id);

    const uploaded = {
      krs: [],
      khs: [],
      transkrip: false
    };

    for (const doc of allDocs) {
      if (doc.document_type === 'krs') {
        uploaded.krs.push(doc.semester);
      } else if (doc.document_type === 'khs') {
        uploaded.khs.push(doc.semester);
      } else if (doc.document_type === 'transkrip') {
        uploaded.transkrip = true;
      }
    }

    const missingSemesterKRS = [];
    for (let s = 1; s <= currentSemester; s++) {
      if (!uploaded.krs.includes(s)) missingSemesterKRS.push(s);
    }

    const missingSemesterKHS = [];
    for (let s = 1; s < currentSemester; s++) {
      if (!uploaded.khs.includes(s)) missingSemesterKHS.push(s);
    }

    const isComplete =
      missingSemesterKRS.length === 0 &&
      missingSemesterKHS.length === 0;

    return {
      current_semester: currentSemester,
      uploaded_krs: uploaded.krs.sort((a, b) => a - b),
      uploaded_khs: uploaded.khs.sort((a, b) => a - b),
      uploaded_transkrip: uploaded.transkrip,
      missing_krs: missingSemesterKRS,
      missing_khs: missingSemesterKHS,
      is_complete: isComplete
    };

};

// ================= DELETE DOCUMENT =================
exports.deleteDocument = async ({ user, documentId }) => {

  if (!user || user.role !== 'mahasiswa') {
    throw { status: 403, message: "Hanya mahasiswa yang dapat menghapus dokumen" };
  }

  const existing = await documentRepository.findById(documentId, user.id);
  if (!existing) {
    throw { status: 404, message: "Dokumen tidak ditemukan" };
  }

  await documentRepository.deleteDocument(documentId, user.id);

  // Hapus file dari GCS — ekstrak object path dari full URL
  try {
    const url = new URL(existing.file_path);
    const objectPath = url.pathname.split('/').slice(2).join('/');
    await bucket.file(objectPath).delete();
    console.log(`[GCS] File dihapus: ${objectPath}`);
  } catch (err) {
    console.error(`[GCS] Gagal hapus file dari GCS: ${err.message}`);
  }

  return { message: "Dokumen berhasil dihapus" };
};

// ================= UPDATE DOCUMENT =================
exports.updateDocument = async ({ user, documentId, file }) => {

  if (!file) {
    throw { status: 400, message: "File wajib diupload" };
  }

  if (!user || user.role !== 'mahasiswa') {
    throw { status: 403, message: "Hanya mahasiswa yang dapat update dokumen" };
  }

  const existing = await documentRepository.findById(documentId, user.id);
  if (!existing) {
    throw { status: 404, message: "Dokumen tidak ditemukan" };
  }

  const safeName = (user.name || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-');

  const date = new Date().toISOString().split('T')[0];
  const unique = Date.now();

  let newFilename = '';
  if (existing.document_type === 'transkrip') {
    newFilename = `${safeName}-${existing.document_type}-${date}-${unique}.pdf`;
  } else {
    newFilename = `${safeName}-${existing.document_type}-semester-${existing.semester}-${date}-${unique}.pdf`;
  }

  const fileUrl = await uploadToGCS(file, newFilename, user.id);

  let updated;
  try {
    updated = await documentRepository.updateFilePath(documentId, fileUrl);
  } catch (dbErr) {
    await deleteFromGCS(newFilename, user.id);
    throw dbErr;
  }

  return updated;
};
