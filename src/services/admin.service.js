const adminRepository = require('../repositories/admin.repository');
const { bucket } = require('../config/gcs');

const VALID_CATEGORIES = ['jadwal', 'kurikulum', 'peraturan_akademik', 'kkni', 'peraturan_rektor'];

// ================= HELPER GCS UPLOAD =================
const uploadToGCS = async (file, adminId) => {
  const ext = file.mimetype.split('/')[1];
  const filename = `knowledge-base/${adminId}-${Date.now()}.${ext}`;
  const blob = bucket.file(filename);

  const blobStream = blob.createWriteStream({
    resumable: false,
    contentType: file.mimetype
  });

  return new Promise((resolve, reject) => {
    blobStream.on('finish', () => {
      resolve(`https://storage.googleapis.com/${bucket.name}/${filename}`);
    });
    blobStream.on('error', reject);
    blobStream.end(file.buffer);
  });
};

// ================= HELPER GCS DELETE =================
const deleteFromGCS = async (filePath) => {
  try {
    const url = new URL(filePath);
    const objectPath = url.pathname.split('/').slice(2).join('/');
    await bucket.file(objectPath).delete();
  } catch (err) {
    console.error(`[GCS] Gagal hapus file: ${err.message}`);
  }
};


// ================================================================
// PBI-12: KNOWLEDGE BASE
// ================================================================

// ================= GET ALL =================
exports.getAllKnowledgeBase = async ({ user, query }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: "Hanya admin yang dapat mengakses endpoint ini" };
  }

  const { category } = query;

  if (category && !VALID_CATEGORIES.includes(category)) {
    throw { status: 400, message: `Category tidak valid. Pilihan: ${VALID_CATEGORIES.join(', ')}` };
  }

  const rows = await adminRepository.getAllKnowledgeBase({ category });

  return rows.map(r => ({
    id:          r.id,
    category:    r.category,
    file_path:   r.file_path,
    admin_name:  r.admin_name,
    created_at:  r.created_at
  }));
};

// ================= CREATE =================
exports.createKnowledgeBase = async ({ user, body, file }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: "Hanya admin yang dapat mengakses endpoint ini" };
  }

  const { category } = body;

  if (!category) {
    throw { status: 400, message: "category wajib diisi" };
  }

  if (!VALID_CATEGORIES.includes(category)) {
    throw { status: 400, message: `Category tidak valid. Pilihan: ${VALID_CATEGORIES.join(', ')}` };
  }

  if (!file) {
    throw { status: 400, message: "File wajib diupload" };
  }

  const file_path = await uploadToGCS(file, user.id);

  const row = await adminRepository.createKnowledgeBase({
    admin_id: user.id,
    category,
    file_path
  });

  return row;
};

// ================= UPDATE =================
exports.updateKnowledgeBase = async ({ user, id, body, file }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: "Hanya admin yang dapat mengakses endpoint ini" };
  }

  const existing = await adminRepository.findKnowledgeBaseById(id);
  if (!existing) throw { status: 404, message: "Knowledge base tidak ditemukan" };

  const { category } = body;

  if (category && !VALID_CATEGORIES.includes(category)) {
    throw { status: 400, message: `Category tidak valid. Pilihan: ${VALID_CATEGORIES.join(', ')}` };
  }

  let file_path = existing.file_path;

  if (file) {
    // Upload file baru, hapus file lama dari GCS
    file_path = await uploadToGCS(file, user.id);
    await deleteFromGCS(existing.file_path);
  }

  const updated = await adminRepository.updateKnowledgeBase(id, { category, file_path });

  return updated;
};

// ================= DELETE =================
exports.deleteKnowledgeBase = async ({ user, id }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: "Hanya admin yang dapat mengakses endpoint ini" };
  }

  const existing = await adminRepository.findKnowledgeBaseById(id);
  if (!existing) throw { status: 404, message: "Knowledge base tidak ditemukan" };

  await adminRepository.deleteKnowledgeBase(id);
  await deleteFromGCS(existing.file_path);

  return { message: "Knowledge base berhasil dihapus" };
};


