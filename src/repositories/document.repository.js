const db = require('../config/db');

// ================= LIST DOCUMENTS (dengan filter opsional) =================
exports.getDocumentsList = async (userId, filters = {}) => {
  const conditions = ['user_id = $1'];
  const values = [userId];
  let idx = 2;

  if (filters.document_type) {
    conditions.push(`document_type = $${idx++}`);
    values.push(filters.document_type);
  }

  if (filters.semester) {
    conditions.push(`semester = $${idx++}`);
    values.push(parseInt(filters.semester));
  }

  const where = conditions.join(' AND ');

  const result = await db.query(
    `SELECT id, document_type, semester, file_path, uploaded_at
     FROM dokumen_mahasiswa
     WHERE ${where}
     ORDER BY document_type ASC, semester ASC`,
    values
  );

  return result.rows;
};

// ================= CREATE =================
exports.createDocument = async (data) => {
  const result = await db.query(
    `INSERT INTO dokumen_mahasiswa 
    (user_id, document_type, semester, file_path, uploaded_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING *`,
    [
      data.user_id,
      data.document_type,
      data.semester,
      data.file_path
    ]
  );

  return result.rows[0];
};

// ================= FIND BY TYPE & SEMESTER =================
exports.findByUserTypeSemester = async (userId, type, semester) => {
  const result = await db.query(
    `SELECT * FROM dokumen_mahasiswa
     WHERE user_id = $1 
     AND document_type = $2 
     AND semester = $3`,
    [userId, type, semester]
  );

  return result.rows[0];
};

// ================= GET BY USER & TYPE =================
exports.getValidDocuments = async (userId, type) => {
  const result = await db.query(
    `SELECT * FROM dokumen_mahasiswa 
     WHERE user_id = $1 AND document_type = $2`,
    [userId, type]
  );

  return result.rows;
};

// ================= GET ALL BY USER =================
exports.getDocumentsByUser = async (userId) => {
  const result = await db.query(
    `SELECT document_type, semester 
     FROM dokumen_mahasiswa 
     WHERE user_id = $1`,
    [userId]
  );

  return result.rows;
};

// ================= CEK MINIMAL 1 FILE DI SEMESTER TERTENTU =================
exports.hasAnyDocumentForSemester = async (userId, semester) => {
  const result = await db.query(
    `SELECT 1 FROM dokumen_mahasiswa
     WHERE user_id = $1
       AND semester = $2
       AND document_type IN ('krs', 'khs')
     LIMIT 1`,
    [userId, semester]
  );
  return result.rows.length > 0;
};

// ================= LAST SEMESTER BY TYPE =================
exports.getLastSemester = async (userId, type) => {
  const docs = await exports.getValidDocuments(userId, type);

  if (!docs.length) return 0;

  return Math.max(...docs.map(d => d.semester));
};

// ================= FIND BY ID =================
exports.findById = async (documentId, userId) => {
  const result = await db.query(
    `SELECT * FROM dokumen_mahasiswa WHERE id = $1 AND user_id = $2`,
    [documentId, userId]
  );

  return result.rows[0];
};

// ================= DELETE =================
exports.deleteDocument = async (documentId, userId) => {
  const result = await db.query(
    `DELETE FROM dokumen_mahasiswa
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [documentId, userId]
  );

  return result.rows[0];
};

// ================= UPDATE FILE PATH =================
exports.updateFilePath = async (documentId, filePath) => {
  const result = await db.query(
    `UPDATE dokumen_mahasiswa
     SET file_path = $1, uploaded_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [filePath, documentId]
  );

  return result.rows[0];
};
