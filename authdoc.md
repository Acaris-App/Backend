# 🎓 Sistem Manajemen Akademik Backend (Skripsi)

Backend API untuk sistem manajemen akademik mahasiswa berbasis **Node.js**. Proyek ini dikembangkan sebagai bagian dari tugas akhir (Skripsi) dengan fokus pada keamanan autentikasi, manajemen dokumen akademik, dan logika validasi semester yang ketat.

---

## 🚀 Fitur Utama

### 🔐 Authentication & Security
- **Two-Factor Authentication (OTP):** Pengiriman kode OTP via email untuk login dan registrasi.
- **Role-Based Access Control (RBAC):** Kontrol akses berbeda untuk `mahasiswa`, `dosen`, dan `admin`.
- **JWT Authentication:** Pengamanan endpoint menggunakan JSON Web Token.
- **Rate Limiting:** Perlindungan berbasis IP untuk mencegah *brute force* dan spam OTP.
- **Security Logic:** OTP memiliki masa kedaluwarsa dan hanya dapat digunakan satu kali (*single-use*).

### 📄 Document Management System
- **Strict Validation:** Hanya menerima format PDF dengan ukuran maksimal 2MB.
- **Dependency Tracking:** Validasi keterkaitan antar dokumen (Contoh: Tidak bisa upload KHS jika KRS semester tersebut belum ada).
- **Auto-File Management:** Sistem folder per-user, penggantian nama file otomatis, dan penghapusan otomatis jika proses database gagal (*cleanup*).

### 🧠 Academic Logic System
- **Sequential Validation:** Upload KRS dan KHS harus berurutan (1, 2, 3, dst), tidak boleh melompati semester.
- **Auto Semester Progression:** Indikator semester mahasiswa otomatis meningkat berdasarkan data KHS terakhir yang valid.
- **Completeness Checker:** Fitur untuk mendeteksi dokumen yang hilang atau belum diunggah pada setiap semester.

---

## 🧱 Arsitektur Kode
Sistem ini menggunakan pola **Clean Architecture** untuk memastikan kode mudah diuji dan dikembangkan:
`Controller` → `Service` → `Repository` → `Database`

| Layer | Fungsi |
| :--- | :--- |
| **Controller** | Menangani HTTP request dan mengirimkan response. |
| **Service** | Berisi core business logic dan validasi akademik. |
| **Repository** | Berinteraksi langsung dengan database (Query). |
| **Middleware** | Proteksi Auth, pengecekan Role, dan Error Handling. |

---

## 🔗 Dokumentasi Endpoint (API)

### 1. Authentication
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| POST | `/auth/register` | Registrasi user baru & pengiriman OTP. |
| POST | `/auth/verify-register-otp` | Verifikasi akun menggunakan kode OTP. |
| POST | `/auth/login` | Login tahap 1 (Cek email/pass & kirim OTP). |
| POST | `/auth/verify-login-otp` | Login tahap 2 (Cek OTP & Generate JWT). |
| POST | `/auth/resend-otp` | Mengirim ulang kode OTP jika belum diterima. |

### 2. User & Roles
| Method | Endpoint | Akses |
| :--- | :--- | :--- |
| GET | `/user/me` | Login User |
| GET | `/user/mahasiswa` | Mahasiswa |
| GET | `/user/dosen` | Dosen |
| GET | `/user/admin` | Admin |
| GET | `/user/dashboard` | Admin & Dosen |

### 3. Academic Document
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| POST | `/document/upload` | Upload KRS/KHS (Check dependency & order). |
| GET | `/document/check` | Cek kelengkapan dokumen tiap semester. |

---

## ⚙️ Aturan Validasi Dokumen (Business Logic)

1. **KRS (Kartu Rencana Studi):** Harus diunggah secara berurutan.
2. **KHS (Kartu Hasil Studi):** - Wajib memiliki KRS di semester yang sama.
   - Harus diunggah secara berurutan.
3. **Penyimpanan:** - Path: `uploads/{userId}/nama-krs-semester-{n}-{timestamp}.pdf`
4. **Error Handling:** Menggunakan *Centralized Error Handler* untuk memastikan format response error tetap konsisten.

---

## 🗄️ Struktur Database Utama
- **Users:** Kredensial, Role, Status Verifikasi.
- **Mahasiswa:** Profil akademik, semester saat ini, IPK.
- **Dokumen Mahasiswa:** Metadata file, tipe dokumen, semester.
- **OTP Codes:** Log kode OTP, tipe, expiry, dan status penggunaan.

---

## 🧪 Pengujian
Sistem telah diuji secara komprehensif menggunakan **Postman** untuk skenario:
- [x] Alur registrasi hingga login (Flow 2FA).
- [x] Upload dokumen dengan manipulasi urutan semester (Logic Test).
- [x] Akses endpoint antar role (Permission Test).
- [x] Rate limiting dengan spam request (Security Test).

---

## 👨‍💻 Author
**Arifin** Mahasiswa Teknik Informatika  
*Backend selesai dan siap untuk diujikan pada Sidang Skripsi (BAB 4).*