BEGIN;

SET LOCAL search_path = public, pg_catalog;

ALTER TABLE academic_imports
  ADD COLUMN IF NOT EXISTS knowledge_base_id BIGINT
    REFERENCES knowledge_base(id) ON DELETE RESTRICT;

ALTER TABLE academic_imports
  ALTER COLUMN mahasiswa_user_id DROP NOT NULL,
  ALTER COLUMN source_document_id DROP NOT NULL;

ALTER TABLE academic_imports
  DROP CONSTRAINT IF EXISTS academic_imports_type_check,
  ADD CONSTRAINT academic_imports_type_check CHECK (
    import_type IN ('kurikulum', 'krs', 'khs', 'transkrip')
  ),
  DROP CONSTRAINT IF EXISTS academic_imports_source_check,
  ADD CONSTRAINT academic_imports_source_check CHECK (
    (import_type = 'kurikulum' AND knowledge_base_id IS NOT NULL)
    OR
    (import_type IN ('krs', 'khs', 'transkrip') AND mahasiswa_user_id IS NOT NULL AND source_document_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_academic_imports_knowledge_base
  ON academic_imports (knowledge_base_id)
  WHERE knowledge_base_id IS NOT NULL;

DROP VIEW IF EXISTS v_ringkasan_akademik;

CREATE VIEW v_ringkasan_akademik AS
SELECT
  n.mahasiswa_user_id,
  COUNT(*) AS total_mata_kuliah_dinilai,
  COUNT(*) FILTER (WHERE n.nilai_huruf = 'A') AS jumlah_a,
  COUNT(*) FILTER (WHERE n.nilai_huruf = 'B') AS jumlah_b,
  COUNT(*) FILTER (WHERE n.nilai_huruf = 'C') AS jumlah_c,
  COUNT(*) FILTER (WHERE n.nilai_huruf = 'D') AS jumlah_d,
  COUNT(*) FILTER (WHERE n.nilai_huruf = 'E') AS jumlah_e,
  COUNT(*) FILTER (WHERE n.perlu_perhatian) AS jumlah_d_e,
  COUNT(*) FILTER (WHERE n.nilai_huruf = 'E') AS jumlah_wajib_diulang,
  GREATEST(COUNT(*) FILTER (WHERE n.nilai_huruf = 'D') - 3, 0) AS jumlah_d_melebihi_batas,
  COALESCE(SUM(n.sks) FILTER (WHERE n.lulus), 0) AS sks_lulus,
  COALESCE(SUM(n.sks) FILTER (WHERE n.perlu_perhatian), 0) AS sks_d_e,
  ROUND(
    SUM(n.bobot_efektif * n.sks) / NULLIF(SUM(n.sks), 0),
    2
  ) AS ipk_efektif
FROM v_nilai_efektif n
GROUP BY n.mahasiswa_user_id;

COMMENT ON VIEW v_ringkasan_akademik IS
  'Academic summary using best grades, including D limit and mandatory E repeats.';

COMMIT;