// ================================================================
// PBI-24: KELOLA AKUN PENGGUNA
// ================================================================

// ================= GET ALL USERS =================
exports.getAllUsers = async ({ user, query }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: "Hanya admin yang dapat mengakses endpoint ini" };
  }

  const { role, is_verified, search } = query;

  const filters = {};
  if (role) filters.role = role;
  if (is_verified !== undefined) filters.is_verified = is_verified === 'true';
  if (search) filters.search = search;

  const rows = await adminRepository.getAllUsers(filters);

  return rows.map(r => ({
    id:              r.id,
    name:            r.name,
    email:           r.email,
    npm_nip:         r.npm_nip,
    role:            r.role,
    profile_picture: r.profile_picture || null,
    is_verified:     r.is_verified,
    created_at:      r.created_at
  }));
};

// ================= UPDATE STATUS AKUN =================
exports.updateUserStatus = async ({ user, userId, body }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: "Hanya admin yang dapat mengakses endpoint ini" };
  }

  if (user.id === parseInt(userId)) {
    throw { status: 400, message: "Admin tidak dapat mengubah status akunnya sendiri" };
  }

  const { is_verified } = body;

  if (is_verified === undefined) {
    throw { status: 400, message: "is_verified wajib diisi (true/false)" };
  }

  const target = await adminRepository.findUserById(userId);
  if (!target) throw { status: 404, message: "User tidak ditemukan" };

  const updated = await adminRepository.updateUserStatus(userId, is_verified);

  return updated;
};

// ================= DELETE AKUN =================
exports.deleteUser = async ({ user, userId }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: "Hanya admin yang dapat mengakses endpoint ini" };
  }

  if (user.id === parseInt(userId)) {
    throw { status: 400, message: "Admin tidak dapat menghapus akunnya sendiri" };
  }

  const target = await adminRepository.findUserById(userId);
  if (!target) throw { status: 404, message: "User tidak ditemukan" };

  if (target.role === 'admin') {
    throw { status: 400, message: "Tidak dapat menghapus akun admin lain" };
  }

  const deleted = await adminRepository.deleteUser(userId);

  return { message: `Akun ${deleted.name} berhasil dihapus` };
};


// ================================================================
// PBI-25: MONITORING DOKUMEN MAHASISWA
// ================================================================

// ================= GET ALL DOCUMENTS =================
exports.getAllDocuments = async ({ user, query }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: "Hanya admin yang dapat mengakses endpoint ini" };
  }

  const { document_type, semester, user_id } = query;

  const filters = {};
  if (document_type) filters.document_type = document_type;
  if (semester) filters.semester = semester;
  if (user_id) filters.user_id = user_id;

  const rows = await adminRepository.getAllDocuments(filters);

  return rows.map(r => ({
    id:              r.id,
    document_type:   r.document_type,
    semester:        r.semester === 0 ? null : r.semester,
    file_path:       r.file_path,
    uploaded_at:     r.uploaded_at,
    mahasiswa: {
      id:               r.mahasiswa_id,
      name:             r.mahasiswa_name,
      npm_nip:          r.npm_nip,
      angkatan:         r.angkatan,
      current_semester: r.current_semester
    }
  }));
};

// ================= GET STATISTIK DOKUMEN =================
exports.getDocumentStats = async ({ user }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: "Hanya admin yang dapat mengakses endpoint ini" };
  }

  const stats = await adminRepository.getDocumentStats();

  return {
    total_mahasiswa:  parseInt(stats.total_mahasiswa),
    total_krs:        parseInt(stats.total_krs),
    total_khs:        parseInt(stats.total_khs),
    total_transkrip:  parseInt(stats.total_transkrip)
  };
};
