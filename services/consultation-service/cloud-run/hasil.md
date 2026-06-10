# Bukti Cloud Run Acaris

Dokumen ini merapihkan bukti revision Cloud Run yang diambil dari Google Cloud Console.

## Ringkasan

| Item | Nilai |
| --- | --- |
| Service | `acaris-service` |
| Platform | Google Cloud Run |
| Revision aktif | `acaris-service-00089-rtn` |
| Traffic revision aktif | 100% |
| Revision sebelumnya | `acaris-service-00088-grk` |
| Status bukti | Deployment Cloud Run tersedia dan revision terbaru menerima seluruh traffic |
| File bukti tambahan | `Backend/data/cloud-build/Hasil Cloud Build.pdf` |

## Revision Terbaru

| Revision | Traffic | Waktu Deploy |
| --- | ---: | --- |
| `acaris-service-00089-rtn` | 100% | 23 minutes ago |
| `acaris-service-00088-grk` | 0% | 32 minutes ago |
| `acaris-service-00087-6pl` | 0% | 37 minutes ago |
| `acaris-service-00086-5ls` | 0% | 41 minutes ago |
| `acaris-service-00085-zvf` | 0% | 1 hour ago |
| `acaris-service-00084-h7z` | 0% | 1 hour ago |
| `acaris-service-00083-trh` | 0% | 1 hour ago |
| `acaris-service-00082-tl9` | 0% | 1 hour ago |
| `acaris-service-00081-7wh` | 0% | 1 hour ago |
| `acaris-service-00080-4fp` | 0% | 5 hours ago |

## Ringkasan Historis

| Periode | Jumlah Revision Terlihat | Catatan |
| --- | ---: | --- |
| 7 April 2026 sampai 26 Mei 2026 | 89 revision | Berdasarkan daftar revision `acaris-service-00001-gms` sampai `acaris-service-00089-rtn`. |
| 26 Mei 2026 | 10 revision terbaru | Menunjukkan deployment masih aktif dilakukan pada hari pengambilan bukti. |

## Interpretasi untuk Skripsi

Revision Cloud Run menunjukkan bahwa deployment backend Acaris sudah berjalan otomatis/berulang sampai revision `acaris-service-00089-rtn`. Revision terbaru menerima 100% traffic, sehingga dapat digunakan sebagai bukti bahwa hasil build/deploy terakhir sudah menjadi versi aktif layanan.

Untuk Bab 4, bukti ini dapat dipakai bersama:

| Bukti | Lokasi |
| --- | --- |
| Cloud Build | `Backend/data/cloud-build/Hasil Cloud Build.pdf` |
| Cloud Run revision | `Backend/data/cloud-run/hasil.md` |
| Health endpoint | `Backend/data/CI/backend-ci-run-26455851477-20260526-215720/health-smoke-test/` |
| Functional test | `Backend/data/postman-actions/postman-run-26455851552-20260526-215325/` |
| Load test 50 user | `Backend/data/jmeter-actions/jmeter-run-26452721777-20260526-210707/` |
| Load test 100 user | `Backend/data/jmeter-actions/jmeter-run-26456664899-20260526-220831/` |
