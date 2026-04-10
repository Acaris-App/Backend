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

// ================= 1. GET PROFILE (semua role) =================
exports.getMe = async (req, res, next) => {
  try {
    const { id, role } = req.user;

    const user = await userRepository.findById(id);
    if (!user) return res.status(404).json({ status: "error", message: "User tidak ditemukan" });

    // Data dasar semua role
    const responseData = {
      id:              user.id,
      name:            user.name,
      email:           user.email,
      npm_nip:         user.npm_nip,
      role:            user.role,
      profile_picture: user.profile_picture || null
    };

    // Tambah data profil khusus per role
    if (role === 'mahasiswa') {
      const profile = await profileRepository.getMahasiswaProfile(id);

      if (profile) {
        responseData.angkatan         = profile.angkatan;
        responseData.ipk              = profile.ipk;
        responseData.current_semester = profile.current_semester;
        responseData.dosen_pa_id      = profile.dosen_pa_id;
        responseData.nama_dosen_pa    = profile.nama_dosen_pa    || null;
        responseData.nip_dosen_pa     = profile.nip_dosen_pa     || null;
        responseData.foto_dosen_pa    = profile.foto_dosen_pa    || null;
      }

      // Dokumen KRS & KHS dikelompokkan per semester
      const allDocs = await documentRepository.getDocumentsList(id);

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
      const profile = await profileRepository.getDosenProfile(id);
      if (profile) {
        responseData.kode_kelas = profile.kode_kelas;
      }
    }

    res.json({ status: "success", data: responseData });

  } catch (err) {
    next(err);
  }
};

// ================= 2. UPDATE DATA DIRI — teks saja (semua role) =================
exports.updateProfileText = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ status: "error", message: "name wajib diisi" });
    }

    const currentUser = await userRepository.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ status: "error", message: "User tidak ditemukan" });
    }

    const updated = await userRepository.updateProfileText(userId, { name: name.trim() });

    res.json({
      status: "success",
      message: "Data diri berhasil diperbarui",
      data: {
        id:              updated.id,
        name:            updated.name,
        email:           updated.email,
        npm_nip:         updated.npm_nip,
        role:            updated.role,
        profile_picture: updated.profile_picture || null
      }
    });

  } catch (err) {
    next(err);
  }
};

// ================= 3. UPDATE FOTO PROFIL — multipart (semua role) =================
exports.updateProfilePhoto = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ status: "error", message: "File foto wajib diupload" });
    }

    const currentUser = await userRepository.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ status: "error", message: "User tidak ditemukan" });
    }

    const profilePictureUrl = await uploadProfilePicture(file, currentUser.npm_nip);

    const updated = await userRepository.updateProfilePhoto(userId, profilePictureUrl);

    res.json({
      status: "success",
      message: "Foto profil berhasil diperbarui",
      data: {
        id:              updated.id,
        profile_picture: updated.profile_picture  // ← URL baru langsung dikembalikan
      }
    });

  } catch (err) {
    next(err);
  }
};

// ================= LEGACY: updateProfile (masih dipakai internal, jangan dihapus) =================
exports.updateProfile = exports.updateProfileText;
