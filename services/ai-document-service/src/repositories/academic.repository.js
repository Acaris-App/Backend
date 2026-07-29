const db = require('../config/db');

exports.findDocument = async (documentId) => {
  const result = await db.query(
    `SELECT id, user_id, document_type, semester, file_path, uploaded_at
     FROM dokumen_mahasiswa
     WHERE id = $1`,
    [documentId]
  );
  return result.rows[0] || null;
};

exports.findCourseByCode = async (code) => {
  const result = await db.query(
    `SELECT id, kode, nama, sks
     FROM mata_kuliah
     WHERE UPPER(kode) = UPPER($1) AND status = 'aktif'`,
    [code]
  );
  return result.rows[0] || null;
};

exports.findCourseByName = async (name) => {
  const result = await db.query(
    `SELECT id, kode, nama, sks
     FROM mata_kuliah
     WHERE regexp_replace(LOWER(nama), '[^a-z0-9]+', '', 'g') =
           regexp_replace(LOWER($1), '[^a-z0-9]+', '', 'g')
       AND status = 'aktif'
     LIMIT 1`,
    [name]
  );
  return result.rows[0] || null;
};

exports.findOrCreatePeriod = async (client, { tahunMulai, jenisSemester }) => {
  const year = Number(tahunMulai);
  const kind = String(jenisSemester).toLowerCase();
  if (!Number.isInteger(year) || !['ganjil', 'genap', 'antara'].includes(kind)) return null;

  const code = `${year}-${kind === 'ganjil' ? 'G' : kind === 'genap' ? 'E' : 'A'}`;
  const existing = await client.query(
    `SELECT id FROM periode_akademik
     WHERE tahun_ajaran_mulai = $1 AND jenis_semester = $2`,
    [year, kind]
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const startMonth = kind === 'ganjil' ? 8 : kind === 'genap' ? 1 : 6;
  const endMonth = kind === 'ganjil' ? 12 : kind === 'genap' ? 6 : 7;
  const startYear = kind === 'genap' ? year + 1 : year;
  const endYear = kind === 'ganjil' ? year : year + 1;
  const inserted = await client.query(
    `INSERT INTO periode_akademik
       (kode, tahun_ajaran_mulai, jenis_semester, tanggal_mulai, tanggal_selesai)
     VALUES ($1, $2, $3, make_date($4, $5, 1),
             (make_date($6, $7, 1) + INTERVAL '1 month - 1 day')::date)
     ON CONFLICT (tahun_ajaran_mulai, jenis_semester)
     DO UPDATE SET kode = EXCLUDED.kode
     RETURNING id`,
    [code, year, kind, startYear, startMonth, endYear, endMonth]
  );
  return inserted.rows[0].id;
};

exports.createImport = async (client, data) => {
  const result = await client.query(
    `INSERT INTO academic_imports
       (mahasiswa_user_id, source_document_id, periode_akademik_id,
        knowledge_base_id, import_type, idempotency_key, status, attempt_count, raw_result, started_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'processing', 1, $7::jsonb, NOW())
     ON CONFLICT (idempotency_key)
     DO UPDATE SET status = 'processing', attempt_count = academic_imports.attempt_count + 1,
                   raw_result = EXCLUDED.raw_result, error_message = NULL,
                   started_at = NOW(), updated_at = NOW()
     RETURNING id`,
    [data.mahasiswaUserId || null, data.documentId || null, data.periodId || null,
      data.knowledgeBaseId || null, data.type, data.key, JSON.stringify(data.raw)]
  );
  return result.rows[0].id;
};

exports.upsertCourse = async (client, data) => {
  const result = await client.query(
    `INSERT INTO mata_kuliah (kode, nama, sks)
     VALUES ($1, $2, $3)
     ON CONFLICT (kode) DO UPDATE
       SET nama = EXCLUDED.nama, sks = EXCLUDED.sks, status = 'aktif', updated_at = NOW()
     RETURNING id`,
    [data.code, data.name, data.sks]
  );
  return result.rows[0].id;
};

exports.upsertCurriculumCourse = async (client, data) => {
  await client.query(
    `INSERT INTO kurikulum_mata_kuliah
       (kurikulum_id, mata_kuliah_id, semester_rekomendasi, sifat)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (kurikulum_id, mata_kuliah_id) DO UPDATE
       SET semester_rekomendasi = EXCLUDED.semester_rekomendasi,
           sifat = EXCLUDED.sifat`,
    [data.curriculumId, data.courseId, data.semester || null, data.sifat || 'wajib']
  );
};

exports.finishCurriculumImport = async (client, importId) => {
  await exports.finishImport(client, importId);
};

exports.replaceImportedRows = async (client, { importId, documentId, mahasiswaUserId }) => {
  await client.query(
    `DELETE FROM pengambilan_mata_kuliah
     WHERE source_document_id = $1 AND mahasiswa_user_id = $2`,
    [documentId, mahasiswaUserId]
  );
};

exports.insertCourseResult = async (client, data) => {
  const result = await client.query(
    `INSERT INTO pengambilan_mata_kuliah
       (mahasiswa_user_id, mata_kuliah_id, periode_akademik_id, academic_import_id,
        source_document_id, attempt, status, nilai_angka, nilai_huruf, bobot_nilai, raw_result)
     VALUES ($1, $2, $3, $4, $5,
       COALESCE((SELECT MAX(attempt) + 1 FROM pengambilan_mata_kuliah
                 WHERE mahasiswa_user_id = $1 AND mata_kuliah_id = $2), 1),
       'selesai', $6, $7, $8, $9::jsonb)
     RETURNING id`,
    [data.mahasiswaUserId, data.courseId, data.periodId, data.importId,
      data.documentId, data.score, data.grade, data.point, JSON.stringify(data.raw)]
  );
  return result.rows[0];
};

exports.finishImport = async (client, importId) => {
  await client.query(
    `UPDATE academic_imports
     SET status = 'succeeded', completed_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [importId]
  );
};

exports.failImport = async (client, importId, message) => {
  await client.query(
    `UPDATE academic_imports
     SET status = 'failed', error_message = $2, updated_at = NOW()
     WHERE id = $1`,
    [importId, message]
  );
};

exports.getSummary = async (userId) => {
  const result = await db.query(
    `SELECT * FROM v_ringkasan_akademik WHERE mahasiswa_user_id = $1`,
    [userId]
  );
  return result.rows[0] || {
    mahasiswa_user_id: userId,
    total_mata_kuliah_dinilai: 0,
    jumlah_d: 0,
    jumlah_e: 0,
    jumlah_d_e: 0,
    jumlah_wajib_diulang: 0,
    jumlah_d_melebihi_batas: 0,
    sks_lulus: 0,
    sks_d_e: 0,
    ipk_efektif: null
  };
};

exports.getEffectiveCourses = async (userId) => {
  const result = await db.query(
    `SELECT * FROM v_nilai_efektif
     WHERE mahasiswa_user_id = $1
     ORDER BY kode_mata_kuliah`,
    [userId]
  );
  return result.rows;
};

exports.getRecommendations = async (userId) => {
  const summary = await exports.getSummary(userId);
  const repeats = await db.query(
    `SELECT kode_mata_kuliah, nama_mata_kuliah, sks, nilai_huruf,
            CASE WHEN nilai_huruf = 'E' THEN 'wajib_diulang' ELSE 'pertimbangkan_perbaikan' END AS alasan
     FROM v_nilai_efektif
     WHERE mahasiswa_user_id = $1 AND nilai_huruf IN ('D', 'E')
     ORDER BY CASE nilai_huruf WHEN 'E' THEN 0 ELSE 1 END, kode_mata_kuliah`,
    [userId]
  );
  const remaining = await db.query(
    `SELECT DISTINCT mk.id, mk.kode, mk.nama, mk.sks, kmk.semester_rekomendasi, kmk.sifat
     FROM kurikulum_mata_kuliah kmk
     JOIN kurikulum k ON k.id = kmk.kurikulum_id AND k.status = 'aktif'
     JOIN mata_kuliah mk ON mk.id = kmk.mata_kuliah_id AND mk.status = 'aktif'
     LEFT JOIN v_nilai_efektif n
       ON n.mahasiswa_user_id = $1 AND n.mata_kuliah_id = mk.id AND n.lulus
     WHERE n.mata_kuliah_id IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM mata_kuliah_prasyarat p
         LEFT JOIN v_nilai_efektif pn
           ON pn.mahasiswa_user_id = $1
          AND pn.mata_kuliah_id = p.prasyarat_mata_kuliah_id
         WHERE p.kurikulum_id = k.id AND p.mata_kuliah_id = mk.id
           AND (pn.mata_kuliah_id IS NULL OR
             CASE pn.nilai_huruf WHEN 'A' THEN 4 WHEN 'B' THEN 3 WHEN 'C' THEN 2 WHEN 'D' THEN 1 ELSE 0 END <
             CASE p.nilai_minimum WHEN 'A' THEN 4 WHEN 'B' THEN 3 WHEN 'C' THEN 2 WHEN 'D' THEN 1 ELSE 0 END)
       )
     ORDER BY kmk.semester_rekomendasi NULLS LAST, mk.kode`,
    [userId]
  );
  const concentrations = await db.query(
    `SELECT k.id, k.kode, k.nama,
            COUNT(kmk.kurikulum_mata_kuliah_id) AS total_mata_kuliah,
            COUNT(n.mata_kuliah_id) FILTER (WHERE n.lulus) AS sudah_lulus,
            ROUND(100.0 * COUNT(n.mata_kuliah_id) FILTER (WHERE n.lulus) /
              NULLIF(COUNT(kmk.kurikulum_mata_kuliah_id), 0), 2) AS progres_persen
     FROM konsentrasi k
     LEFT JOIN konsentrasi_mata_kuliah kmk ON kmk.konsentrasi_id = k.id
     LEFT JOIN kurikulum_mata_kuliah c ON c.id = kmk.kurikulum_mata_kuliah_id
     LEFT JOIN v_nilai_efektif n
       ON n.mahasiswa_user_id = $1 AND n.mata_kuliah_id = c.mata_kuliah_id
     WHERE k.status = 'aktif'
     GROUP BY k.id, k.kode, k.nama
     ORDER BY progres_persen DESC NULLS LAST, k.nama`,
    [userId]
  );
  return {
    policy: { nilai_efektif: 'terbaik', batas_nilai_d: 3, nilai_e_wajib_diulang: true },
    summary,
    repeat_priorities: repeats.rows,
    minimum_d_repeats: Number(summary.jumlah_d_melebihi_batas || 0),
    eligible_remaining_courses: remaining.rows,
    concentration_progress: concentrations.rows
  };
};
