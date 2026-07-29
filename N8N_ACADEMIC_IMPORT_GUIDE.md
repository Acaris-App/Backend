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

## Rollback

Jika deploy Backend gagal, kembalikan Cloud Run ke revision sebelumnya. Jika perlu
mengembalikan database akademik, gunakan backup production sebelum migration yang
