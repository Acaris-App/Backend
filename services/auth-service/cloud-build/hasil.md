# Bukti Cloud Build Acaris

Dokumen ini merapihkan data Cloud Build yang diambil dari Google Cloud Console. Data status gagal pada bagian awal diambil dari screenshot Cloud Build tanggal 7 April 2026.

## Ringkasan

| Item | Nilai |
| --- | ---: |
| Trigger | `acaris-service-main` |
| Repository | `Acaris-App/Backend` |
| Branch | `main` |
| Region | `asia-southeast2` |
| Periode data | 7 April 2026 - 26 Mei 2026 |
| Total build attempt tercatat | 95 |
| Build sukses tercatat | 87 |
| Build gagal tercatat | 8 |
| Build success rate | 91,58% |
| Build failure rate | 8,42% |
| File PDF bukti | `Backend/data/cloud-build/Hasil Cloud Build.pdf` |

## Build Terbaru

| Status | Build ID | Commit | Created | Duration | Catatan |
| --- | --- | --- | --- | --- | --- |
| Sukses | `89a67d96` | `d974c3d` | 26 Mei 2026, 21:51 WIB | 2 min 15 sec | Build terbaru pada data. |
| Sukses | `cfc14240` | `674c2e8` | 26 Mei 2026, 21:41 WIB | 2 min 37 sec | Build setelah perbaikan filter role Postman. |
| Sukses | `771125d9` | `d3d5672` | 26 Mei 2026, 21:37 WIB | 2 min 38 sec | Build setelah perluasan coverage Postman. |
| Sukses | `95c22e1f` | `e2de04f` | 26 Mei 2026, 21:32 WIB | 2 min 35 sec | Build setelah penambahan role functional tests. |
| Sukses | `0b099584` | `6bdc673` | 26 Mei 2026, 21:07 WIB | 2 min 16 sec | Build setelah helper artifact JMeter. |
| Sukses | `24359070` | `ad6ce23` | 26 Mei 2026, 20:53 WIB | 2 min 36 sec | Build setelah local JMeter runner. |
| Sukses | `1aef46b5` | `caa255b` | 26 Mei 2026, 20:48 WIB | 2 min 38 sec | Build setelah workflow JMeter tanpa Docker. |
| Sukses | `095d4e92` | `6fe8cce` | 26 Mei 2026, 20:44 WIB | 2 min 20 sec | Build setelah default JMeter target URL. |
| Sukses | `b60bf979` | `12f5fd3` | 26 Mei 2026, 20:39 WIB | 2 min 36 sec | Build setelah update host database produksi. |

## Build Gagal pada Awal Implementasi

| Status | Build ID | Commit | Created | Duration | Catatan |
| --- | --- | --- | --- | --- | --- |
| Gagal | `434c65b7` | `aa9a7a4` | 7 April 2026, 06:28 | 3 min 32 sec | Gagal berdasarkan screenshot Cloud Build. |
| Gagal | `b4001992` | `aa9a7a4` | 7 April 2026, 06:11 | 3 min 41 sec | Gagal berdasarkan screenshot Cloud Build. |
| Gagal | `9263dcc4` | `71f8da1` | 7 April 2026, 06:04 | 1 min 5 sec | Gagal berdasarkan screenshot Cloud Build. |
| Gagal | `ea974665` | `88e8cf6` | 7 April 2026, 05:55 | 1 min 31 sec | Gagal berdasarkan screenshot Cloud Build. |
| Gagal | `20927015` | `6d6d929` | 7 April 2026, 04:14 | 1 min 32 sec | Gagal berdasarkan screenshot Cloud Build. |
| Gagal | `86e9bf6c` | `6d6d929` | 7 April 2026, 04:07 | 1 min 13 sec | Gagal berdasarkan screenshot Cloud Build. |
| Gagal | `e3f19de5` | `6d6d929` | 7 April 2026, 04:07 | 1 min 23 sec | Gagal berdasarkan screenshot Cloud Build. |
| Gagal | `926997e4` | Tidak tercatat | 7 April 2026, 04:05 | Tidak tercatat | Gagal berdasarkan screenshot Cloud Build; source/commit tidak tampil. |

## Build Sukses Awal Setelah Kegagalan

| Status | Build ID | Commit | Created | Duration | Catatan |
| --- | --- | --- | --- | --- | --- |
| Sukses | `1e698ed3` | `ff825c3` | 7 April 2026, 06:44 | 3 min 27 sec | Build sukses pertama yang terlihat setelah rangkaian build gagal awal. |

## Perhitungan Success Rate Cloud Build

```text
Build success rate = build sukses / total build attempt x 100%
Build success rate = 87 / 95 x 100% = 91,58%
```

```text
Build failure rate = build gagal / total build attempt x 100%
Build failure rate = 8 / 95 x 100% = 8,42%
```

## Interpretasi untuk Skripsi

Cloud Build menunjukkan bahwa proses build dan deployment backend sudah berjalan melalui trigger `acaris-service-main` pada branch `main`. Pada awal implementasi tanggal 7 April 2026 terdapat beberapa build gagal, yang wajar pada fase konfigurasi awal pipeline. Setelah konfigurasi stabil, build berikutnya berjalan sukses dan menghasilkan revision Cloud Run yang aktif.

Untuk narasi Bab 4, data ini dapat digunakan untuk menjelaskan:

| Poin | Interpretasi |
| --- | --- |
| Build awal gagal | Menunjukkan proses debugging konfigurasi pipeline pada tahap awal implementasi. |
| Build sukses awal | Build `1e698ed3` menjadi bukti pipeline mulai berhasil pada 7 April 2026. |
| Build terbaru sukses | Build `89a67d96` menjadi bukti pipeline masih berjalan pada 26 Mei 2026. |
| Success rate | 91,58% untuk Cloud Build pada data yang tercatat. |

## Catatan Batasan

Status gagal hanya ditandai eksplisit untuk build yang terlihat gagal pada screenshot Cloud Build. Jika diperlukan angka final yang lebih kuat, data dapat diekspor langsung dari Google Cloud Build agar seluruh kolom status terbaca secara otomatis.
