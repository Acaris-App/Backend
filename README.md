# 🌐 Acaris - Cloud-Native Academic Guidance System

## 🌟 Base URL  

Dokumentasi API dan Endpoint Utama Acaris (Sistem Informasi & Bimbingan Akademik berbasis Cloud-Native dengan Integrasi AI):

### URL Cloud Run Aktif:
- **Backend API**: `https://acaris-service-649442063927.asia-southeast2.run.app`
- **API Documentation**: `https://acaris-docs-649442063927.asia-southeast2.run.app` (atau `/docs` setelah deploy)

---

### 🗺️ Rencana Integrasi Custom Domain (Unified Routing)
Untuk mempermudah akses dan menyatukan seluruh layanan di bawah satu nama domain, sistem akan dikonfigurasi menggunakan **Google Cloud Load Balancer** dengan perutean berbasis *path-route* berikut:

```yaml
Domain Utama    : acaris.my.id (atau acaris.id)
Routing Paths   :
  - /           -> Web/Mobile Frontend (Client)
  - /api/*      -> acaris-service (Backend API di Cloud Run)
  - /docs       -> acaris-docs (Dokumentasi API di Cloud Run)
```

---

## ☁️ Cloud Technology  

*Teknologi Cloud Computing yang digunakan oleh sistem Acaris:*

**Powered by:**

<p style="text-align: center; background-color: #eee; display: inline-block; padding: 14px 20px; border-radius: 15px;">
<img src="https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg" width="250"/>
</p>

Google Cloud Platform (GCP) menyediakan infrastruktur andal untuk menjalankan komputasi backend, penyimpanan data, perutean trafik, dan pengamanan sistem Acaris.

### Layanan Cloud yang Digunakan:  
- **Google Cloud Platform**: Ekosistem utama penyedia layanan cloud.  
- **Cloud SQL (PostgreSQL)**: Database relasional utama untuk menyimpan data pengguna, dokumen, bimbingan, dan log chatbot.  
- **Cloud Storage (GCS)**: Menyimpan aset file pdf dokumen mahasiswa (KRS, KHS, transkrip) dan foto profil secara aman.  
- **Cloud Run**: Serverless compute untuk mendeploy container backend utama (`acaris-service`) dan dokumentasi (`acaris-docs`).  
- **Memorystore Redis**: Caching data, manajemen sesi, dan *rate limiter* request API.  
- **Load Balancer (HTTP/S)**: Gateway utama untuk mengaktifkan HTTPS/SSL, menyatukan sub-layanan, dan mengarahkan trafik berdasarkan URL path.  

---

## 🔧 Detail Infrastruktur Cloud  

### 🗄️ Cloud SQL  
<img src="https://raw.githubusercontent.com/Aku-Mars/gambar/refs/heads/main/cloud-sql.png" width="150" height="120" alt="Cloud SQL Icon"/>  
Database PostgreSQL relasional untuk menyimpan data terstruktur.  

```YAML
Database Type   : PostgreSQL 15+
Location        : asia-southeast2 (Jakarta)
Storage         : 10 GB (SSD)
Connection      : Cloud SQL Auth Proxy / Private IP
```
📖 [Pelajari selengkapnya tentang Cloud SQL](https://cloud.google.com/sql/docs)  

---  

### 📦 Cloud Storage  
<img src="https://symbols.getvecta.com/stencil_4/47_google-cloud-storage.fee263d33a.svg" width="150" height="120" alt="Cloud Storage Icon"/>  
Penyimpanan berkas statis berkinerja tinggi.  

```YAML
Location Type   : Region
Location        : asia-southeast2 (Jakarta)
Storage Class   : Standard
Bucket Name     : acaris-storage
```
📖 [Pelajari selengkapnya tentang Cloud Storage](https://cloud.google.com/storage/docs)  

---  

### 🚀 Cloud Run  
<img src="https://raw.githubusercontent.com/Aku-Mars/gambar/refs/heads/main/cloud-run.png" width="150" height="150" alt="Cloud Run Icon"/>  
Deployment serverless untuk container aplikasi backend Express dan Elysia.  

```YAML
Location        : asia-southeast2 (Jakarta)
Auto-scaling    : 0 to 10 instances
Port            : 3000 (acaris-service), 8080 (acaris-docs)
```
📖 [Pelajari selengkapnya tentang Cloud Run](https://cloud.google.com/run/docs)  

---  

### ⚡ Memorystore Redis  
<img src="https://i0.wp.com/jeromerajan.com/wp-content/uploads/2023/10/Cloud_Memorystore.png?resize=300%2C270&ssl=1" width="150" height="150" alt="Memorystore Redis Icon"/>  
Caching data bimbingan akademik dan backend queue untuk pengiriman OTP.  

```YAML
Location        : asia-southeast2 (Jakarta)
Tier            : Standard (High Availability)
Memory          : 1 GB
Redis Version   : 7.0
```
📖 [Pelajari selengkapnya tentang Memorystore](https://cloud.google.com/memorystore/docs/redis)  

---  

### 🔗 Load Balancer  
<img src="https://miro.medium.com/v2/resize:fit:614/1*u95QsM2JaE-wqYQkJ7Cs4w.png" width="150" height="150" alt="Load Balancer Icon"/>  
Mendistribusikan trafik dan menghubungkan multi-service di bawah satu alamat domain.  

```YAML
Location          : Global / Regional (asia-southeast2)
Type              : Application Load Balancer (HTTP/S)
Routing Mode      : Path-based Routing (/api, /docs)
Certificate       : Google-managed SSL Certificate
```
📖 [Pelajari selengkapnya tentang Load Balancing](https://cloud.google.com/load-balancing/docs)  

---

## 🌟 Layanan Utama (Services)  

Proyek ini menggunakan struktur **Monorepo** untuk menyederhanakan pengelolaan kode program di GCP:  

#### 🧠 Acaris Backend Service (`acaris-service`)
Layanan utama Express.js yang mengelola registrasi, autentikasi JWT, bimbingan akademik, slot jadwal, booking bimbingan, dashboard, serta integrasi webhook ke AI.  

#### 📚 Docs Service (`acaris-docs`)
Website dokumentasi API interaktif berbasis Elysia.js dengan UI Scalar yang menyajikan API playground untuk mencoba setiap endpoint Acaris.  

#### 🤖 AI Chatbot Service (n8n Workflow)
Layanan AI/chatbot bimbingan akademik ("Aca") yang di-host secara terpisah di VPS menggunakan n8n, dihubungkan secara aman dengan backend Acaris.  

---

## 🏗️ Cloud Architecture  

Skema arsitektur cloud sistem bimbingan Acaris:  
<p align="center">
  <img src="https://raw.githubusercontent.com/Aku-Mars/gambar/refs/heads/main/Cloud%20Architecture.png" alt="Cloud Architecture"/>
</p>  

---

## 💰 Estimasi Biaya Bulanan Google Cloud (Pricing Estimate)  

Estimasi pengeluaran bulanan dihitung menggunakan Google Cloud Pricing Calculator dengan asumsi penggunaan penuh untuk seluruh infrastruktur Acaris:  

<p align="center">
  <img src="https://raw.githubusercontent.com/Aku-Mars/gambar/refs/heads/main/GCPC.png" alt="GCP Pricing Calculator"/>
</p>  
