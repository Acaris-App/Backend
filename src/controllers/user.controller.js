const userRepository = require('../repositories/user.repository');
const profileRepository = require('../repositories/profile.repository');
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

// ================= GET ME =================
exports.getMe = async (req, res, next) => {
  try {
    const user = req.user;

    let profile = null;

    if (user.role === 'mahasiswa') {
      profile = await profileRepository.getMahasiswaProfile(user.id);
    }

    if (user.role === 'dosen') {
      profile = await profileRepository.getDosenProfile(user.id);
    }

    res.json({
      status: "success",
      data: { user, profile }
    });

  } catch (err) {
    next(err);
  }
};

// ================= UPDATE PROFILE =================
exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;
    const file = req.file;

    if (!name && !file) {
      return res.status(400).json({
        status: "error",
        message: "Tidak ada data yang diubah"
      });
    }

    // Ambil data user saat ini
    const currentUser = await userRepository.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ status: "error", message: "User tidak ditemukan" });
    }

    let profilePictureUrl = currentUser.profile_picture;

    if (file) {
      profilePictureUrl = await uploadProfilePicture(file, currentUser.npm_nip);
    }

    const updatedUser = await userRepository.updateProfile(userId, {
      name: name || currentUser.name,
      profile_picture: profilePictureUrl
    });

    res.json({
      status: "success",
      message: "Profil berhasil diperbarui",
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        npm_nip: updatedUser.npm_nip,
        profile_picture: updatedUser.profile_picture,
        role: updatedUser.role
      }
    });

  } catch (err) {
    next(err);
  }
};
