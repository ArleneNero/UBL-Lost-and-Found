# UBL Lost and Found

Sistem Informasi Manajemen, Inventarisasi, dan Pelaporan Barang Temuan Terpadu berbasis web untuk lingkungan **Universitas Budi Luhur**. Mengadopsi arsitektur monorepo modern, performa tinggi, dan standar keamanan berorientasi privasi (*Privacy-by-Design*).

---

## 📌 Daftar Isi
1. [Tentang Sistem (About)](#-tentang-sistem-about)
2. [Arsitektur Monorepo & Tech Stack](#-arsitektur-monorepo--tech-stack)
3. [Kontrak & Sumber Kebenaran Data](#-kontrak--sumber-kebenaran-data)
4. [Roadmap & Status Milestone](#-roadmap--status-milestone)
   - [Milestone Backend (B/A – B/M)](#1-backend-milestones-ba--bm)
   - [Milestone Frontend (F/A – F/G)](#2-frontend-milestones-fa--fg)
5. [Instalasi & Menjalankan Proyek](#-instalasi--menjalankan-proyek)
   - [Prasyarat](#prasyarat)
   - [Konfigurasi Environment](#konfigurasi-environment)
   - [Backend: Database, Seed & Server](#backend-appsbackend)
   - [Frontend: Menjalankan UI](#frontend-appsfrontend)
   - [Pengujian Otomatis (Testing)](#pengujian-otomatis-testing)
6. [Struktur Direktori Monorepo](#-struktur-direktori-monorepo)
7. [Kebijakan Keamanan & Kualitas Kode](#-kebijakan-keamanan--kualitas-kode)

---

## 📖 Tentang Sistem (About)

**UBL Lost and Found** mendigitalisasi dan menstandardisasi seluruh proses penanganan barang temuan di lingkungan Universitas Budi Luhur, mulai dari pelaporan, pencatatan fisik di pos, kurasi foto, verifikasi kepemilikan, hingga serah terima barang kepada pemilik sah.

### 1. Peran Pengguna (Roles & Access Control)
* **Guest (Publik / Tanpa Akun):**
  * Akses katalog publik barang temuan (`status = STORED` dan `is_visible = true`).
  * Pencarian berbasis kategori, lokasi temuan, dan rentang tanggal.
  * Melihat detail publik barang (karakteristik umum).
  * *Catatan:* Tidak memiliki akses ke catatan verifikasi rahasia atau identitas penemu.
* **Mahasiswa (Student / Terautentikasi):**
  * Login akun kampus via Neon Auth (Managed Better Auth).
  * Membuat laporan penemuan barang secara mandiri.
  * Memantau status laporan dan riwayat interaksi dengan pos operasional.
* **Petugas (Officer / Berwenang):**
  * Petugas resmi yang bertugas di pos operasional (Pos Pengajaran, Pos Keamanan, dll.).
  * Pencatatan barang temuan fisik secara langsung ke sistem dengan nomor inventaris otomatis (`INV-YYYY-XXXX`).
  * Unggah foto barang aman ke Cloudflare R2 dengan token anti-replay.
  * Mengelola status barang (`STORED`, `CLAIMED`, `DISPOSED`), catatan verifikasi rahasia (*private notes*), serta verifikasi klaim tatap muka.

### 2. Batasan Ruang Lingkup Sistem
* Sistem secara eksklusif mengelola **barang yang telah ditemukan** (*found items*), bukan portal laporan kehilangan online (*lost reports*) ataupun klaim kepemilikan jarak jauh.
* Seluruh proses klaim dan serah terima barang **wajib dilakukan secara fisik** di Pos Pengajaran dengan mencocokkan bukti identitas dan ciri khusus barang yang tercatat pada sistem.
* Tidak ada role `ADMIN` di database. Otorisasi berbasis role `STUDENT` dan `OFFICER` yang diputuskan secara *server-side* langsung dari tabel database pengguna.

---

## 🛠 Arsitektur Monorepo & Tech Stack

Sistem dibangun dalam satu repository monorepo dengan pemisahan tegas antara antarmuka klien dan penyedia layanan data:

```
UBL-LostnFound/
├── apps/
│   ├── frontend/        # React 19 SPA (Vite + Tailwind CSS v4)
│   └── backend/         # Fastify v5 REST API (TypeScript + Drizzle ORM)
└── .agent-internal/     # Canonical OpenAPI v1.0 & ERD v6.2 Contracts
```

| Domain | Komponen | Teknologi | Keterangan |
|---|---|---|---|
| **Frontend** | Framework | React 19, TypeScript 5.7+ | Tipe data ketat, modern component model |
| | Bundler | Vite 6 | Build pipeline ultra-cepat dan Hot Module Replacement (HMR) |
| | Styling | Tailwind CSS v4 (`@tailwindcss/vite`) | Engine styling performa tinggi berbasis CSS tokens |
| | Routing | React Router DOM v7 | Manajemen navigasi client-side |
| | Icons | Lucide React | Library ikon konsisten sesuai frame Figma |
| | Testing | Vitest + Testing Library | Pengujian komponen dan alur mock |
| **Backend** | Runtime & Core | Node.js v20+, Fastify v5.2+ | Server web mikro asinkron berkinerja tinggi |
| | ORM & Query | Drizzle ORM v0.38+, Drizzle Kit | SQL-like query builder type-safe tanpa overhead berat |
| | Database | Neon Serverless PostgreSQL | Database relasional cloud dengan instant branching |
| | Auth & Identity | Neon Auth (Managed Better Auth) | Autentikasi modern berbasis session/JWT terverifikasi server-side |
| | Object Storage | Cloudflare R2 (`@aws-sdk/client-s3`) | S3-compatible private storage tanpa biaya data transfer |
| | Validasi DTO | Zod v3.24+ | Validasi skema runtime untuk request body, query, dan env |
| | Testing | Vitest v3.0+ | 12 Test Suites, 94 unit/integration/security tests |

---

## 📜 Kontrak & Sumber Kebenaran Data

Pengembangan sistem tidak didasarkan pada asumsi, melainkan berpatokan ketat pada dokumen spesifikasi kanonikal:
1. **OpenAPI v1.0 Specification (`openapi-v1.0.yaml`):** Menentukan seluruh kontrak 22 HTTP endpoints, metode, path, struktur payload (`snake_case`), response envelopes, pagination meta, dan kode error baku.
2. **ERD v6.2 Data Model (`erd-v6.2.dbml`):** Mendefinisikan struktur 8 tabel relasional database:
   - `users` (Penyimpanan akun lokal terhubung ke Neon Auth `auth_user_id`)
   - `roles` & `user_roles` (Role-based access: `STUDENT`, `OFFICER`)
   - `service_posts` (Pos operasional kampus, e.g. Pos Pengajaran)
   - `categories` (Kategori klasifikasi barang)
   - `found_items` (Entitas utama barang temuan dan status inventaris)
   - `item_photos` (Relasi metadata foto barang pada Cloudflare R2)
   - `claim_records` (Catatan bukti serah terima dan penyelesaian klaim)
3. **Figma Exact Policy:** Implementasi UI pada frontend berpatokan penuh pada rancangan Figma Page 05 (Frame per Role) dan Page 00 (Design System).

---

## 🗺 Roadmap & Status Milestone

### 1. Backend Milestones (B/A – B/M)

```
[B/A] ──► [B/B] ──► [B/C] ──► [B/D] ──► [B/E] ──► [B/F] ──► [MVP GATE LULUS]
                                                                  │
[B/M] ◄── [B/L] ◄── [B/K] ◄── [B/J] ◄── [B/I] ◄── [B/H] ◄── [B/G] ◄┘
```

| ID | Fokus & Ruang Lingkup | Status | Detail Capaian |
|:---:|---|:---:|---|
| **B/A** | **Preflight, Contract Audit & Environment Initialization** | ✅ Selesai | Verifikasi OpenAPI v1.0 & ERD v6.2, konfigurasi environment Drizzle dan Neon. |
| **B/B** | **Database Architecture, Modular Schemas & Idempotent Seeding** | ✅ Selesai | Skema termodularisasi $\le 80$ LOC per domain, runner seed idempoten dengan 15 item uji. |
| **B/C** | **Public Catalog & Item Details API** | ✅ Selesai | `GET /api/v1/items` dan `GET /api/v1/items/:id` (hanya `STORED` + `is_visible=true`, 404 security filter). |
| **B/D** | **Authentication & Role-Based Access Control (RBAC)** | ✅ Selesai | Verifikasi Neon Auth server-side, `authenticateGuard`, `requireOfficerGuard`, proteksi IDOR. |
| **B/E** | **Secure Cloudflare R2 Upload Pipeline** | ✅ Selesai | `POST /uploads/intents` (Presigned PUT) & `POST /uploads/:id/finalize` (HMAC token anti-replay). |
| **B/F** | **Officer Item Registration & MVP Quality Gate** | ✅ **LULUS** | `POST /api/v1/officer/items`, nomor `INV-YYYY-XXXX`, transaksi atomik, **94/94 Test PASS**. |
| **B/G** | **Officer Inventory Management & Overdue Lifecycle** | 📋 *Planned* | `GET /officer/inventory`, filter status, toggle visibilitas, audit barang kedaluwarsa (>90 hari). |
| **B/H** | **Student Portal & Submission Tracking** | 📋 *Planned* | Endpoint pelaporan mandiri mahasiswa dan riwayat status barang. |
| **B/I** | **Physical Verification & Handover Registry** | 📋 *Planned* | Pencatatan penerimaan fisik barang dari penemu ke Petugas Pos Pengajaran. |
| **B/J** | **Claim Verification, Return & Distribution** | 📋 *Planned* | Alur verifikasi bukti klaim tatap muka dan pengarsipan serah terima barang. |
| **B/K** | **Frontend UI Integration & Contract Validation** | 📋 *Planned* | Penyambungan antarmuka React ke API Fastify dengan validasi parity data live. |
| **B/L** | **Security Hardening, Rate Limiting & Penetration Audit** | 📋 *Planned* | Proteksi brute force, HTTP Security Headers (Helmet), pembatasan rate limit IP. |
| **B/M** | **Staging Deployment & Pos Pengajaran Pilot Launch** | 📋 *Planned* | Deployment cloud staging dan uji coba operasional di Pos Pengajaran UBL. |

---

### 2. Frontend Milestones (F/A – F/G)

Pengembangan frontend mengikuti strategi **Role-First**: menyelesaikan seluruh antarmuka dan interaksi satu peran sebelum berpindah ke peran berikutnya.

| ID | Fokus & Ruang Lingkup | Status | Detail Capaian |
|:---:|---|:---:|---|
| **F/A** | **Frontend Foundation & Design System Setup** | ✅ Selesai | Setup Vite 6, Tailwind CSS v4, integrasi aset asli, router, dan layout dasar. |
| **F/B** | **Petugas UI Lengkap (In-Memory Mock Adapter)** | ✅ Selesai | Dashboard ringkas, tabel inventaris pos, form catat barang dengan preview foto, modal detail. |
| **F/C** | **Guest Publik UI Lengkap (In-Memory Mock Adapter)** | 🟡 *Next* | Katalog pencarian, filter kategori, paginasi 10 item/halaman, detail publik, state 404. |
| **F/D** | **Mahasiswa UI & Alur Pelaporan Temuan (Mock)** | 📋 *Planned* | Antarmuka akun mahasiswa, form pelaporan mandiri, riwayat status laporan. |
| **F/E** | **Integrasi API Publik dengan Backend** | 📋 *Planned* | Penggantian mock adapter Guest dengan HTTP Client nyata mengonsumsi endpoint B/C. |
| **F/F** | **Integrasi Penuh Petugas & Mahasiswa (Neon Auth & R2)** | 📋 *Planned* | Alur login riil Neon Auth (Better Auth), unggah binary langsung ke Cloudflare R2, dan sinkronisasi inventaris pos. |
| **F/G** | **QA, Visual Regression & Deployment Produksi** | 📋 *Planned* | Audit pixel-perfect terhadap Figma, cross-browser testing, dan rilis frontend. |

---

## 🚀 Instalasi & Menjalankan Proyek

### Prasyarat
* **Node.js:** Versi $\ge 20.0.0$
* **Package Manager:** NPM v10+ (atau PNPM / Bun yang kompatibel)
* Akses Cloud Services (untuk backend live):
  * **Neon Serverless PostgreSQL**
  * **Neon Auth (Managed Better Auth)**
  * **Cloudflare R2 Bucket**

---

### Konfigurasi Environment

#### 1. Backend (`apps/backend/.env`)
Salin berkas `.env.example` ke `.env`:
```bash
cd apps/backend
cp .env.example .env
```
Isi konfigurasi berikut:
```ini
NODE_ENV=development
PORT=3000

# Database Neon
DATABASE_URL=postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://user:password@ep-sample.us-east-2.aws.neon.tech/neondb?sslmode=require

# Neon Auth (Better Auth)
AUTH_SECRET=dev-neon-auth-secret-key-min-32-chars-long!
NEON_AUTH_BASE_URL=https://your-neon-auth-domain.neon.tech

# Cloudflare R2 Storage
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=lostandfound-budiluhur
R2_PUBLIC_URL=https://pub-sample.r2.dev
```

#### 2. Frontend (`apps/frontend/.env`)
```bash
cd apps/frontend
cp .env.example .env
```
```ini
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_USE_MOCK=true
```

---

### Backend (`apps/backend`)

```bash
cd apps/backend

# 1. Install dependensi
npm install

# 2. Push skema database ke Neon PostgreSQL
npm run db:push

# 3. Jalankan seeding data awal (Pos, Kategori, Petugas, 15 Dummy Items)
npm run db:seed

# 4. Jalankan development server (TSX Watch)
npm run dev
```
Backend berjalan pada: `http://localhost:3000`

---

### Frontend (`apps/frontend`)

```bash
cd apps/frontend

# 1. Install dependensi
npm install

# 2. Jalankan development server
npm run dev
```
Frontend berjalan pada: `http://localhost:5173`

---

### Pengujian Otomatis (Testing)

Setiap perubahan kode diverifikasi menggunakan suite pengujian otomatis:

```bash
# Pengujian Backend (12 Suites, 94 Tests)
cd apps/backend
npm run test
npm run typecheck

# Pengujian Frontend
cd apps/frontend
npm run test
npm run typecheck
```

---

## 📂 Struktur Direktori Monorepo

```text
UBL-LostnFound/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── config/              # Validasi Zod Environment Variables
│   │   │   ├── db/
│   │   │   │   ├── schema/          # Skema Drizzle modular (users, items, photos, dll.)
│   │   │   │   ├── fixtures/        # Data fixture deterministik untuk testing & seed
│   │   │   │   ├── client.ts        # Inisialisasi pool koneksi Neon Postgres
│   │   │   │   └── seed.ts          # Runner seeding idempoten
│   │   │   ├── middleware/          # Guard autentikasi Neon Auth & otorisasi Petugas
│   │   │   ├── modules/
│   │   │   │   ├── auth/            # JWT verification & identitas pengguna
│   │   │   │   ├── items/           # Katalog publik & detail barang temuan
│   │   │   │   ├── uploads/         # Provider R2, Presigned URL, & HMAC Token
│   │   │   │   └── officer/         # Pencatatan barang, kode INV, & transaksi atomik
│   │   │   ├── app.ts               # Registrasi plugin Fastify, CORS, & routing
│   │   │   └── index.ts             # Entry point HTTP server listener
│   │   └── tests/                   # 12 Test Suites (DTO, Integration, Security, E2E)
│   │
│   └── frontend/
│       ├── public/                  # Aset asli (logo, favicon, ilustrasi resmi)
│       └── src/
│           ├── components/          # Komponen UI modular (Navbar, Card, Modal, Form)
│           ├── layouts/             # Layout per role (PetugasLayout, GuestLayout)
│           ├── pages/               # Tampilan layar per role sesuai frame Figma
│           ├── services/            # Layer adapter pemisah antara Mock dan HTTP Live
│           └── types/               # Type definition DTO selaras OpenAPI
│
└── .agent-internal/
    └── contracts/                   # Snapshot canonical OpenAPI v1.0 & ERD v6.2
```

---

## 🔒 Kebijakan Keamanan & Kualitas Kode

1. **Clean Code Sweet Spot:**
   - Batas maksimum file produksi di `src/` adalah $\le 100$ baris kode (LOC) dengan ukuran fungsi $\approx 15–25$ LOC guna menjamin keterbacaan tinggi dan isolasi tanggung jawab (*Single Responsibility*).
2. **Server-Enforced RBAC & Anti-IDOR:**
   - Parameter krusial seperti `storage_post_id` tidak pernah diterima dari payload klien. Server secara independen mengambil pos penugasan petugas dari tabel relasi database berdasarkan token sesi Neon Auth yang sah.
3. **Penyimpanan Objek Terenkripsi & Anti-Replay:**
   - File media diunggah langsung ke Cloudflare R2 melalui Presigned PUT URL berbatas waktu.
   - Token unggah dilindungi tanda tangan kriptografis HMAC-SHA256, berumur 15 menit, terikat pada ID pengguna dan tujuan penggunaan (*purpose*), serta dicatat ke dalam *consumed token store* agar tidak dapat digunakan ulang (*single-use protection*).
4. **Pencegahan Kebocoran Data (Zero Leakage):**
   - Catatan verifikasi privat (`private_verification_notes`) hanya dikembalikan pada rute internal Petugas dan secara ketat disaring sebelum data disajikan ke katalog publik.
5. **Git Safe Policy:**
   - Kredensial rahasia, file environment (`.env*`), serta direktori audit internal tidak pernah disimpan ke dalam version control.
