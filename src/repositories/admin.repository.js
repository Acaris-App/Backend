const db = require('../config/db');

// ================================================================
// PBI-12: KNOWLEDGE BASE
// ================================================================

// ================= GET ALL KNOWLEDGE BASE =================
exports.getAllKnowledgeBase = async (filters = {}) => {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (filters.category) {
    conditions.push(`kb.category = $${idx++}`);
    values.push(filters.category);
  }

  if (filters.search) {
    conditions.push(`kb.title ILIKE $${idx++}`);
    values.push(`%${filters.search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await db.query(
    `SELECT kb.id, kb.title, kb.file_name, kb.file_url, kb.category,
            kb.uploaded_at, kb.updated_at
     FROM knowledge_base kb
     ${where}
     ORDER BY kb.uploaded_at DESC`,
    values
  );
  return result.rows;
};

// ================= GET KNOWLEDGE BASE BY ID =================
exports.findKnowledgeBaseById = async (id) => {
  const result = await db.query(
    `SELECT * FROM knowledge_base WHERE id = $1`,
    [id]
  );
  return result.rows[0];
};

// ================= CREATE KNOWLEDGE BASE =================
exports.createKnowledgeBase = async (data) => {
  const result = await db.query(
    `INSERT INTO knowledge_base
       (admin_id, title, file_name, file_url, category, uploaded_at,
        file_path, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), $4, NOW())
     RETURNING *`,
    [data.admin_id, data.title, data.file_name, data.file_url, data.category]
  );
  return result.rows[0];
};

// ================= UPDATE KNOWLEDGE BASE =================
exports.updateKnowledgeBase = async (id, data) => {
  const fields = [];
  const values = [];
  let idx = 1;

  if (data.title !== undefined) {
    fields.push(`title = $${idx++}`);
    values.push(data.title);
  }
  if (data.category !== undefined) {
    fields.push(`category = $${idx++}`);
    values.push(data.category);
  }
  if (data.file_name !== undefined) {
    fields.push(`file_name = $${idx++}`);
    values.push(data.file_name);
  }
  if (data.file_url !== undefined) {
    fields.push(`file_url = $${idx++}`);
    values.push(data.file_url);
    // sinkronkan kolom lama
    fields.push(`file_path = $${idx++}`);
    values.push(data.file_url);
  }

  // selalu update updated_at
  fields.push(`updated_at = NOW()`);

  if (fields.length === 0) return null;

  values.push(id);

  const result = await db.query(
    `UPDATE knowledge_base SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0];
};

