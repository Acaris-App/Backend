# Panduan Integrasi n8n Academic Import

Dokumen ini menjelaskan perubahan workflow n8n yang diperlukan agar hasil ekstraksi
KHS dan kurikulum otomatis masuk ke tabel akademik PostgreSQL melalui Backend.

## Prinsip Integrasi

n8n hanya bertugas membaca PDF dan menghasilkan JSON. n8n **tidak menulis** tabel
`pengambilan_mata_kuliah`, `mata_kuliah`, atau `kurikulum_mata_kuliah` secara langsung.
Backend menjadi pemilik validasi, transaksi, idempotency, dan aturan nilai efektif.

Alur KHS:

```text
Webhook ekstraksi lama
  -> Download PDF
  -> Analyze document
  -> Parse JSON
  -> HTTP Request ke Backend /api/academic/internal/import-khs
```

Alur kurikulum:

```text
Schedule knowledge base
  -> ambil dokumen kategori Kurikulum
  -> Download PDF
  -> Extract/Clean course list
  -> Code node membentuk JSON courses
  -> HTTP Request ke Backend /api/academic/internal/import-curriculum
```

## Secret Callback

Buat satu secret Google Secret Manager dan gunakan nilai yang sama pada n8n:

```powershell
gcloud secrets create N8N_ACADEMIC_CALLBACK_SECRET --replication-policy=automatic --project=acaris-app
$secret = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
$secret | gcloud secrets versions add N8N_ACADEMIC_CALLBACK_SECRET --data-file=- --project=acaris-app
```

Deploy Cloud Run AI Document dengan secret tersebut melalui `cloudbuild.yaml`.
Jangan memasukkan nilainya ke file JSON workflow atau Git. Di n8n simpan nilai
yang sama pada Credentials/Variables yang hanya dapat dibaca node HTTP Request.

## Callback KHS

Tambahkan node **HTTP Request** setelah node AI selesai mengekstrak.

### Method dan URL

```text
POST https://acaris.my.id/api/academic/internal/import-khs
```

### Headers

```text
Content-Type: application/json
x-academic-callback-secret: <nilai secret yang sama>
```

### Body JSON

`document_id` harus berasal dari payload webhook awal, bukan dari hasil OCR.

```json
{
  "document_id": "={{ $('data mahasiswa').item.json.body.document_id }}",
  "result": "={{ $json.content.parts[0].text }}"
}
```

Jika nama node webhook berbeda, sesuaikan referensi node tersebut. Field `result`
boleh berupa object JSON atau string JSON. Backend dapat membersihkan code fence
Markdown dan mengambil object JSON dari teks, tetapi output n8n tetap wajib JSON.

### Format hasil KHS

```json
{
  "jenis_dokumen": "KHS",
  "informasi_semester": {
    "semester": 3,
    "tahun_ajaran": "2025/2026 Genap"
  },
  "daftar_nilai": [
    {
      "kode_mk": "INF001",
      "nama_mk": "Algoritma",
      "kredit": 3,
      "huruf_mutu": "B",
      "nilai_angka": 80
    }
  ]
}
```

Jangan mengirim nilai yang tidak terbaca sebagai nilai buatan. Jika dokumen tidak
terbaca, biarkan callback gagal dan ulangi ekstraksi setelah workflow diperbaiki.

### Response yang diharapkan

```json
{
  "status": "success",
  "data": {
    "import_id": 1,
    "document_id": 10,
    "imported_items": 8
  }
}
```

Jika Backend mengembalikan `422`, jangan lanjutkan seolah-olah sukses. Tambahkan
IF node untuk mencatat error dan mengirim notifikasi/log.

## Callback Kurikulum

Kurikulum harus memiliki row pada tabel `kurikulum` terlebih dahulu. Untuk tahap
pertama, buat satu row aktif secara SQL/seed dengan kode dan tahun yang sesuai
dokumen. Nilai `kurikulum_id` dikirim dari node Set atau Code.

### URL

```text
POST https://acaris.my.id/api/academic/internal/import-curriculum
```

### Body JSON

