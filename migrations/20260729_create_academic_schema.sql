BEGIN;

SET LOCAL search_path = public, pg_catalog;

-- Incremental academic schema. Existing application tables are intentionally
-- left unchanged because their production shape differs from the baseline.
DO $preflight$
DECLARE
  relation_name TEXT;
  required_column RECORD;
BEGIN
  FOREACH relation_name IN ARRAY ARRAY['users', 'mahasiswa', 'dokumen_mahasiswa']
  LOOP
    IF to_regclass('public.' || relation_name) IS NULL THEN
      RAISE EXCEPTION 'Required relation public.% does not exist', relation_name;
    END IF;
  END LOOP;

  FOR required_column IN
    SELECT requirement.relation_name, requirement.column_name
    FROM (VALUES
      ('users', 'id'),
      ('dokumen_mahasiswa', 'id')
    ) AS requirement(relation_name, column_name)
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_attribute
      WHERE attrelid = ('public.' || required_column.relation_name)::REGCLASS
        AND attname = required_column.column_name
        AND NOT attisdropped
        AND atttypid IN ('smallint'::REGTYPE, 'integer'::REGTYPE, 'bigint'::REGTYPE)
    ) THEN
      RAISE EXCEPTION 'Required column public.%.% must exist and use an integer type',
        required_column.relation_name, required_column.column_name;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = 'public.mahasiswa'::REGCLASS
      AND attname IN ('user_id', 'id')
      AND NOT attisdropped
      AND atttypid IN ('smallint'::REGTYPE, 'integer'::REGTYPE, 'bigint'::REGTYPE)
  ) THEN
    RAISE EXCEPTION 'public.mahasiswa must expose an integer user_id or id column';
  END IF;
END
$preflight$;

CREATE TABLE kurikulum (
  id BIGSERIAL PRIMARY KEY,
  kode VARCHAR(50) NOT NULL UNIQUE,
  nama VARCHAR(255) NOT NULL,
  tahun_mulai SMALLINT NOT NULL,
  tahun_selesai SMALLINT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT kurikulum_kode_not_blank CHECK (BTRIM(kode) <> ''),
  CONSTRAINT kurikulum_nama_not_blank CHECK (BTRIM(nama) <> ''),
  CONSTRAINT kurikulum_tahun_check CHECK (
    tahun_mulai BETWEEN 1900 AND 2999
    AND (tahun_selesai IS NULL OR tahun_selesai BETWEEN tahun_mulai AND 2999)
  ),
  CONSTRAINT kurikulum_status_check CHECK (status IN ('draft', 'aktif', 'nonaktif'))
);

CREATE TABLE mata_kuliah (
  id BIGSERIAL PRIMARY KEY,
  kode VARCHAR(50) NOT NULL UNIQUE,
  nama VARCHAR(255) NOT NULL,
  sks SMALLINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'aktif',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mata_kuliah_kode_not_blank CHECK (BTRIM(kode) <> ''),
  CONSTRAINT mata_kuliah_nama_not_blank CHECK (BTRIM(nama) <> ''),
  CONSTRAINT mata_kuliah_sks_check CHECK (sks BETWEEN 1 AND 12),
  CONSTRAINT mata_kuliah_status_check CHECK (status IN ('aktif', 'nonaktif'))
);

CREATE TABLE konsentrasi (
  id BIGSERIAL PRIMARY KEY,
  kode VARCHAR(50) NOT NULL UNIQUE,
  nama VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'aktif',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT konsentrasi_kode_not_blank CHECK (BTRIM(kode) <> ''),
  CONSTRAINT konsentrasi_nama_not_blank CHECK (BTRIM(nama) <> ''),
  CONSTRAINT konsentrasi_status_check CHECK (status IN ('aktif', 'nonaktif'))
);

CREATE TABLE kurikulum_mata_kuliah (
  id BIGSERIAL PRIMARY KEY,
  kurikulum_id BIGINT NOT NULL REFERENCES kurikulum(id) ON DELETE CASCADE,
  mata_kuliah_id BIGINT NOT NULL REFERENCES mata_kuliah(id) ON DELETE RESTRICT,
  semester_rekomendasi SMALLINT,
  sifat VARCHAR(20) NOT NULL DEFAULT 'wajib',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT kurikulum_mata_kuliah_unique UNIQUE (kurikulum_id, mata_kuliah_id),
  CONSTRAINT kurikulum_mata_kuliah_semester_check CHECK (
    semester_rekomendasi IS NULL OR semester_rekomendasi BETWEEN 1 AND 14
  ),
  CONSTRAINT kurikulum_mata_kuliah_sifat_check CHECK (sifat IN ('wajib', 'pilihan'))
);

