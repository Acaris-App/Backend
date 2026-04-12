const userRepository = require('../repositories/user.repository');
const profileRepository = require('../repositories/profile.repository');
const documentRepository = require('../repositories/document.repository');
const { bucket } = require('../config/gcs');

// ================= HELPER GCS =================
const uploadProfilePicture = async (file, npm_nip) => {
  const ext = file.mimetype.split('/')[1];
  const filename = `profile-pictures/${npm_nip}-${Date.now()}.${ext}`;
  const blob = bucket.file(filename);

  const blobStream = blob.createWriteStream({
    resumable: false,
    contentType: file.mimetype
  });

  return new Promise((resolve, reject) => {
    blobStream.on('finish', () => {
      const url = `https://storage.googleapis.com/${bucket.name}/${filename}`;
      resolve(url);
    });
    blobStream.on('error', reject);
    blobStream.end(file.buffer);
  });
};

// ================= HELPER: BUILD FULL PROFILE RESPONSE =================
// Dipakai oleh GET, PUT, dan POST photo — satu sumber kebenaran untuk struktur response
const buildProfileResponse = async (userId, role) => {
  const user = await userRepository.findById(userId);
  if (!user) throw { status: 404, message: "User tidak ditemukan" };

  const responseData = {
    id:              user.id,
    name:            user.name,
    email:           user.email,
    npm_nip:         user.npm_nip,
    role:            user.role,
    profile_picture: user.profile_picture || null
  };

  if (role === 'mahasiswa') {
    const profile = await profileRepository.getMahasiswaProfile(userId);

    if (profile) {
      responseData.angkatan         = profile.angkatan;
      responseData.ipk              = profile.ipk;
      responseData.current_semester = profile.current_semester;
      responseData.dosen_pa_id      = profile.dosen_pa_id;
      responseData.nama_dosen_pa    = profile.nama_dosen_pa  || null;
      responseData.nip_dosen_pa     = profile.nip_dosen_pa   || null;
      responseData.foto_dosen_pa    = profile.foto_dosen_pa  || null;
    }

    const allDocs = await documentRepository.getDocumentsList(userId);
    const documents = { krs: [], khs: [], transkrip: null };

    for (const doc of allDocs) {
      if (doc.document_type === 'transkrip') {
        documents.transkrip = {
          id:          doc.id,
          file_path:   doc.file_path,
          uploaded_at: doc.uploaded_at
        };
      } else {
        documents[doc.document_type].push({
          id:          doc.id,
          semester:    doc.semester,
          file_path:   doc.file_path,
          uploaded_at: doc.uploaded_at
        });
      }
    }

    responseData.documents = documents;
  }

  if (role === 'dosen') {
    const profile = await profileRepository.getDosenProfile(userId);
    if (profile) {
      responseData.kode_kelas = profile.kode_kelas;
    }
  }

  return responseData;
};

// ================= 1. GET PROFILE (semua role) =================
exports.getMe = async (req, res, next) => {
  try {
    const { id, role } = req.user;
    const responseData = await buildProfileResponse(id, role);

    res.json({ status: "success", data: responseData });
  } catch (err) {
    next(err);
  }
};

// ================= 2. UPDATE DATA DIRI — teks saja (semua role) =================
exports.updateProfileText = async (req, res, next) => {
  try {
    const { id, role } = req.user;
    const { name, angkatan, ipk, current_semester } = req.body;

    // Minimal harus ada satu field yang dikirim
    const hasUserField     = name !== undefined;
    const hasMahasiswaField = angkatan !== undefined || ipk !== undefined || current_semester !== undefined;

    if (!hasUserField && !hasMahasiswaField) {
      return res.status(400).json({ status: "error", message: "Tidak ada data yang dikirim" });
    }

    // Validasi name kalau dikirim
    if (hasUserField && (!name || !name.trim())) {
      return res.status(400).json({ status: "error", message: "name tidak boleh kosong" });
    }

    // Update tabel users (name) jika dikirim
    if (hasUserField) {
      await userRepository.updateProfileText(id, { name: name.trim() });
    }

    // Update tabel mahasiswa jika role mahasiswa dan ada field terkait
    if (role === 'mahasiswa' && hasMahasiswaField) {

      if (ipk !== undefined) {
        const ipkNum = parseFloat(ipk);
        if (isNaN(ipkNum) || ipkNum < 0 || ipkNum > 4) {
          return res.status(400).json({ status: "error", message: "IPK harus antara 0 dan 4" });
        }
      }

      if (current_semester !== undefined) {
        const semNum = parseInt(current_semester);
        if (isNaN(semNum) || semNum < 1) {
          return res.status(400).json({ status: "error", message: "Semester minimal 1" });
        }
      }

      if (angkatan !== undefined) {
        const angkatanNum = parseInt(angkatan);
        if (isNaN(angkatanNum) || angkatanNum < 2000) {
          return res.status(400).json({ status: "error", message: "Angkatan tidak valid" });
        }
      }

      await profileRepository.updateMahasiswaProfile(id, {
        angkatan:         angkatan         !== undefined ? parseInt(angkatan)          : undefined,
        ipk:              ipk              !== undefined ? parseFloat(ipk)             : undefined,
        current_semester: current_semester !== undefined ? parseInt(current_semester)  : undefined
      });
    }

    // Kembalikan response lengkap identik dengan GET /user/profile
    const responseData = await buildProfileResponse(id, role);

    res.json({
      status: "success",
      message: "Data diri berhasil diperbarui",
      data: responseData
    });
  } catch (err) {
    next(err);
  }
};

// ================= 3. UPDATE FOTO PROFIL — multipart (semua role) =================
exports.updateProfilePhoto = async (req, res, next) => {
  try {
    const { id, role } = req.user;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ status: "error", message: "File foto wajib diupload" });
    }

    const currentUser = await userRepository.findById(id);
    if (!currentUser) {
      return res.status(404).json({ status: "error", message: "User tidak ditemukan" });
    }

    const profilePictureUrl = await uploadProfilePicture(file, currentUser.npm_nip);
    await userRepository.updateProfilePhoto(id, profilePictureUrl);

    // Kembalikan response lengkap identik dengan GET /user/profile
    const responseData = await buildProfileResponse(id, role);

    res.json({
      status: "success",
      message: "Foto profil berhasil diperbarui",
      data: responseData
    });
  } catch (err) {
    next(err);
  }
};

// ================= LEGACY: updateProfile (masih dipakai internal, jangan dihapus) =================
exports.updateProfile = exports.updateProfileText;
