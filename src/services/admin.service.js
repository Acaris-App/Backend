const adminRepository = require('../repositories/admin.repository');
const { bucket } = require('../config/gcs');

const VALID_CATEGORIES = [
  'Peraturan Akademik',
  'Jadwal',
  'Kurikulum',
  'Peraturan Rektor',
  'KKNI'
];

// ================= HELPER GCS UPLOAD =================
const uploadToGCS = async (file, adminId) => {
  const originalName = file.originalname.replace(/\s+/g, '_');
  const filename = `knowledge-base/${adminId}-${Date.now()}-${originalName}`;
  const blob = bucket.file(filename);

  const blobStream = blob.createWriteStream({
    resumable: false,
    contentType: file.mimetype
  });

  return new Promise((resolve, reject) => {
    blobStream.on('finish', () => {
      resolve({
        file_name: originalName,
        file_url: `https://storage.googleapis.com/${bucket.name}/${filename}`
      });
    });
    blobStream.on('error', reject);
    blobStream.end(file.buffer);
  });
};

// ================= HELPER GCS DELETE =================
const deleteFromGCS = async (fileUrl) => {
  try {
    const url = new URL(fileUrl);
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

  const { category, search } = query;

  if (category && !VALID_CATEGORIES.includes(category)) {
    throw { status: 400, message: `Category tidak valid. Pilihan: ${VALID_CATEGORIES.join(', ')}` };
  }

  const rows = await adminRepository.getAllKnowledgeBase({ category, search });

  return rows.map(r => ({
    id:          r.id,
    title:       r.title,
    file_name:   r.file_name,
    file_url:    r.file_url,
    category:    r.category,
    uploaded_at: r.uploaded_at
  }));
};

// ================= CREATE =================
exports.createKnowledgeBase = async ({ user, body, file }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: "Hanya admin yang dapat mengakses endpoint ini" };
  }

  const { title, category } = body;

  if (!title) {
    throw { status: 400, message: "title wajib diisi" };
  }

  if (!category) {
    throw { status: 400, message: "category wajib diisi" };
  }

  if (!VALID_CATEGORIES.includes(category)) {
    throw { status: 400, message: `Category tidak valid. Pilihan: ${VALID_CATEGORIES.join(', ')}` };
  }

  if (!file) {
    throw { status: 400, message: "File wajib diupload" };
  }

  const { file_name, file_url } = await uploadToGCS(file, user.id);

  const row = await adminRepository.createKnowledgeBase({
    admin_id: user.id,
    title,
    file_name,
    file_url,
    category
  });

  return {
    id:          row.id,
    title:       row.title,
    file_name:   row.file_name,
    file_url:    row.file_url,
    category:    row.category,
    uploaded_at: row.uploaded_at
  };
};

// ================= UPDATE =================
exports.updateKnowledgeBase = async ({ user, id, body, file }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: "Hanya admin yang dapat mengakses endpoint ini" };
  }

  const existing = await adminRepository.findKnowledgeBaseById(id);
  if (!existing) throw { status: 404, message: "Knowledge base tidak ditemukan" };

  const { title, category } = body;

  if (category && !VALID_CATEGORIES.includes(category)) {
    throw { status: 400, message: `Category tidak valid. Pilihan: ${VALID_CATEGORIES.join(', ')}` };
  }

  let file_name = existing.file_name;
  let file_url  = existing.file_url;

  if (file) {
    const uploaded = await uploadToGCS(file, user.id);
    file_name = uploaded.file_name;
    file_url  = uploaded.file_url;
    await deleteFromGCS(existing.file_url);
  }

  const updated = await adminRepository.updateKnowledgeBase(id, {
    title,
    category,
    file_name,
    file_url
  });

  return {
    id:          updated.id,
    title:       updated.title,
    file_name:   updated.file_name,
    file_url:    updated.file_url,
    category:    updated.category,
    uploaded_at: updated.uploaded_at
  };
};

// ================= DELETE =================
exports.deleteKnowledgeBase = async ({ user, id }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: "Hanya admin yang dapat mengakses endpoint ini" };
  }

  const existing = await adminRepository.findKnowledgeBaseById(id);
  if (!existing) throw { status: 404, message: "Knowledge base tidak ditemukan" };

  await adminRepository.deleteKnowledgeBase(id);
  await deleteFromGCS(existing.file_url);

  return { message: "Dokumen berhasil dihapus" };
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