```json
{
  "knowledge_base_id": 1,
  "result": {
    "kurikulum_id": 1,
    "version": "2025",
    "courses": [
      {
        "kode": "INF001",
        "nama": "Algoritma",
        "sks": 3,
        "semester": 1,
        "sifat": "wajib"
      }
    ]
  }
}
```

`knowledge_base_id` berasal dari row database knowledge base. `courses` wajib berupa
array. Backend akan melakukan upsert berdasarkan kode mata kuliah dan mapping
berdasarkan `(kurikulum_id, mata_kuliah_id)`.

## Empat Konsentrasi

Versi Backend saat ini membandingkan keempat konsentrasi, bukan menyimpan pilihan
mahasiswa. Karena workflow lama belum memiliki struktur konsentrasi, tambahkan
field berikut pada setiap course bila informasi tersebut tersedia:

```json
{
  "kode": "INF401",
  "nama": "Pembelajaran Mesin",
  "sks": 3,
  "semester": 5,
  "sifat": "pilihan",
  "konsentrasi": ["AI"]
}
```

Mapping konsentrasi belum diaktifkan oleh callback awal. Jangan membuat empat tabel
terpisah; gunakan tabel `konsentrasi_mata_kuliah` dan seed empat konsentrasi.

Dokumen Kurikulum TI 2025 yang tersedia tidak menyebut empat nama konsentrasi
secara resmi. Seed awal menggunakan empat kelompok analitis berikut agar fitur
perbandingan dapat berjalan, dan harus diganti jika program studi memberikan daftar
resmi: RPL/Platform, Data-AI-Visual, Jaringan-Cloud-Keamanan, dan Sistem
Informasi-Enterprise-Tata Kelola. Tidak ada prasyarat mata kuliah yang di-seed
karena dokumen sumber tidak mencantumkan prasyarat eksplisit.

## Backfill KHS Production

Setelah callback aktif dan master mata kuliah sudah terisi, jalankan dari folder
`services/ai-document-service` pada environment yang dapat mengakses database:

```powershell
$env:NODE_ENV = 'production'
npm run backfill:academic
```

Script akan membaca KHS yang sudah mempunyai `isi_teks_dokumen`, memproses ulang
secara idempotent berdasarkan dokumen, dan mencetak ringkasan sukses/gagal. KHS
yang belum memiliki hasil ekstraksi tidak diisi dengan data kosong.

Untuk tujuh KHS tanpa ekstraksi dan KHS dengan format lama, jalankan ulang workflow
ekstraksi dokumen. Setelah n8n selesai mengirim callback, tidak perlu menjalankan
backfill untuk dokumen itu lagi.

Kurikulum SIAKAD 2020 sudah ditambahkan sebagai master terpisah dengan kode
`TI-2020`. Kode `INF620...`/`UNI620...` tidak dikonversi menjadi `INF625...`.
Mahasiswa angkatan sebelum 2025 ditetapkan ke TI-2020, sedangkan angkatan 2025
dan sesudahnya ditetapkan ke TI-2025. KHS tanpa `daftar_nilai` tetap perlu
diekstrak ulang dengan prompt format terbaru.

Lima mata kuliah agama pada semester 2 dimodelkan sebagai kelompok alternatif
`AGAMA`: mahasiswa cukup lulus salah satu sesuai agamanya. Sistem tidak akan
merekomendasikan kelima mata kuliah agama sekaligus setelah salah satunya lulus.

Hasil backfill setelah master TI-2020 tersedia pada 29 Juli 2026:

```text
KHS dengan teks ekstraksi: 42
KHS berhasil dinormalisasi: 31
Hasil mata kuliah terstruktur: 302
Mahasiswa dengan data terstruktur: 7
KHS format lama/tidak lengkap: 11
KHS tanpa teks ekstraksi: 7
Total perlu ekstraksi ulang n8n: 18
```

Sebelas KHS gagal karena tidak mempunyai `daftar_nilai` atau memiliki item tanpa
nilai valid. Tujuh KHS lainnya belum pernah menerima teks hasil ekstraksi. Semua
18 dokumen tersebut perlu dikirim ulang melalui workflow ekstraksi terbaru; master
kode TI-2020 tidak lagi menjadi penghambat.

## Verifikasi SQL

Gunakan query read-only berikut:

