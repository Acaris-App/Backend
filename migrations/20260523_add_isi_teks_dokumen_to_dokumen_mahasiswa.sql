ALTER TABLE IF EXISTS dokumen_mahasiswa
  ADD COLUMN IF NOT EXISTS isi_teks_dokumen TEXT;

COMMENT ON COLUMN dokumen_mahasiswa.isi_teks_dokumen IS
  'Hasil ekstraksi teks PDF untuk kebutuhan workflow n8n/chatbot. Nullable agar dokumen lama dan upload baru tetap aman sebelum ekstraksi selesai.';
