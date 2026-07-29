BEGIN;

SET LOCAL search_path = public, pg_catalog;

ALTER TABLE pengambilan_mata_kuliah
  DROP CONSTRAINT IF EXISTS pengambilan_mata_kuliah_nilai_huruf_check;

ALTER TABLE pengambilan_mata_kuliah
  ADD CONSTRAINT pengambilan_mata_kuliah_nilai_huruf_check CHECK (
    nilai_huruf IS NULL
    OR nilai_huruf IN ('A', 'B+', 'B', 'C+', 'C', 'D', 'E')
  );

DROP VIEW IF EXISTS v_ringkasan_akademik;
DROP VIEW IF EXISTS v_nilai_efektif;

CREATE VIEW v_nilai_efektif AS
SELECT
  ranked.pengambilan_id,
  ranked.mahasiswa_user_id,
  ranked.mata_kuliah_id,
  ranked.kode_mata_kuliah,
  ranked.nama_mata_kuliah,
  ranked.sks,
  ranked.periode_akademik_id,
  ranked.kode_periode,
  ranked.attempt,
  ranked.nilai_angka,
  ranked.nilai_huruf,
  ranked.bobot_efektif,
  ranked.source_document_id,
  ranked.academic_import_id,
  ranked.nilai_huruf IN ('A', 'B+', 'B', 'C+', 'C', 'D') AS lulus,
  ranked.nilai_huruf IN ('D', 'E') AS perlu_perhatian
FROM (
  SELECT
    p.id AS pengambilan_id,
    p.mahasiswa_user_id,
    p.mata_kuliah_id,
    mk.kode AS kode_mata_kuliah,
    mk.nama AS nama_mata_kuliah,
    mk.sks,
    p.periode_akademik_id,
    pa.kode AS kode_periode,
    p.attempt,
    p.nilai_angka,
    p.nilai_huruf,
    COALESCE(
      p.bobot_nilai,
      CASE p.nilai_huruf
        WHEN 'A'  THEN 4.00
        WHEN 'B+' THEN 3.50
        WHEN 'B'  THEN 3.00
        WHEN 'C+' THEN 2.50
        WHEN 'C'  THEN 2.00
        WHEN 'D'  THEN 1.00
        WHEN 'E'  THEN 0.00
      END
    )::NUMERIC(3, 2) AS bobot_efektif,
    p.source_document_id,
    p.academic_import_id,
    ROW_NUMBER() OVER (
      PARTITION BY p.mahasiswa_user_id, p.mata_kuliah_id
      ORDER BY
        COALESCE(
          p.bobot_nilai,
          CASE p.nilai_huruf
            WHEN 'A'  THEN 4.00
            WHEN 'B+' THEN 3.50
            WHEN 'B'  THEN 3.00
            WHEN 'C+' THEN 2.50
            WHEN 'C'  THEN 2.00
            WHEN 'D'  THEN 1.00
            WHEN 'E'  THEN 0.00
          END
        ) DESC,
        p.nilai_angka DESC NULLS LAST,
        pa.tanggal_selesai DESC,
        p.attempt DESC,
        p.id DESC
    ) AS nilai_rank
  FROM pengambilan_mata_kuliah p
  JOIN mata_kuliah mk ON mk.id = p.mata_kuliah_id
  JOIN periode_akademik pa ON pa.id = p.periode_akademik_id
  WHERE p.status = 'selesai' AND p.nilai_huruf IS NOT NULL
) ranked
WHERE ranked.nilai_rank = 1;

CREATE VIEW v_ringkasan_akademik AS
SELECT
  n.mahasiswa_user_id,
  COUNT(*) AS total_mata_kuliah_dinilai,
  COUNT(*) FILTER (WHERE n.nilai_huruf = 'A') AS jumlah_a,
  COUNT(*) FILTER (WHERE n.nilai_huruf IN ('B+', 'B')) AS jumlah_b,
  COUNT(*) FILTER (WHERE n.nilai_huruf IN ('C+', 'C')) AS jumlah_c,
  COUNT(*) FILTER (WHERE n.nilai_huruf = 'D') AS jumlah_d,
  COUNT(*) FILTER (WHERE n.nilai_huruf = 'E') AS jumlah_e,
  COUNT(*) FILTER (WHERE n.perlu_perhatian) AS jumlah_d_e,
  COUNT(*) FILTER (WHERE n.nilai_huruf = 'E') AS jumlah_wajib_diulang,
  GREATEST(COUNT(*) FILTER (WHERE n.nilai_huruf = 'D') - 3, 0) AS jumlah_d_melebihi_batas,
  COALESCE(SUM(n.sks) FILTER (WHERE n.lulus), 0) AS sks_lulus,
  COALESCE(SUM(n.sks) FILTER (WHERE n.perlu_perhatian), 0) AS sks_d_e,
  ROUND(SUM(n.bobot_efektif * n.sks) / NULLIF(SUM(n.sks), 0), 2) AS ipk_efektif
FROM v_nilai_efektif n
GROUP BY n.mahasiswa_user_id;

COMMIT;
