BEGIN;

ALTER TABLE mahasiswa
  ADD COLUMN IF NOT EXISTS konsentrasi VARCHAR(100);

ALTER TABLE mahasiswa
  DROP CONSTRAINT IF EXISTS mahasiswa_konsentrasi_check;
ALTER TABLE mahasiswa
  ADD CONSTRAINT mahasiswa_konsentrasi_check CHECK (
    konsentrasi IS NULL OR konsentrasi IN (
      'Rekayasa Perangkat Lunak',
      'Sistem Cerdas',
      'Teknik Komputer',
      'Teknologi Informasi',
      'Sistem Komputer'
    )
  );

ALTER TABLE mahasiswa_kurikulum
  DROP CONSTRAINT IF EXISTS mahasiswa_kurikulum_source_check;
ALTER TABLE mahasiswa_kurikulum
  ADD CONSTRAINT mahasiswa_kurikulum_source_check CHECK (
    assignment_source IN ('angkatan', 'admin', 'migration', 'registration')
  );

INSERT INTO mahasiswa_kurikulum (mahasiswa_user_id, kurikulum_id, assignment_source)
SELECT m.user_id,
       CASE WHEN COALESCE(m.angkatan, 2000 + NULLIF(SUBSTRING(u.npm_nip FROM '^([0-9]{2})'), '')::INTEGER) >= 2025
         THEN (SELECT id FROM kurikulum WHERE kode = 'TI-2025' AND status = 'aktif' LIMIT 1)
         ELSE (SELECT id FROM kurikulum WHERE kode = 'TI-2020' AND status = 'aktif' LIMIT 1)
       END,
       'migration'
FROM mahasiswa m
JOIN users u ON u.id = m.user_id
WHERE NOT EXISTS (SELECT 1 FROM mahasiswa_kurikulum mk WHERE mk.mahasiswa_user_id = m.user_id)
ON CONFLICT (mahasiswa_user_id) DO NOTHING;

COMMIT;
