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
            kb.uploaded_at
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

// ================= GET ALL USERS =================
exports.getAllUsers = async (filters = {}) => {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (filters.role) {
    conditions.push(`role = $${idx++}`);
    values.push(filters.role);
  }

  if (filters.is_verified !== undefined) {
    conditions.push(`is_verified = $${idx++}`);
    values.push(filters.is_verified);
  }

  if (filters.search) {
    conditions.push(`(name ILIKE $${idx} OR email ILIKE $${idx} OR npm_nip ILIKE $${idx})`);
    values.push(`%${filters.search}%`);
    idx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await db.query(
    `SELECT id, name, email, npm_nip, role, profile_picture, is_verified, created_at
     FROM users
     ${where}
     ORDER BY created_at DESC`,
    values
  );
  return result.rows;
};

// ================= GET USER BY ID =================
exports.findUserById = async (userId) => {
  const result = await db.query(
    `SELECT id, name, email, npm_nip, role, profile_picture, is_verified, created_at
     FROM users WHERE id = $1`,
    [userId]
  );
  return result.rows[0];
};

// ================= UPDATE STATUS AKUN =================
exports.updateUserStatus = async (userId, is_verified) => {
  const result = await db.query(
    `UPDATE users SET is_verified = $1 WHERE id = $2
     RETURNING id, name, email, npm_nip, role, is_verified`,
    [is_verified, userId]
  );
  return result.rows[0];
};

// ================= DELETE AKUN =================
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