// ================= DELETE KNOWLEDGE BASE =================
exports.deleteKnowledgeBase = async (id) => {
  const result = await db.query(
    `DELETE FROM knowledge_base WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0];
};


// ================================================================
// PBI-24: KELOLA AKUN PENGGUNA
// ================================================================

// ================= GET ALL USERS (paginasi + filter + sort) =================
exports.getAllUsers = async (filters = {}) => {
  const { role, search, sort_by, page = 1, limit = 20 } = filters;

  const conditions = [];
  const values = [];
  let idx = 1;

  if (role) {
    conditions.push(`u.role = $${idx++}`);
    values.push(role);
  }

  if (search) {
    conditions.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx} OR u.npm_nip ILIKE $${idx})`);
    values.push(`%${search}%`);
    idx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const orderMap = {
    name_asc:        'u.name ASC',
    name_desc:       'u.name DESC',
    identifier_asc:  'u.npm_nip ASC',
    identifier_desc: 'u.npm_nip DESC',
    angkatan_asc:    'm.angkatan ASC',
    angkatan_desc:   'm.angkatan DESC',
    semester_asc:    'm.current_semester ASC',
    semester_desc:   'm.current_semester DESC'
  };
  const order = orderMap[sort_by] || 'u.name ASC';

  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Hitung total
  const countResult = await db.query(
    `SELECT COUNT(*) AS total
     FROM users u
     LEFT JOIN mahasiswa m ON m.user_id = u.id
     ${where}`,
    values
  );
  const totalItems = parseInt(countResult.rows[0].total);

  // Data dengan JOIN lengkap
  const dataResult = await db.query(
    `SELECT
       u.id, u.name, u.email, u.role, u.npm_nip, u.profile_picture,
       u.is_verified,
       m.angkatan, m.current_semester, m.dosen_pa_id,
       m.ipk,
       pa.name AS dosen_pa_name,
       dp_mhs.kode_kelas,
       (SELECT COUNT(*) FROM booking_bimbingan b
        JOIN jadwal_bimbingan j ON b.jadwal_id = j.id
        WHERE (u.role = 'mahasiswa' AND b.mahasiswa_id = u.id)
           OR (u.role = 'dosen'     AND j.dosen_id    = u.id)) AS total_bimbingan,
       (SELECT COUNT(*) FROM mahasiswa mb WHERE mb.dosen_pa_id = u.id) AS total_mahasiswa
     FROM users u
     LEFT JOIN mahasiswa m        ON m.user_id = u.id
     LEFT JOIN users pa           ON pa.id = m.dosen_pa_id
     LEFT JOIN dosen_pa dp        ON dp.user_id = u.id
     LEFT JOIN dosen_pa dp_mhs    ON dp_mhs.user_id = m.dosen_pa_id
     ${where}
     ORDER BY ${order}
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...values, parseInt(limit), offset]
  );

  return { rows: dataResult.rows, totalItems };
};

// ================= GET USER BY ID (dengan JOIN profil) =================
exports.findUserById = async (userId) => {
  const result = await db.query(
    `SELECT
       u.id, u.name, u.email, u.role, u.npm_nip, u.profile_picture, u.is_verified,
       m.angkatan, m.current_semester, m.dosen_pa_id,
       m.ipk,
       pa.name AS dosen_pa_name,
       dp_mhs.kode_kelas,
       (SELECT COUNT(*) FROM booking_bimbingan b
        JOIN jadwal_bimbingan j ON b.jadwal_id = j.id
        WHERE (u.role = 'mahasiswa' AND b.mahasiswa_id = u.id)
           OR (u.role = 'dosen'     AND j.dosen_id    = u.id)) AS total_bimbingan,
       (SELECT COUNT(*) FROM mahasiswa mb WHERE mb.dosen_pa_id = u.id) AS total_mahasiswa
     FROM users u
     LEFT JOIN mahasiswa m        ON m.user_id = u.id
     LEFT JOIN users pa           ON pa.id = m.dosen_pa_id
     LEFT JOIN dosen_pa dp        ON dp.user_id = u.id
     LEFT JOIN dosen_pa dp_mhs    ON dp_mhs.user_id = m.dosen_pa_id
     WHERE u.id = $1`,
    [userId]
  );
  return result.rows[0];
};

// ================= FIND BY EMAIL =================
exports.findUserByEmail = async (email) => {
  const result = await db.query(
    `SELECT id, role FROM users WHERE email = $1 LIMIT 1`,
    [email]
  );
  return result.rows[0];
};

// ================= FIND BY NPM/NIP =================
exports.findUserByNpm = async (npm_nip) => {
  const result = await db.query(
    `SELECT id, role FROM users WHERE npm_nip = $1 LIMIT 1`,
    [npm_nip]
  );
  return result.rows[0];
};

// ================= CREATE ADMIN =================
exports.createAdmin = async (data) => {
  // Generate npm_nip unik: ADM-<timestamp> agar tidak duplicate (UNIQUE constraint)
  const uniqueIdentifier = `ADM-${Date.now()}`;

  const result = await db.query(
    `INSERT INTO users (name, email, password, role, npm_nip, is_verified)
     VALUES ($1, $2, $3, 'admin', $4, TRUE)
     RETURNING *`,
    [data.name, data.email, data.password, uniqueIdentifier]
  );
  return result.rows[0];
};

// ================= UPDATE USER =================
exports.updateUser = async (userId, data) => {
  const fields = [];
  const values = [];
  let idx = 1;

  if (data.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(data.name);
  }
  if (data.email !== undefined) {
    fields.push(`email = $${idx++}`);
    values.push(data.email);
  }
  if (data.npm_nip !== undefined) {
    fields.push(`npm_nip = $${idx++}`);
    values.push(data.npm_nip);
  }

  if (fields.length === 0) return null;

  values.push(userId);

  await db.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}`,
    values
  );
};

// ================= UPDATE STATUS (is_verified sebagai active/inactive) =================
exports.updateUserStatus = async (userId, is_verified) => {
  await db.query(
    `UPDATE users SET is_verified = $1 WHERE id = $2`,
    [is_verified, userId]
  );
};

// ================= DELETE USER =================
exports.deleteUser = async (userId) => {
  const result = await db.query(
    `DELETE FROM users WHERE id = $1 RETURNING id, name, email, role`,
    [userId]
  );
  return result.rows[0];
};


// ================================================================
// PBI-25: MONITORING DOKUMEN MAHASISWA
// ================================================================

// ================= GET SEMUA DOKUMEN MAHASISWA =================
exports.getAllDocuments = async (filters = {}) => {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (filters.document_type) {
    conditions.push(`d.document_type = $${idx++}`);
    values.push(filters.document_type);
  }

  if (filters.semester) {
    conditions.push(`d.semester = $${idx++}`);
    values.push(parseInt(filters.semester));
  }

  if (filters.user_id) {
    conditions.push(`d.user_id = $${idx++}`);
    values.push(filters.user_id);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await db.query(
    `SELECT d.id, d.document_type, d.semester, d.file_path, d.uploaded_at,
            u.id AS mahasiswa_id, u.name AS mahasiswa_name, u.npm_nip,
            m.angkatan, m.current_semester
     FROM dokumen_mahasiswa d
     JOIN users u ON d.user_id = u.id
     LEFT JOIN mahasiswa m ON m.user_id = u.id
     ${where}
     ORDER BY d.uploaded_at DESC`,
    values
  );
  return result.rows;
};

// ================= GET STATISTIK DOKUMEN =================
exports.getDocumentStats = async () => {
  const result = await db.query(
    `SELECT
       COUNT(DISTINCT d.user_id)                              AS total_mahasiswa,
       COUNT(CASE WHEN d.document_type = 'krs' THEN 1 END)   AS total_krs,
       COUNT(CASE WHEN d.document_type = 'khs' THEN 1 END)   AS total_khs,
       COUNT(CASE WHEN d.document_type = 'transkrip' THEN 1 END) AS total_transkrip
     FROM dokumen_mahasiswa d`
  );
  return result.rows[0];
};
