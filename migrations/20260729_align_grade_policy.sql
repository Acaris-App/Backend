BEGIN;

SET LOCAL search_path = public, pg_catalog;

CREATE OR REPLACE VIEW v_nilai_efektif AS
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
  ranked.nilai_huruf IN ('A', 'B', 'C', 'D') AS lulus,
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
        WHEN 'A' THEN 4.00 WHEN 'B' THEN 3.00 WHEN 'C' THEN 2.00
        WHEN 'D' THEN 1.00 WHEN 'E' THEN 0.00
      END
    )::NUMERIC(3, 2) AS bobot_efektif,
    p.source_document_id,
    p.academic_import_id,
    ROW_NUMBER() OVER (
      PARTITION BY p.mahasiswa_user_id, p.mata_kuliah_id
      ORDER BY
        CASE p.nilai_huruf
          WHEN 'A' THEN 4 WHEN 'B' THEN 3 WHEN 'C' THEN 2
          WHEN 'D' THEN 1 WHEN 'E' THEN 0
        END DESC,
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

COMMENT ON VIEW v_nilai_efektif IS
  'Best grade per student/course. A-D pass; D needs attention; E must be repeated.';

COMMIT;
