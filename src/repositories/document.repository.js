const db = require('../config/db');
const fs = require('fs');

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

// ================= DUPLICATE =================
exports.findByUserTypeSemester = async (userId, type, semester) => {

  if (type === 'transkrip') return null;

  const result = await db.query(
    `SELECT * FROM dokumen_mahasiswa
     WHERE user_id = $1 
     AND document_type = $2 
     AND semester = $3`,
    [userId, type, semester]
  );

  return result.rows[0];
};

// ================= VALID DOCS =================
exports.getValidDocuments = async (userId, type) => {
  const result = await db.query(
    `SELECT * FROM dokumen_mahasiswa 
     WHERE user_id = $1 AND document_type = $2`,
    [userId, type]
  );

  const validDocs = [];

  for (const doc of result.rows) {
    if (fs.existsSync(doc.file_path)) {
      validDocs.push(doc);
    } else {
      // 🔥 AUTO CLEAN DB
      await db.query(
        `DELETE FROM dokumen_mahasiswa WHERE id = $1`,
        [doc.id]
      );
    }
  }

  return validDocs;
};

// ================= CHECK DOCUMENT =================
exports.getDocumentsByUser = async (userId) => {
  const result = await db.query(
    `SELECT document_type, semester 
     FROM dokumen_mahasiswa 
     WHERE user_id = $1`,
    [userId]
  );

  return result.rows;
};

// ================= LAST SEMESTER =================
exports.getLastSemester = async (userId, type) => {

  const docs = await exports.getValidDocuments(userId, type);

  if (!docs.length) return 0;

  return Math.max(...docs.map(d => d.semester));
};