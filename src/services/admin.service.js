const bcrypt = require('bcrypt');
const adminRepository  = require('../repositories/admin.repository');
const documentRepository = require('../repositories/document.repository');
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
const deleteFromGCS = async (fileRef) => {
  try {
    let objectPath;
    if (fileRef.startsWith('https://')) {
      const url = new URL(fileRef);
      objectPath = url.pathname.split('/').slice(2).join('/');
    } else {
      objectPath = fileRef.startsWith('/') ? fileRef.slice(1) : fileRef;
    }
    await bucket.file(objectPath).delete();
  } catch (err) {
    console.error(`[GCS] Gagal hapus file: ${err.message}`);
  }
};

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
    uploaded_at: r.uploaded_at,
    updated_at:  r.updated_at || null
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
    uploaded_at: row.uploaded_at,
    updated_at:  row.updated_at || null
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
    uploaded_at: updated.uploaded_at,
    updated_at:  updated.updated_at || null
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

  const fileRef = existing.file_url || existing.file_path;
  if (fileRef) await deleteFromGCS(fileRef);

  return { message: "Dokumen berhasil dihapus" };
};

// ================= HELPER: FORMAT USER RESPONSE =================
const formatUser = (r) => ({
  id:                  r.id,
  name:                r.name,
  email:               r.email,
  role:                r.role,
  identifier:          r.npm_nip,
  status:              r.is_verified ? 'active' : 'inactive',
  profile_picture_url: r.profile_picture || null,
  angkatan:            r.angkatan || null,
  current_semester:    r.current_semester || null,
  ipk:                 r.ipk !== undefined ? r.ipk : null,
  dosen_pa:            r.dosen_pa_name || null,
  kode_kelas:          r.kode_kelas || null,
  total_bimbingan:     r.total_bimbingan !== undefined ? parseInt(r.total_bimbingan) : null,
  total_mahasiswa:     r.role === 'dosen' ? parseInt(r.total_mahasiswa) : null
});

// ================= GET ALL USERS =================
exports.getAllUsers = async ({ user, query }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: "Hanya admin yang dapat mengakses endpoint ini" };
  }

  const { role, search, sort_by, page = 1, limit = 20 } = query;

  const validRoles = ['mahasiswa', 'dosen', 'admin'];
  if (!role) throw { status: 400, message: "role wajib diisi (mahasiswa, dosen, admin)" };
  if (!validRoles.includes(role)) throw { status: 400, message: "role tidak valid" };

  const validSorts = ['name_asc', 'name_desc', 'identifier_asc', 'identifier_desc',
    'angkatan_asc', 'angkatan_desc', 'semester_asc', 'semester_desc'];
  if (sort_by && !validSorts.includes(sort_by)) {
    throw { status: 400, message: `sort_by tidak valid. Pilihan: ${validSorts.join(', ')}` };
  }

  const pageInt  = Math.max(1, parseInt(page)  || 1);
  const limitInt = Math.min(100, Math.max(1, parseInt(limit) || 20));

  const { rows, totalItems } = await adminRepository.getAllUsers({
    role, search, sort_by, page: pageInt, limit: limitInt
  });

  const totalPages = Math.ceil(totalItems / limitInt);

  return {
    meta: {
      current_page: pageInt,
      total_pages:  totalPages,
      total_items:  totalItems,
      limit:        limitInt
    },
    data: rows.map(formatUser)
  };
};

// ================= TAMBAH ADMIN =================
exports.createAdmin = async ({ user, body }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: "Hanya admin yang dapat mengakses endpoint ini" };
  }

  const { name, email, password } = body;

  if (!name || !email || !password) {
    throw { status: 400, message: "name, email, dan password wajib diisi" };
  }

  const existing = await adminRepository.findUserByEmail(email);
  if (existing) throw { status: 400, message: "Email sudah digunakan" };

  const hashedPassword = await bcrypt.hash(password, 10);

  const created = await adminRepository.createAdmin({
    name: name.trim(),
    email: email.trim(),
    password: hashedPassword
  });

  const full = await adminRepository.findUserById(created.id);
  return formatUser(full);
};

// ================= EDIT USER =================
exports.updateUser = async ({ user, userId, body }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: "Hanya admin yang dapat mengakses endpoint ini" };
  }

  const { name, email, identifier } = body;

  if (!name && !email && !identifier) {
    throw { status: 400, message: "Tidak ada data yang dikirim" };
  }

  const target = await adminRepository.findUserById(userId);
  if (!target) throw { status: 404, message: "User tidak ditemukan" };

  if (email) {
    const existing = await adminRepository.findUserByEmail(email);
    if (existing && existing.id !== parseInt(userId)) {
      throw { status: 400, message: "Email sudah digunakan" };
    }
  }

  if (identifier) {
    const existing = await adminRepository.findUserByNpm(identifier);
    if (existing && existing.id !== parseInt(userId)) {
      throw { status: 400, message: "Identifier sudah digunakan" };
    }
  }

  await adminRepository.updateUser(userId, {
    name:    name    ? name.trim()    : undefined,
    email:   email   ? email.trim()   : undefined,
    npm_nip: identifier ? identifier.trim() : undefined
  });

  const updated = await adminRepository.findUserById(userId);
  return formatUser(updated);
};

