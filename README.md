<div align="center">

# 🔍 UBL Lost and Found

**Sistem Informasi Manajemen, Inventarisasi, dan Pelaporan Barang Temuan Terpadu untuk Lingkungan Kampus Universitas Budi Luhur.**

Found-Item Only · Privasi Ciri Rahasia Terisolasi · Dual-Option Camera & Galeri · Presigned Cloudflare R2 · Single-Domain Vercel Services

<br/>

[![React 19](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite%206-1570EF?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![Fastify v5](https://img.shields.io/badge/Backend-Fastify%20v5-000000?style=flat-square&logo=fastify&logoColor=white)](https://fastify.dev)
[![Neon PostgreSQL](https://img.shields.io/badge/Database-Neon%20PostgreSQL-00E599?style=flat-square&logo=postgresql&logoColor=black)](https://neon.tech)
[![Cloudflare R2](https://img.shields.io/badge/Storage-Cloudflare%20R2-F38020?style=flat-square&logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/r2/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%205.7-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vercel Services](https://img.shields.io/badge/Deploy-Vercel%20Services-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)

<br/>

[Overview](#-overview) • [Peran & Fitur](#-peran-pengguna--peta-fitur) • [Siklus Barang](#-siklus-status-barang--laporan) • [Tech Stack](#-tech-stack--struktur-monorepo) • [Arsitektur Keamanan](#-mekanisme-keamanan--teknik-kunci) • [Instalasi Lokal](#-instalasi--menjalankan-di-lokal) • [Deployment](#-build-monorepo--arsitektur-deploy) • [Troubleshooting](#-troubleshooting)

<hr/>

</div>

> [!IMPORTANT]
> **Batasan Ruang Lingkup Sistem:**  
> - Sistem ini **hanya mengelola barang yang telah ditemukan (*found items*)** — bukan portal laporan kehilangan barang (*lost reports*) ataupun klaim kepemilikan jarak jauh secara online.  
> - Seluruh proses verifikasi bukti kepemilikan dan serah terima fisik dilakukan **secara tatap muka di Pos Pengajaran (Gedung Unit 4 Lantai 1)** Universitas Budi Luhur.  
> - Tidak terdapat role `ADMIN` terpisah; otorisasi hanya membedakan **Tamu (Guest)**, **Mahasiswa (`STUDENT`)**, dan **Petugas Posko (`OFFICER`)** yang divalidasi di sisi server.

---

## ✨ Overview

**UBL Lost and Found** mendigitalisasi alur penanganan barang temuan kampus dari hulu ke hilir: mulai dari pelaporan penemuan oleh mahasiswa, pencatatan fisik oleh petugas di pos dengan kode inventaris otomatis (`INV-YYYY-XXXX`), kurasi foto terenkripsi di Cloudflare R2, katalog publik yang aman dari kebocoran ciri rahasia, hingga pengarsipan serah terima atau penyaluran barang kedaluwarsa.

### 🔥 Keunggulan Utama:
- **Privasi Terisolasi (*Privacy-by-Design*):** Kolom `private_verification_notes` (ciri rahasia barang untuk verifikasi pemilik asli) hanya dapat diakses oleh petugas dan disaring ketat sebelum data masuk ke katalog publik.
- **Upload Foto Two-Phase Anti-Replay:** Pengunggahan foto langsung ke Cloudflare R2 menggunakan *Presigned PUT URL* dan konfirmasi token kriptografis **HMAC-SHA256** berumur 15 menit yang hangus setelah 1 kali pakai (*single-use*).
- **Dual-Option Kamera & Galeri:** Mahasiswa maupun petugas dapat mengambil foto langsung lewat **kamera WebRTC** (dengan pratinjau & validasi resolusi/ukuran otomatis) atau mengunggah dari galeri perangkat.
- **Autentikasi Kampus & Token-Gated Reset:** Akun mahasiswa terikat domain resmi `@student.budiluhur.ac.id` dengan enkripsi **Bcrypt + JWT (HS256)** dan pemulihan kata sandi via tautan token email (Resend).
- **Single-Origin Deployment & Vite Proxy:** Frontend SPA dan backend Fastify berjalan di satu domain yang sama melalui konfigurasi `vercel.json` serta proxy Vite `/api` & `/storage` di lingkungan lokal—bebas isu CORS.

---

## 👥 Peran Pengguna & Peta Fitur

Sistem membagi akses secara tegas ke dalam tiga tingkatan pengguna:

| Peran | Mekanisme Akses | Kapabilitas & Fitur Utama | Rute Utama |
|---|---|---|---|
| **Tamu (Guest)** | Tanpa login (mode publik via `/` atau tombol `Ganti Peran`) | Menelusuri katalog barang `STORED` & `is_visible = true`, pencarian kata kunci/kategori, melihat detail umum barang, melihat lokasi/jam operasional Pos Pengajaran, serta panduan alur pengambilan. | `/`, `/beranda`, `/barang`, `/barang/:id`, `/pos`, `/panduan` |
| **Mahasiswa (`STUDENT`)** | Email `@student.budiluhur.ac.id` + password (Bcrypt + JWT) | Seluruh akses publik + pelaporan barang temuan mandiri (`REP-YYYY-XXXX`) dengan kamera/galeri, melacak status penerimaan fisik, membatalkan laporan (`PENDING_RECEIPT`) dengan alasan wajib, pemulihan kata sandi, dan halaman profil NIM. | `/masuk`, `/daftar`, `/lupa-sandi`, `/mahasiswa/beranda`, `/mahasiswa/lapor-temuan`, `/mahasiswa/laporan-saya`, `/mahasiswa/profil` |
| **Petugas (`OFFICER`)** | Login portal khusus petugas (Bcrypt + JWT + `assigned_post_id` dari DB) | Dashboard ringkasan KPI (`Barang tersedia`, `Sudah diserahkan`, `Laporan menunggu`), pencatatan barang temuan langsung (`INV-YYYY-XXXX`), menerima fisik laporan mahasiswa menjadi inventaris, toggle visibilitas katalog, memantau barang `OVERDUE` (> 90 hari), serta modal serah terima (`RETURNED`) dan penyaluran (`DISTRIBUTED`). | `/petugas/login`, `/petugas/dashboard`, `/petugas/inventaris`, `/petugas/inventaris/:id`, `/petugas/catat-barang`, `/petugas/laporan`, `/petugas/laporan/:id`, `/petugas/akun` |

> [!TIP]
> Pada landing page (`/`), pilihan peran tersimpan di sesi browser agar pengguna dapat langsung melanjutkan aktivitasnya, dan pengguna mode tamu tetap bisa kembali memilih peran kapan saja lewat tombol **`Ganti Peran`** di header.

---

## 🔄 Siklus Status Barang & Laporan

### 1. Siklus Laporan Penemuan Mahasiswa (`found_submissions`)
```text
[Mahasiswa Lapor + Upload Foto] ──► PENDING_RECEIPT (Menunggu serah fisik ke Pos Pengajaran)
                                       ├──► [Mahasiswa Batalkan Mandiri] ──► CANCELLED
                                       └──► [Petugas Terima Fisik di Pos] ──► RECEIVED ──► Masuk Inventaris (STORED)
```

| Status Laporan | Makna Operasional | Aksi yang Tersedia |
|---|---|---|
| `PENDING_RECEIPT` | Laporan sudah dikirim mahasiswa, barang fisik belum diserahkan ke pos. | Mahasiswa dapat membatalkan dengan alasan wajib; petugas dapat meninjau lalu menerima fisik barang. |
| `RECEIVED` | Barang fisik telah diterima petugas pos dan otomatis dibuatkan kode inventaris `INV-YYYY-XXXX`. | Laporan berstatus final dan tertaut dengan inventaris pos. |
| `CANCELLED` | Laporan dibatalkan oleh pelapor sebelum barang diserahkan ke pos. | Alasan pembatalan tercatat pada riwayat laporan. |

### 2. Siklus Inventaris Barang di Pos (`found_items`)
| Status Barang | Kriteria & Visibilitas Publik | Keterangan |
|---|---|---|
| `STORED` | Tersimpan di pos; tampil di katalog publik bila `is_visible = true`. | Pemilik sah dapat datang ke Pos Pengajaran untuk verifikasi tatap muka. |
| `OVERDUE` *(Penanda Umur)* | Barang berstatus `STORED` yang telah melewati batas simpan (`> 90 hari`). | Ditandai di tabel inventaris petugas agar dapat ditindaklanjuti penyalurannya. |
| `RETURNED` | Diserahkan ke pemilik sah *(otomatis tersembunyi dari katalog publik)*. | Mencatat nama penerima dan ringkasan hasil verifikasi kecocokan ciri rahasia. |
| `DISTRIBUTED` | Disalurkan/diarsipkan setelah masa tunggu berakhir *(aksi permanen)*. | Mencatat catatan penyaluran untuk keperluan audit pos. |

---

## 🛠️ Tech Stack & Struktur Monorepo

### Stack Teknologi
| Lapisan | Teknologi | Peran di Sistem |
|---|---|---|
| **Frontend** | React 19, TypeScript 5.7, Vite 6 | Antarmuka SPA responsif (*mobile-first*) dengan build dan HMR cepat |
| **Styling & Ikon** | Tailwind CSS v4 (`@tailwindcss/vite`), Lucide React | Sistem token CSS (`--lf-*`) dan ikon konsisten antar layar |
| **Routing** | React Router DOM v7 | Pemisahan rute Publik, Mahasiswa, dan Panel Petugas (termasuk alias `/lupa-password`) |
| **Backend API** | Node.js >= 20, Fastify v5.2, TypeScript | REST API asinkron dengan logging ter-redact (`authorization`, `email`, `token`) dan format error seragam |
| **Database & ORM** | Neon Serverless PostgreSQL, Drizzle ORM v0.38+ | Skema relasional termodularisasi (`users`, `posts`, `items`, `submissions`, `enums`, `relations`) |
| **Object Storage** | Cloudflare R2 (`@aws-sdk/client-s3` + presigner) | Penyimpanan foto privat dengan streaming endpoint `/storage/*` dan fallback lokal |
| **Auth & Email** | `bcryptjs`, HMAC-SHA256 JWT, Resend HTTP API | Verifikasi kredensial sisi server dan pengiriman tautan reset sandi ke email kampus |
| **Testing** | Vitest v5 (Frontend) / v3 (Backend), Testing Library, Zod v3 | Validasi kontrak DTO runtime, integrasi API, dan pengujian UI komponen |

### Struktur Direktori
```text
UBL_LostandFound_Project/
├── api/                                # Bundle entrypoint Fastify untuk Vercel Services
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── config/                 # Validasi environment variables (Zod)
│   │   │   ├── db/
│   │   │   │   ├── schema/             # Skema Drizzle modular (enums, users, posts, items, submissions, relations)
│   │   │   │   ├── fixtures/           # Fixture seed terpisah (officer, student, servicePost, items)
│   │   │   │   └── seed.ts             # Runner seeding idempoten
│   │   │   ├── middleware/             # Guard autentikasi JWT & RBAC (STUDENT / OFFICER)
│   │   │   ├── modules/
│   │   │   │   ├── auth/               # Login mahasiswa/petugas, register, /me, forgot & reset password
│   │   │   │   ├── items/              # Katalog publik (STORED + is_visible) & detail publik
│   │   │   │   ├── officer/            # Inventaris pos, catat barang, visibilitas, return & distribute
│   │   │   │   ├── posts/              # Informasi pos layanan aktif (Pos Pengajaran)
│   │   │   │   ├── submissions/        # Pelaporan mandiri mahasiswa & penerimaan fisik petugas
│   │   │   │   └── uploads/            # Presigned R2 PUT URL, HMAC token anti-replay, & lokal fallback
│   │   │   ├── services/               # Layanan email reset sandi (Resend)
│   │   │   ├── app.ts                  # Konfigurasi Fastify, CORS, /docs, /openapi.yaml, /storage/*
│   │   │   └── server.ts / index.ts    # Entry point local dev & serverless handler
│   │   └── tests/                      # 14 file test integrasi, keamanan, & kontrak backend
│   │
│   └── frontend/
│       ├── public/                     # Aset logo resmi & gambar layanan
│       ├── src/
│       │   ├── app/                    # Definisi router aplikasi
│       │   ├── components/
│       │   │   ├── layouts/            # PublicLayout, OfficerLayout, StudentMobileMenu
│       │   │   └── ui/                 # Komponen UI bersama (Input, Button, PhotoSourceModal, CameraCaptureModal)
│       │   ├── constants/              # RoutePaths & ACTIVE_SERVICE_POST (Pos Pengajaran)
│       │   ├── data/                   # In-memory store untuk mode mock & unit test
│       │   ├── features/               # Modul fitur terisolasi: auth, public, student, officer
│       │   ├── hooks/                  # useCameraStream & usePhotoInput
│       │   ├── pages/                  # Halaman Publik, Auth, Mahasiswa, & Panel Petugas
│       │   ├── services/               # Adapter dual-mode (HttpClient live vs InMemory mock)
│       │   ├── types/                  # Kontrak tipe API & domain mappers
│       │   ├── utils/                  # photoFile (validasi/kompresi), guestSession, helpers
│       │   └── tests/                  # 14 test suites (69 unit/integration tests) + setup
│       └── vite.config.ts              # Konfigurasi Vite + proxy /api & /storage ke :3000
│
├── API_DOCUMENTATION.md                # Ringkasan dokumentasi endpoint REST API
├── package.json                        # Root workspace & script build monorepo terpadu
└── vercel.json                         # Konfigurasi routing Vercel Services (frontend + backend)
```

---

## 🧠 Mekanisme Keamanan & Teknik Kunci

### 1. Isolasi Data Rahasia (*Zero Leakage*)
Petugas mencatat deskripsi ciri khusus barang (seperti isi dompet, stiker di balik laptop, atau nomor seri) ke kolom `private_verification_notes`. Endpoint publik `GET /api/v1/items` dan `GET /api/v1/items/:id` hanya mengembalikan item yang berstatus `STORED` dengan `is_visible = true` dan **tidak pernah menyertakan** `private_verification_notes` di payload respons. Jika item berstatus non-`STORED` atau disembunyikan, rute publik mengembalikan `404`.

### 2. Two-Phase Cloudflare R2 Upload (Anti-Replay)
```text
[Client] ──(1) POST /uploads/intents──► [Backend] ──► Validasi MIME/size + buat Presigned PUT & HMAC-SHA256 Token (15m)
[Client] ──(2) PUT binary foto─────────► [Cloudflare R2 Bucket]
[Client] ──(3) POST /uploads/:id/finalize──► [Backend] ──► Verifikasi signature HMAC + catat single-use consumed token
[Client] ──(4) Submit Form + photo_token──► [Backend] ──► Transaksi atomik simpan item/laporan + metadata foto
```
- Membatasi ukuran berkas maks. **5 MB** (`image/jpeg`, `image/png`, `image/webp`).
- Di sisi frontend (`utils/photoFile.ts`), gambar beresolusi besar atau dari kamera WebRTC otomatis dikompresi sebelum diunggah agar hemat kuota storage & cepat di jaringan kampus.

### 3. Server-Enforced RBAC & Anti-IDOR
- Parameter krusial seperti `storage_post_id` pada pencatatan barang oleh petugas **tidak diterima dari request body klien**; server mengambilnya langsung dari `assignedPostId` milik akun petugas di database.
- Akses pembatalan laporan mahasiswa divalidasi berbasis kepemilikan (`reporter_user_id === currentUser.userId`) dan hanya diizinkan saat status masih `PENDING_RECEIPT`.

### 4. Token-Gated Password Reset
- Halaman `/lupa-sandi` (dan alias `/lupa-password`) memisahkan tahap permintaan email dengan tahap pembuatan kata sandi baru secara ketat: formulir reset hanya terbuka jika URL membawa parameter `?token=...` yang valid dari email.
- Bila token tidak valid atau kedaluwarsa, pengguna diarahkan lewat aksi pemulihan ulang tanpa *dead-end button*.

---

## 📦 Prasyarat & Konfigurasi Environment

### Prasyarat
- **Node.js** `>= 20.0.0` dan **NPM** `>= 10`
- Layanan cloud (untuk mode API live):
  - **Neon PostgreSQL** (Database relasional)
  - **Cloudflare R2** *(opsional untuk dev lokal; tersedia fallback penyimpanan lokal di `apps/backend/storage/`)*
  - **Resend API Key** *(opsional untuk kirim email reset sandi sungguhan di lokal)*

### 1. Konfigurasi Backend (`apps/backend/.env`)
Salin berkas contoh environment terlebih dahulu:
```bash
cp apps/backend/.env.example apps/backend/.env
```
Sesuaikan nilai variabel berikut sesuai akun layanan Anda:
```ini
NODE_ENV=development
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173

# Neon PostgreSQL Database
DATABASE_URL=postgresql://user:password@ep-example-pooler.aws.neon.tech/neondb?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://user:password@ep-example.aws.neon.tech/neondb?sslmode=require

# Autentikasi JWT (minimal 32 karakter acak untuk produksi)
AUTH_SECRET=ganti-dengan-secret-key-minimal-32-karakter

# Cloudflare R2 Storage (opsional saat dev jika memakai fallback lokal)
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=lostandfound-budiluhur
R2_PUBLIC_URL=https://pub-your-bucket.r2.dev

# Pengiriman Email Reset Password (Resend)
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=UBL LostnFound <noreply@domain-anda.web.id>
```

### 2. Konfigurasi Frontend (`apps/frontend/.env`)
```bash
cp apps/frontend/.env.example apps/frontend/.env
```
```ini
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_USE_MOCK=false
```
> [!NOTE]
> Jika ingin mencoba UI murni tanpa menjalankan backend atau database, ubah `VITE_USE_MOCK=true` sehingga frontend memakai `InMemory` adapter bawaan.

---

## 🚀 Instalasi & Menjalankan di Lokal

### Langkah 1: Clone & Install Dependensi
```bash
git clone https://github.com/ArleneNero/UBL-Lost-and-Found.git
cd UBL-Lost-and-Found

npm install
npm install --prefix apps/backend
npm install --prefix apps/frontend
```

### Langkah 2: Push Skema Database & Jalankan Seed Awal
```bash
# Sinkronkan skema Drizzle ke Neon PostgreSQL
npm run db:push --prefix apps/backend

# Isi data awal (Pos Pengajaran, akun petugas, akun mahasiswa demo, dan item uji)
npm run db:seed --prefix apps/backend
```

### Langkah 3: Jalankan Backend & Frontend Secara Paralel
Buka **2 terminal terpisah**:

- **Terminal 1 — Backend Fastify (`http://localhost:3000`):**
  ```bash
  npm run dev --prefix apps/backend
  ```
- **Terminal 2 — Frontend Vite (`http://localhost:5173`):**
  ```bash
  npm run dev --prefix apps/frontend
  ```

> [!TIP]
> - Dokumentasi interaktif **Swagger UI** tersedia lokal di **`http://localhost:3000/docs`** (dan kontrak mentah di `/openapi.yaml`).  
> - Baik `npm run dev` (`:5173`) maupun `npm run preview` (`:4173`) pada `apps/frontend` sudah dilengkapi proxy `/api` dan `/storage` menuju `http://localhost:3000` di [`vite.config.ts`](./apps/frontend/vite.config.ts), sehingga request relatif seperti `/api/v1/auth/forgot-password` langsung tersambung ke backend lokal.

---

## ☁️ Build Monorepo & Arsitektur Deploy

Proyek dikonfigurasi untuk berjalan sebagai satu kesatuan di **Vercel Services** ([`vercel.json`](./vercel.json)):

1. Perintah root **`npm run build`** menjalankan:
   - Build backend (`tsc --noEmit` + bundling `esbuild` menjadi CommonJS standalone di `apps/backend/index.cjs`),
   - Menyalin file handler ke direktori `api/` untuk entrypoint serverless Vercel,
   - Build frontend production (`tsc -b && vite build` ke `apps/frontend/dist/`).
2. Aturan rewrite pada `vercel.json` meneruskan:
   - `/api/(.*)`, `/storage/(.*)`, `/docs`, dan `/openapi.yaml` → service **`backend`** (`api/index.cjs`)
   - Seluruh rute lain (`/(.*)`) → service **`frontend`** (SPA `index.html`)

---

## 🧪 Pengujian & Verifikasi

Jalankan pengecekan tipe statis, build, dan seluruh suite test otomatis sebelum melakukan commit:

```bash
# 1. Verifikasi Frontend (Typecheck, Production Build, & 14 Suites / 69 Tests)
npm run typecheck --prefix apps/frontend
npm run build --prefix apps/frontend
npm run test --prefix apps/frontend

# 2. Verifikasi Backend (Typecheck, Bundle Build, & Integration/Security Tests)
npm run typecheck --prefix apps/backend
npm run build --prefix apps/backend
npm run test --prefix apps/backend
```

---

## 🛠️ Troubleshooting

| Kendala | Penyebab | Solusi |
|---|---|---|
| **Login/Daftar mahasiswa ditolak** | Email tidak menggunakan domain resmi kampus. | Gunakan email berakhiran `@student.budiluhur.ac.id` (atau masukkan NIM saat login agar otomatis dipadankan). |
| **Formulir `Lupa Kata Sandi` tidak menampilkan input sandi baru** | Mengakses `/lupa-sandi` secara langsung tanpa token reset dari email. | Buka tautan reset yang mengandung `?token=...&email=...` atau minta ulang email reset di langkah awal. |
| **Request `/api/*` di Vite Preview (`:4173`) mengembalikan 404 / gagal** | Server backend belum berjalan di port `3000` atau bundle `dist` belum di-build ulang. | Jalankan `npm run dev --prefix apps/backend` di terminal lain dan jalankan `npm run build --prefix apps/frontend` sebelum preview. |
| **Kamera WebRTC gagal terbuka / izin ditolak** | Akses berasal dari origin non-HTTPS selain `localhost`, atau kamera diblokir browser. | Akses lewat `http://localhost:5173` / HTTPS produksi, izinkan akses kamera, atau pilih opsi **Pilih dari Galeri** sebagai fallback. |
| **Upload foto gagal saat submit item/laporan** | Token HMAC upload kedaluwarsa (> 15 menit) atau sudah pernah dipakai (*single-use*). | Pilih atau ambil ulang foto pada form untuk menghasilkan upload intent dan token baru. |
| **Data akun atau item uji di database lokal belum sinkron** | Skema atau data seed belum pernah dijalankan di branch Neon aktif. | Jalankan `npm run db:push --prefix apps/backend` diikuti `npm run db:seed --prefix apps/backend`. |
