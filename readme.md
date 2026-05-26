# Acaris Backend

Backend Acaris adalah layanan utama untuk sistem bimbingan akademik. Kondisi arsitektur saat ini:

- Backend utama berjalan di Google Cloud Run.
- Layanan AI/chatbot berjalan terpisah di VPS melalui n8n.
- Backend masih berupa satu aplikasi Express modular, dengan pemisahan layer controller, service, repository, middleware, dan route.
- Rencana pemecahan backend menjadi beberapa service independen disimpan sebagai rencana lanjutan.

Formulasi yang aman untuk skripsi saat ini adalah **cloud-native modular backend dengan layanan AI terpisah**, bukan klaim pure microservices yang semua modul backend-nya sudah dipisah.

## Arsitektur Sementara

```text
Mobile/Frontend
  -> Acaris Backend (Cloud Run)
    -> PostgreSQL
    -> Redis
    -> Google Cloud Storage
    -> n8n AI Service (VPS)
```

Service yang berjalan:

- `acaris-service`: backend utama di Cloud Run.
- `n8n`: workflow AI/chatbot di VPS.

## Endpoint Penting

```text
GET  /health
POST /auth/login
POST /auth/register/mahasiswa
POST /auth/register/dosen
GET  /user/profile
GET  /mahasiswa/dashboard
GET  /dosen/dashboard
GET  /admin/dashboard
POST /document/upload
GET  /document/list
POST /schedule
GET  /schedule/available
POST /schedule/book
GET  /chatbot/session/active
POST /chatbot/message
POST /chatbot/session/:session_id/generate-summary
POST /chatbot/session/:session_id/close
POST /api/chat-bot
```

`/health` dipakai untuk smoke test CI/CD karena tidak membutuhkan token.

## Environment

Untuk kebutuhan skripsi, satu environment production/staging sederhana masih cukup. Yang penting:

- Jangan commit secret asli ke repository.
- Runtime Cloud Run tetap memakai Secret Manager untuk secret penting.
- GitHub Actions cukup diberi secret non-sensitif berupa URL backend untuk smoke test.

Repository secret yang disarankan:

```text
ACARIS_BASE_URL=https://url-cloud-run-kamu
```

Cara set di GitHub:

```text
Repository -> Settings -> Secrets and variables -> Actions -> New repository secret
```

## Local Development

```bash
npm install
npm run dev
```

Pastikan `.env.local` tersedia dan berisi konfigurasi DB, Redis, JWT, GCS, email, dan port.

## Test Lokal Ringan

```bash
npm test
```

Isi test saat ini:

- `npm run check:syntax`: mengecek syntax semua file JavaScript di `src`.
- `npm run check:postman`: memastikan Postman collection di folder `tests` valid sebagai JSON.

Test ini belum menggantikan functional test penuh, tetapi cukup sebagai quality gate awal di CI/CD.

## GitHub Actions

Workflow yang tersedia:

```text
.github/workflows/backend-ci.yml
.github/workflows/jmeter-load-test.yml
```

### Backend CI

Trigger:

- Otomatis saat push ke `main`.
- Otomatis saat pull request ke `main`.
- Manual melalui `workflow_dispatch`.

Tahapan:

```text
checkout -> npm ci -> npm test -> optional /health smoke test
```

Smoke test `/health` hanya berjalan jika secret `ACARIS_BASE_URL` sudah diisi.

Artifact yang bisa diunduh untuk data skripsi:

- `backend-ci-summary`
- `health-smoke-test`

Cara mengambil hasil:

```text
GitHub -> repository Backend -> Actions -> pilih run -> Artifacts -> download
```

### JMeter Load Test

Workflow JMeter dibuat manual agar load test tidak berjalan setiap push dan tidak membebani Cloud Run, database, Redis, atau VPS n8n tanpa sengaja.

Cara menjalankan:

```text
GitHub -> Actions -> JMeter Load Test -> Run workflow
```

Input contoh:

```text
target_url: https://url-cloud-run-kamu/health
users: 50
ramp_up: 30
duration: 60
```

Untuk skenario 100 user:

```text
target_url: https://url-cloud-run-kamu/health
users: 100
ramp_up: 60
duration: 120
```

Artifact yang dihasilkan:

- `result.jtl`
- folder `report`
- `jmeter-summary.md`

Data ini bisa dipakai untuk:

- average response time
- throughput
- error rate
- bukti performance testing

## Postman dan Newman

Kalau test manual sudah dilakukan di Postman, hasilnya bisa diambil dengan cara:

```text
Postman -> Collection Runner -> Run collection -> Export Results
```

Simpan hasil export sebagai lampiran atau bukti Bab 4.

Kalau ingin hasil Postman yang lebih mudah dijadikan artifact, gunakan Newman:

```bash
npx newman run tests/Acaris_API.postman_collection.json \
  --reporters cli,json \
  --reporter-json-export test-results/postman/acaris-api-result.json
```

Catatan:

- Jangan commit environment Postman yang berisi token atau password.
- Untuk endpoint yang butuh login, siapkan Postman environment lokal atau GitHub secret terpisah.
- Untuk CI awal, cukup gunakan `/health` karena aman dan tidak butuh auth.

## Data Untuk Skripsi

Data yang perlu dikumpulkan setelah aplikasi stabil:

| Tujuan/Data | Sumber |
| --- | --- |
| Deployment frequency | Jumlah deployment sukses dari GitHub Actions/Cloud Build/Cloud Run dalam periode pengamatan |
| Lead time for change | Selisih timestamp commit sampai deployment sukses |
| Change failure rate | Jumlah deployment gagal dibagi total deployment |
| MTTR | Selisih waktu failure terdeteksi sampai recovery/deployment sukses ulang |
| Pipeline success rate | Jumlah run sukses dibagi total run GitHub Actions/Cloud Build |
| Functional testing | Export hasil Postman/Newman |
| Regression testing | Run ulang collection setelah perubahan fitur |
| Performance testing | Artifact JMeter `.jtl` dan HTML report |
| Cloud reliability | Log Cloud Run dan status revision |

Urutan kerja yang disarankan:

1. Stabilkan fitur aplikasi.
2. Pastikan `/health` aktif.
3. Aktifkan GitHub Actions `Backend CI`.
4. Isi secret `ACARIS_BASE_URL`.
5. Jalankan beberapa push/sprint agar data pipeline terkumpul.
6. Export hasil Postman manual atau jalankan Newman.
7. Jalankan JMeter manual untuk 50 dan 100 user.
8. Ambil artifact GitHub Actions dan laporan JMeter.
9. Susun tabel DORA dan hasil testing untuk Bab 4.

## Deployment

Deployment saat ini menggunakan Cloud Build dan Cloud Run melalui `cloudbuild.yaml`. GitHub Actions yang ditambahkan di repository ini berperan sebagai quality gate/testing. Jika Cloud Build trigger sudah tersambung ke GitHub, maka deployment tetap dapat berjalan setelah push.

Alur yang bisa dijelaskan:

```text
GitHub push
  -> GitHub Actions untuk testing
  -> Cloud Build untuk build image dan deploy
  -> Cloud Run menjalankan acaris-service
```

Jika nanti backend dipecah, workflow bisa dikembangkan menjadi beberapa service:

```text
auth-service
acaris-service
chatbot-gateway-service
```

Untuk saat ini, rencana tersebut cukup dicatat sebagai pengembangan lanjutan.