// ================= UPDATE STATUS =================
exports.updateUserStatus = async ({ user, userId, body }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: "Hanya admin yang dapat mengakses endpoint ini" };
  }

  if (user.id === parseInt(userId)) {
    throw { status: 400, message: "Admin tidak dapat mengubah status akunnya sendiri" };
  }

  const { is_active } = body;

  if (is_active === undefined || is_active === null || is_active === '') {
    throw { status: 400, message: "is_active wajib diisi (true/false)" };
  }

  // Parse eksplisit: string "false" dari Android harus dibaca sebagai boolean false
  let isActiveBool;
  if (typeof is_active === 'boolean') {
    isActiveBool = is_active;
  } else if (typeof is_active === 'string') {
    isActiveBool = is_active.toLowerCase() === 'true' || is_active === '1';
  } else {
    isActiveBool = Boolean(is_active);
  }

  const target = await adminRepository.findUserById(userId);
  if (!target) throw { status: 404, message: "User tidak ditemukan" };

  await adminRepository.updateUserStatus(userId, isActiveBool);
};

// ================= DELETE USER =================
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

  await adminRepository.deleteUser(userId);
};

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

// ================= GET DOCUMENTS BY USER (ADMIN) =================
exports.getDocumentsByUser = async ({ user, userId }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: 'Hanya admin yang dapat mengakses endpoint ini' };
  }

  const target = await adminRepository.findUserById(userId);
  if (!target) throw { status: 404, message: 'Pengguna tidak ditemukan' };

  const docs = await documentRepository.getDocumentsByUserId(userId);
  return docs;
};

// ================= CREATE DOCUMENT BY ADMIN =================
exports.createDocumentAdmin = async ({ user, userId, body, file }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: 'Hanya admin yang dapat mengakses endpoint ini' };
  }

  const target = await adminRepository.findUserById(userId);
  if (!target) throw { status: 404, message: 'Pengguna tidak ditemukan' };

  const { document_type, semester } = body;

  if (!document_type) throw { status: 400, message: 'document_type wajib diisi' };
  if (!file)          throw { status: 400, message: 'File wajib diupload' };

  const semesterInt = semester ? parseInt(semester) : null;

  const { file_name, file_url } = await uploadToGCS(file, userId);

  const doc = await documentRepository.createDocumentAdmin({
    user_id:       userId,
    document_type,
    semester:      semesterInt,
    file_path:     file_url,
  });

  return doc;
};

// ================= UPDATE DOCUMENT BY ADMIN =================
exports.updateDocumentAdmin = async ({ user, documentId, body, file }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: 'Hanya admin yang dapat mengakses endpoint ini' };
  }

  const existing = await documentRepository.findByIdAdmin(documentId);
  if (!existing) throw { status: 404, message: 'Dokumen tidak ditemukan' };

  const updateData = {};

  if (body.semester !== undefined && body.semester !== '') {
    updateData.semester = parseInt(body.semester);
  }

  if (file) {
    const { file_url } = await uploadToGCS(file, existing.user_id);
    updateData.file_path = file_url;
    await deleteFromGCS(existing.file_path);
  }

  if (Object.keys(updateData).length === 0) {
    throw { status: 400, message: 'Tidak ada data yang diperbarui' };
  }

  const updated = await documentRepository.updateDocumentAdmin(documentId, updateData);
  return updated;
};

// ================= DELETE DOCUMENT BY ADMIN =================
exports.deleteDocumentAdmin = async ({ user, documentId }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: 'Hanya admin yang dapat mengakses endpoint ini' };
  }

  const existing = await documentRepository.findByIdAdmin(documentId);
  if (!existing) throw { status: 404, message: 'Dokumen tidak ditemukan' };

  await documentRepository.deleteDocumentAdmin(documentId);
  await deleteFromGCS(existing.file_path);
};

// ================= GET RIWAYAT BIMBINGAN (ADMIN) =================
exports.getRiwayatBimbinganAdmin = async ({ user, mahasiswaId }) => {
  if (!user || user.role !== 'admin') {
    throw { status: 403, message: 'Hanya admin yang dapat mengakses endpoint ini' };
  }

  const target = await adminRepository.findUserById(mahasiswaId);
  if (!target) throw { status: 404, message: 'Pengguna tidak ditemukan' };
  if (target.role !== 'mahasiswa') throw { status: 400, message: 'ID yang diberikan bukan mahasiswa' };

  const rows = await adminRepository.getRiwayatBimbinganAdmin(mahasiswaId);

  const BULAN = [
    'Januari','Februari','Maret','April','Mei','Juni',
    'Juli','Agustus','September','Oktober','November','Desember'
  ];

  const now = new Date().setHours(0, 0, 0, 0);

  return rows.map(row => {
    const tanggal = new Date(row.tanggal);
    const d = tanggal.getDate();
    const m = BULAN[tanggal.getMonth()];
    const y = tanggal.getFullYear();
    const dateFormatted = `${d} ${m} ${y}`;
    const timeFormatted = `${row.waktu_mulai.slice(0, 5)} WIB`;

    let status;
    if (row.booking_status === 'dibatalkan') {
      status = 'dibatalkan';
    } else if (tanggal < now) {
      status = 'selesai';
    } else {
      status = 'dijadwalkan';
    }

    return {
      id:              row.booking_id,
      date:            dateFormatted,
      time:            timeFormatted,
      agenda:          row.agenda || null,
      status,
      keteranganDosen: row.keterangan_dosen || ''
    };
  });
};
