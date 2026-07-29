const db = require('../config/db');
const repository = require('../repositories/academic.repository');

const gradePoints = { A: 4, B: 3, C: 2, D: 1, E: 0 };

const asObject = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  let text = String(value).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first >= 0 && last > first) text = text.slice(first, last + 1);
  try { return JSON.parse(text); } catch (_) { return null; }
};

const getItems = (payload) => payload?.daftar_nilai || payload?.data?.daftar_nilai || payload?.items || [];

const getInfo = (payload) => payload?.informasi_semester || payload?.semester_info || {};

const normalizeGrade = (value) => {
  const grade = String(value || '').trim().toUpperCase().replace(/[+\-]/g, '');
  return gradePoints[grade] === undefined ? null : grade;
};

const normalizeScore = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(String(value).replace(',', '.'));
  return Number.isFinite(number) && number >= 0 && number <= 100 ? number : null;
};

const importKhs = async ({ documentId, payload }) => {
  const parsed = asObject(payload);
  if (!parsed) throw { status: 422, message: 'Hasil ekstraksi KHS bukan JSON yang valid' };

  const document = await repository.findDocument(documentId);
  if (!document || document.document_type !== 'khs') {
    throw { status: 422, message: 'Dokumen sumber bukan KHS yang valid' };
  }

  const items = getItems(parsed);
  if (!Array.isArray(items) || items.length === 0) {
    throw { status: 422, message: 'Hasil ekstraksi KHS tidak memiliki daftar nilai' };
  }

  const info = getInfo(parsed);
  const semester = Number(info.semester || document.semester);
  const yearMatch = String(info.tahun_ajaran || '').match(/(19|20)\d{2}/);
  const year = yearMatch ? Number(yearMatch[0]) : new Date().getFullYear();
  const kind = /genap|even/i.test(String(info.tahun_ajaran || '')) ? 'genap' : 'ganjil';
  const normalized = items.map((item) => {
    const code = String(item.kode_mk || item.kode || item.kode_matakuliah || '').trim().toUpperCase();
    const name = String(item.nama_mk || item.nama || item.nama_mata_kuliah || '').trim();
    const grade = normalizeGrade(item.huruf_mutu || item.nilai_huruf || item.nilai);
    const score = normalizeScore(item.nilai_angka || item.nilai_numerik);
    if (!code || !name || !grade) throw { status: 422, message: 'Item KHS memiliki kode, nama, atau nilai yang tidak valid' };
    return { code, name, grade, score, raw: item };
  });

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const periodId = await repository.findOrCreatePeriod(client, { tahunMulai: year, jenisSemester: kind });
    const importKey = `khs:${document.id}:${document.uploaded_at?.toISOString?.() || document.uploaded_at || 'current'}`;
    const importId = await repository.createImport(client, {
      mahasiswaUserId: document.user_id,
      documentId: document.id,
      periodId,
      type: 'khs',
      key: importKey,
      raw: parsed
    });
    await repository.replaceImportedRows(client, {
      importId, documentId: document.id, mahasiswaUserId: document.user_id
    });
    for (const item of normalized) {
      const course = await repository.findCourseByCode(item.code) || await repository.findCourseByName(item.name);
      if (!course) throw { status: 422, message: `Mata kuliah ${item.code} tidak ditemukan di master kurikulum` };
      await repository.insertCourseResult(client, {
        mahasiswaUserId: document.user_id,
        courseId: course.id,
        periodId,
        importId,
        documentId: document.id,
        score: item.score,
        grade: item.grade,
        point: gradePoints[item.grade],
        raw: item.raw
      });
    }
    await repository.finishImport(client, importId);
    await client.query('COMMIT');
    return { import_id: importId, document_id: document.id, imported_items: normalized.length };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

exports.importKhs = importKhs;
const ensureMahasiswa = (user) => {
  if (!user || user.role !== 'mahasiswa') {
    throw { status: 403, message: 'Hanya mahasiswa yang dapat mengakses data akademik personal' };
  }
};

exports.getSummary = ({ user }) => {
  ensureMahasiswa(user);
  return repository.getSummary(user.id);
};

exports.getCourses = ({ user }) => {
  ensureMahasiswa(user);
  return repository.getEffectiveCourses(user.id);
};

exports.importCurriculum = async ({ knowledgeBaseId, payload }) => {
  const parsed = asObject(payload) || payload;
  const courses = parsed?.courses || parsed?.mata_kuliah || [];
  if (!Number.isInteger(Number(parsed?.kurikulum_id)) || !Array.isArray(courses) || !courses.length) {
    throw { status: 422, message: 'Callback kurikulum membutuhkan kurikulum_id dan courses' };
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const importId = await repository.createImport(client, {
      knowledgeBaseId,
      type: 'kurikulum',
      key: `kurikulum:${knowledgeBaseId}:${parsed.version || 'current'}`,
      raw: parsed
    });
    for (const item of courses) {
      const code = String(item.kode || item.kode_mk || '').trim().toUpperCase();
      const name = String(item.nama || item.nama_mk || '').trim();
      const sks = Number(item.sks || item.kredit);
      if (!code || !name || !Number.isInteger(sks) || sks < 1 || sks > 12) {
        throw { status: 422, message: `Data mata kuliah kurikulum tidak valid: ${code || 'kode kosong'}` };
      }
      const courseId = await repository.upsertCourse(client, { code, name, sks });
      await repository.upsertCurriculumCourse(client, {
        curriculumId: Number(parsed.kurikulum_id),
        courseId,
        semester: Number(item.semester) || null,
        sifat: item.sifat === 'pilihan' ? 'pilihan' : 'wajib'
      });
    }
    await repository.finishCurriculumImport(client, importId);
    await client.query('COMMIT');
    return { import_id: importId, knowledge_base_id: knowledgeBaseId, imported_items: courses.length };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