CREATE TABLE konsentrasi_mata_kuliah (
  konsentrasi_id BIGINT NOT NULL REFERENCES konsentrasi(id) ON DELETE CASCADE,
  kurikulum_mata_kuliah_id BIGINT NOT NULL
    REFERENCES kurikulum_mata_kuliah(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (konsentrasi_id, kurikulum_mata_kuliah_id)
);

CREATE TABLE mata_kuliah_prasyarat (
  id BIGSERIAL PRIMARY KEY,
  kurikulum_id BIGINT NOT NULL REFERENCES kurikulum(id) ON DELETE CASCADE,
  mata_kuliah_id BIGINT NOT NULL REFERENCES mata_kuliah(id) ON DELETE CASCADE,
  prasyarat_mata_kuliah_id BIGINT NOT NULL REFERENCES mata_kuliah(id) ON DELETE RESTRICT,
  nilai_minimum CHAR(1) NOT NULL DEFAULT 'D',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mata_kuliah_prasyarat_unique UNIQUE (
    kurikulum_id, mata_kuliah_id, prasyarat_mata_kuliah_id
  ),
  CONSTRAINT mata_kuliah_prasyarat_not_self CHECK (
    mata_kuliah_id <> prasyarat_mata_kuliah_id
  ),
  CONSTRAINT mata_kuliah_prasyarat_nilai_check CHECK (
    nilai_minimum IN ('A', 'B', 'C', 'D', 'E')
  )
);

CREATE TABLE periode_akademik (
  id BIGSERIAL PRIMARY KEY,
  kode VARCHAR(30) NOT NULL UNIQUE,
  tahun_ajaran_mulai SMALLINT NOT NULL,
  jenis_semester VARCHAR(20) NOT NULL,
  tanggal_mulai DATE NOT NULL,
  tanggal_selesai DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'direncanakan',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT periode_akademik_kode_not_blank CHECK (BTRIM(kode) <> ''),
  CONSTRAINT periode_akademik_tahun_check CHECK (tahun_ajaran_mulai BETWEEN 1900 AND 2999),
  CONSTRAINT periode_akademik_jenis_check CHECK (
    jenis_semester IN ('ganjil', 'genap', 'antara')
  ),
  CONSTRAINT periode_akademik_tanggal_check CHECK (tanggal_selesai >= tanggal_mulai),
  CONSTRAINT periode_akademik_status_check CHECK (
    status IN ('direncanakan', 'aktif', 'selesai', 'dibatalkan')
  ),
  CONSTRAINT periode_akademik_tahun_jenis_unique UNIQUE (
    tahun_ajaran_mulai, jenis_semester
  )
);

CREATE TABLE academic_imports (
  id BIGSERIAL PRIMARY KEY,
  mahasiswa_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_document_id BIGINT NOT NULL REFERENCES dokumen_mahasiswa(id) ON DELETE RESTRICT,
  periode_akademik_id BIGINT REFERENCES periode_akademik(id) ON DELETE RESTRICT,
  import_type VARCHAR(20) NOT NULL,
  idempotency_key VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  raw_result JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT academic_imports_key_not_blank CHECK (BTRIM(idempotency_key) <> ''),
  CONSTRAINT academic_imports_type_check CHECK (import_type IN ('krs', 'khs', 'transkrip')),
  CONSTRAINT academic_imports_status_check CHECK (
    status IN ('pending', 'processing', 'succeeded', 'failed')
  ),
  CONSTRAINT academic_imports_attempt_check CHECK (attempt_count >= 0),
  CONSTRAINT academic_imports_raw_result_check CHECK (
    raw_result IS NULL OR jsonb_typeof(raw_result) IN ('object', 'array')
  ),
  CONSTRAINT academic_imports_completed_at_check CHECK (
    completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at
  )
);

CREATE TABLE pengambilan_mata_kuliah (
  id BIGSERIAL PRIMARY KEY,
  mahasiswa_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mata_kuliah_id BIGINT NOT NULL REFERENCES mata_kuliah(id) ON DELETE RESTRICT,
  periode_akademik_id BIGINT NOT NULL REFERENCES periode_akademik(id) ON DELETE RESTRICT,
  academic_import_id BIGINT REFERENCES academic_imports(id) ON DELETE SET NULL,
  source_document_id BIGINT REFERENCES dokumen_mahasiswa(id) ON DELETE RESTRICT,
  attempt SMALLINT NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'diambil',
  nilai_angka NUMERIC(5, 2),
  nilai_huruf CHAR(1),
  bobot_nilai NUMERIC(3, 2),
  raw_result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pengambilan_mata_kuliah_attempt_unique UNIQUE (
    mahasiswa_user_id, mata_kuliah_id, periode_akademik_id, attempt
  ),
  CONSTRAINT pengambilan_mata_kuliah_attempt_check CHECK (attempt >= 1),
  CONSTRAINT pengambilan_mata_kuliah_status_check CHECK (
    status IN ('direncanakan', 'diambil', 'selesai', 'dibatalkan')
  ),
  CONSTRAINT pengambilan_mata_kuliah_nilai_angka_check CHECK (
    nilai_angka IS NULL OR nilai_angka BETWEEN 0 AND 100
  ),
  CONSTRAINT pengambilan_mata_kuliah_nilai_huruf_check CHECK (
    nilai_huruf IS NULL OR nilai_huruf IN ('A', 'B', 'C', 'D', 'E')
  ),
  CONSTRAINT pengambilan_mata_kuliah_bobot_check CHECK (
    bobot_nilai IS NULL OR bobot_nilai BETWEEN 0 AND 4
  ),
  CONSTRAINT pengambilan_mata_kuliah_nilai_status_check CHECK (
    (nilai_angka IS NULL AND nilai_huruf IS NULL AND bobot_nilai IS NULL)
    OR status = 'selesai'
  ),
  CONSTRAINT pengambilan_mata_kuliah_raw_result_check CHECK (
    raw_result IS NULL OR jsonb_typeof(raw_result) IN ('object', 'array')
  )
);

CREATE INDEX idx_kurikulum_status ON kurikulum (status);
CREATE INDEX idx_mata_kuliah_nama ON mata_kuliah (nama);
CREATE INDEX idx_kurikulum_mata_kuliah_mata_kuliah
  ON kurikulum_mata_kuliah (mata_kuliah_id);
CREATE INDEX idx_konsentrasi_mata_kuliah_kurikulum
  ON konsentrasi_mata_kuliah (kurikulum_mata_kuliah_id);
CREATE INDEX idx_mata_kuliah_prasyarat_target
  ON mata_kuliah_prasyarat (mata_kuliah_id, kurikulum_id);
CREATE INDEX idx_mata_kuliah_prasyarat_source
  ON mata_kuliah_prasyarat (prasyarat_mata_kuliah_id);
CREATE INDEX idx_periode_akademik_status_tanggal
  ON periode_akademik (status, tanggal_mulai, tanggal_selesai);
CREATE INDEX idx_academic_imports_mahasiswa_created
  ON academic_imports (mahasiswa_user_id, created_at DESC);
CREATE INDEX idx_academic_imports_document
  ON academic_imports (source_document_id);
CREATE INDEX idx_academic_imports_pending
  ON academic_imports (status, created_at)
  WHERE status IN ('pending', 'processing');
CREATE INDEX idx_pengambilan_mahasiswa_periode
  ON pengambilan_mata_kuliah (mahasiswa_user_id, periode_akademik_id);
CREATE INDEX idx_pengambilan_mata_kuliah
  ON pengambilan_mata_kuliah (mata_kuliah_id);
CREATE INDEX idx_pengambilan_import
  ON pengambilan_mata_kuliah (academic_import_id)
  WHERE academic_import_id IS NOT NULL;
CREATE INDEX idx_pengambilan_source_document
  ON pengambilan_mata_kuliah (source_document_id)
  WHERE source_document_id IS NOT NULL;

-- A-E map to 4-0. The effective result is the best grade across all attempts;
-- numeric score, recency, and row id deterministically break ties.
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
  ranked.nilai_huruf IN ('A', 'B', 'C') AS lulus,
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
        WHEN 'A' THEN 4.00
        WHEN 'B' THEN 3.00
        WHEN 'C' THEN 2.00
        WHEN 'D' THEN 1.00
        WHEN 'E' THEN 0.00
      END
    )::NUMERIC(3, 2) AS bobot_efektif,
    p.source_document_id,
    p.academic_import_id,
    ROW_NUMBER() OVER (
      PARTITION BY p.mahasiswa_user_id, p.mata_kuliah_id
      ORDER BY
        CASE p.nilai_huruf
          WHEN 'A' THEN 4
          WHEN 'B' THEN 3
          WHEN 'C' THEN 2
          WHEN 'D' THEN 1
          WHEN 'E' THEN 0
        END DESC,
        p.nilai_angka DESC NULLS LAST,
        pa.tanggal_selesai DESC,
        p.attempt DESC,
        p.id DESC
    ) AS nilai_rank
  FROM pengambilan_mata_kuliah p
  JOIN mata_kuliah mk ON mk.id = p.mata_kuliah_id
  JOIN periode_akademik pa ON pa.id = p.periode_akademik_id
  WHERE p.status = 'selesai'
    AND p.nilai_huruf IS NOT NULL
) ranked
WHERE ranked.nilai_rank = 1;

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
  COALESCE(SUM(n.sks) FILTER (WHERE n.lulus), 0) AS sks_lulus,
  COALESCE(SUM(n.sks) FILTER (WHERE n.perlu_perhatian), 0) AS sks_d_e,
  ROUND(
    SUM(n.bobot_efektif * n.sks) / NULLIF(SUM(n.sks), 0),
    2
  ) AS ipk_efektif
FROM v_nilai_efektif n
GROUP BY n.mahasiswa_user_id;

COMMENT ON VIEW v_nilai_efektif IS
  'One best A-E grade per student and course. A-C pass; D/E require academic attention.';
COMMENT ON VIEW v_ringkasan_akademik IS
  'Academic summary calculated from best grades, including explicit D/E counts.';

COMMIT;