```sql
SELECT COUNT(*) FROM pengambilan_mata_kuliah;
SELECT * FROM v_nilai_efektif WHERE mahasiswa_user_id = <user_id>;
SELECT * FROM v_ringkasan_akademik WHERE mahasiswa_user_id = <user_id>;
```

Pastikan:

- satu mata kuliah hanya punya satu nilai efektif;
- nilai terbaik dipilih ketika ada pengulangan;
- nilai E masuk `jumlah_wajib_diulang`;
- nilai D di atas tiga masuk `jumlah_d_melebihi_batas`;
- import ulang tidak menggandakan row dari dokumen sumber yang sama.

## Ubah Postgres Tool Chatbot

Workflow chatbot lama mengambil seluruh `dokumen_mahasiswa.isi_teks_dokumen`.
Setelah backfill, arahkan pertanyaan nilai dan riwayat studi ke view terstruktur.
Gunakan parameter query n8n, jangan interpolasi string NPM ke SQL.

Query nilai efektif:

```sql
SELECT
  n.kode_mata_kuliah,
  n.nama_mata_kuliah,
  n.sks,
  n.kode_periode,
  n.nilai_huruf,
  n.nilai_angka,
  n.lulus,
  n.perlu_perhatian
FROM v_nilai_efektif n
JOIN users u ON u.id = n.mahasiswa_user_id
WHERE u.npm_nip = $1
ORDER BY n.kode_periode, n.kode_mata_kuliah;
```

Query ringkasan D/E:

```sql
SELECT
  r.total_mata_kuliah_dinilai,
  r.jumlah_d,
  r.jumlah_e,
  r.jumlah_wajib_diulang,
  r.jumlah_d_melebihi_batas,
  r.sks_lulus,
  r.ipk_efektif
FROM v_ringkasan_akademik r
JOIN users u ON u.id = r.mahasiswa_user_id
WHERE u.npm_nip = $1;
```

Aturan prompt chatbot:

```text
- Nilai efektif adalah nilai terbaik dari semua percobaan.
- A, B, C, dan D lulus pada tingkat mata kuliah.
- Nilai D perlu perhatian; maksimal tiga nilai D efektif.
- Jika jumlah D lebih dari tiga, jumlah_d_melebihi_batas adalah minimum mata
  kuliah D yang perlu diperbaiki.
- Nilai E tidak lulus dan wajib diulang.
- Jangan menyatakan mata kuliah lama setara kurikulum baru tanpa mapping resmi.
- Jika ringkasan tidak ditemukan, jelaskan bahwa KHS belum berhasil dinormalisasi.
```

Untuk rekomendasi, n8n dapat memanggil Backend dengan JWT mahasiswa melalui
`GET /api/academic/recommendations`. Jika workflow tidak boleh menyimpan JWT,
duplikasi query rekomendasi tidak disarankan; buat internal endpoint service-to-
service dengan secret terpisah pada pengembangan berikutnya.

## Transisi Bucket Private

Bucket saat ini tidak boleh langsung dibuat private karena mobile dan n8n masih
menggunakan URL `storage.googleapis.com` yang tersimpan di database. Urutan aman:

1. Buat service account runtime khusus tanpa file key.
2. Beri `roles/storage.objectAdmin` hanya pada `acaris-storage`.
3. Pasang service account tersebut pada Auth dan AI Document Cloud Run.
4. Beri kemampuan `iam.serviceAccounts.signBlob` agar library GCS membuat signed URL.
5. Ubah seluruh response foto, dokumen, dan knowledge base menjadi signed URL baca
   dengan masa berlaku yang sesuai, tetapi pertahankan object path canonical di DB.
6. Ubah payload ekstraksi n8n agar menerima signed URL baru setiap trigger.
7. Uji upload/list/download/update/delete di mobile dan n8n.
8. Baru hapus binding `allUsers:roles/storage.objectViewer` dan aktifkan Public
   Access Prevention.

Jangan mengunduh JSON service-account key. Gunakan attached service account Cloud
Run dan attached service account VM n8n atau signed URL dari Backend.

## Rollback

Jika deploy Backend gagal, kembalikan Cloud Run ke revision sebelumnya. Jika perlu
mengembalikan database akademik, gunakan backup production sebelum migration yang
