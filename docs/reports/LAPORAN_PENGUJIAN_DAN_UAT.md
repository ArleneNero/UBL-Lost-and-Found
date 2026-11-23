# Laporan Pengujian Integrasi & User Acceptance Testing (UAT)
## Sistem Informasi Manajemen Barang Temuan Kampus — UBL Lost and Found (CampusFind)

| Atribut Dokumen | Detail |
| :--- | :--- |
| **Nama Proyek** | UBL Lost and Found (*CampusFind*) |
| **Versi Evaluasi** | `v1.1.1` (Hotfix Produksi) → `v1.2.0` / `v1.2.1` → `v1.3.0` (Perbaikan Bug Arsip & Detail Serah Terima BAST) |
| **Target Produksi** | `https://lostandfound-budiluhur.web.id` |
| **Mitra Operasional** | Pos Pengajaran — Gedung Unit 4 Lantai 1, Universitas Budi Luhur |
| **Standar Acuan** | Capstone P11 — Pengujian Integrasi, UAT, Bug Tracking & Deployment Gate |
| **Tanggal Dokumen** | 24 November 2026 |

---

## Bab 1: Ringkasan Eksekutif & Tujuan Pengujian

### 1.1 Ringkasan Eksekutif
**UBL Lost and Found** merupakan sistem informasi berbasis web untuk pengelolaan barang temuan (*found-item only*) di lingkungan Universitas Budi Luhur, mencakup alur pelaporan mandiri oleh mahasiswa (`STUDENT`), penelusuran katalog publik oleh tamu/sivitas (`Guest`), serta inventarisasi, verifikasi tatap muka, serah terima, dan penyaluran barang oleh petugas posko (`OFFICER`) di **Pos Pengajaran — Gedung Unit 4 Lt. 1**.

Pasca rilis produksi `v1.0.0`–`v1.1.0` pada domain `https://lostandfound-budiluhur.web.id`, dilakukan dua siklus evaluasi operasional bersama mitra Pos Pengajaran:
- **Siklus 1 (`v1.1.1` – `v1.2.1`):** Menghasilkan **2 temuan bug produksi** (patch `v1.1.1`: Issue `#1` dan `#2`), **3 kebutuhan revisi UAT** (minor `v1.2.0`: Issue `#3`, `#4`, dan `#5`), serta **1 perbaikan observabilitas rilis** (patch `v1.2.1`: Issue `#6`).
- **Siklus 2 (`v1.3.0`, Milestone `#22`):** Menuntaskan **2 temuan bug arsip** (`BUG-004`: Issue `#28`, `BUG-005`: Issue `#29`) dan **1 peningkatan UAT serah terima & BAST** (`UAT-006`: Issue `#30`).

Dokumen ini merangkum strategi pengujian integrasi inkremental, artefak *stub/driver*, matriks pengujian positif dan negatif (termasuk hasil suite terbaru **14/14 test files / 145 tests Backend** dan **16/16 test files / 95 tests Frontend**), skenario *User Acceptance Testing* (UAT), metrik penyelesaian bug (`19/19 CLOSED`, `100%`), verifikasi *smoke test* otomatis (`scripts/smoke-test.mjs`), serta prosedur *deployment* dan *rollback*.

### 1.2 Tujuan Pengujian
1. **Validasi Integrasi Lintas-Lapisan:** Memastikan komunikasi Frontend React 19 SPA, Backend REST API Fastify v5, database Neon Serverless PostgreSQL (Drizzle ORM), penyimpanan objek Cloudflare R2, dan layanan email Resend berjalan konsisten sesuai kontrak `openapi.yaml`.
2. **Verifikasi Perbaikan Bug & Revisi UAT:** Membuktikan seluruh temuan pasca-rilis (`#1`–`#6` dan `#28`–`#30`) telah teratasi tanpa regresi pada fitur inti.
3. **Jaminan Keamanan & Privasi (*Privacy-by-Design*):** Memastikan tidak ada kebocoran kolom sensitif `private_verification_notes` pada endpoint publik, rekap laporan A4, maupun lembar BAST satuan; serta penegakan *Role-Based Access Control* (RBAC) sisi server (`401`/`403`), pencegahan IDOR, dan token upload anti-replay HMAC-SHA256.
4. **Kesiapan Operasional Rilis `v1.3.0`:** Memastikan seluruh suite unit/integrasi lintas workspace (`145` test Backend & `95` test Frontend), build produksi monorepo, dan migrasi skema aditif (`item_returns.recipient_identifier VARCHAR(50)`) lulus sebelum commit, deployment, dan eksekusi *smoke test* pasca-rilis.

> [!IMPORTANT]
> **Batasan Ruang Lingkup Sistem:** Sistem hanya mengelola barang yang telah ditemukan (*found items*). Seluruh verifikasi kecocokan ciri rahasia (`private_verification_notes`) dan serah terima fisik dilakukan secara tatap muka di **Pos Pengajaran (Gedung Unit 4 Lt. 1)**.

---

## Bab 2: Lingkup & Lingkungan Pengujian

### 2.1 Lingkup Pengujian
Pengujian mencakup empat area utama:
- **Modul Publik / Tamu (`Guest`):** Landing pemilihan peran (`/`), beranda publik, katalog barang `STORED` (`is_visible = true`), pencarian/filter kategori, detail publik tanpa ciri rahasia, info Pos Pengajaran, dan panduan pengambilan.
- **Modul Mahasiswa (`STUDENT`):** Registrasi wajib domain `@student.budiluhur.ac.id`, login JWT (HS256), *token-gated password reset*, pelaporan temuan mandiri (`REP-YYYY-XXXX`) dengan kamera WebRTC / galeri, serta pembatalan laporan `PENDING_RECEIPT`.
- **Modul Petugas Posko (`OFFICER`):** Login khusus petugas, dashboard KPI, pencatatan barang langsung (`INV-YYYY-XXXX`), konfirmasi terima fisik / tolak laporan mahasiswa, toggle visibilitas katalog, kebijakan batas simpan (`storage_limit_days`), pembersihan arsip (*clean soft-archive* dengan guard `409`/disabled saat `0` item) & filter eksklusif **Hanya Arsip** (`archived_only=true`), serah terima pemilik (`RETURNED_TO_OWNER`) dengan pencatatan opsional NIM/ID Kampus (`recipient_identifier`), penyaluran (`DISTRIBUTED`), cetak Berita Acara Serah Terima (`BAST`) satuan, serta rekap & cetak A4/PDF multi-periode lengkap dengan opsi detail serah terima.
- **Keamanan, Kontrak API & Infrastruktur:** Validasi Zod DTO, *error envelope* seragam (`{ error: { code, message, request_id } }`), sensor log PII (`authorization`, `email`, `student_number`, `token`), dan *routing single-origin* Vercel Services.

### 2.2 Perbandingan Lingkungan Staging Lokal vs Produksi

| Aspek Lingkungan | Staging Lokal (Development & Preview) | Produksi (Live Campus Environment) |
| :--- | :--- | :--- |
| **Domain / URL Frontend** | `http://localhost:5173` (Vite HMR) / `http://localhost:4173` (`vite preview`) | `https://lostandfound-budiluhur.web.id` (Vercel Services) |
| **Domain / URL Backend** | `http://localhost:3000` (Fastify via `tsx watch`) + proxy Vite `/api` & `/storage` | `https://lostandfound-budiluhur.web.id/api/v1/*` (Vercel rewrite → `api/index.cjs`) |
| **Runtime & Packaging** | Node.js `>= 20`, TypeScript ESM langsung (`apps/backend/src/server.ts`) | Standalone CommonJS bundle (`esbuild` → `api/index.cjs`, `api/app.cjs`) |
| **Database** | Neon PostgreSQL (branch dev/test) atau instance uji terisolasi | Neon Serverless PostgreSQL (`DATABASE_URL` pooler + `DATABASE_URL_UNPOOLED`) |
| **Object Storage Foto** | `MockStorageProvider` / fallback lokal `apps/backend/storage/` (atau bucket dev R2) | Cloudflare R2 Bucket Privat (Presigned PUT URL + streaming `/storage/*`) |
| **Layanan Email** | Mode dev / Resend sandbox | Resend HTTP API (`RESET_PASSWORD_URL` ke domain produksi) |
| **Adapter Data Frontend** | `VITE_USE_MOCK=true` (`InMemory*Service`) saat unit test; `VITE_USE_MOCK=false` saat integrasi lokal | `VITE_USE_MOCK=false` (`Http*Service` → `/api/v1`) |

---

## Bab 3: Strategi Pengujian Integrasi Inkremental & Daftar Stub/Driver

Mengacu pada pedoman **Capstone P11 (Pengujian Integrasi)**, pengujian tidak dilakukan secara *Big-Bang* di akhir proyek, melainkan secara **inkremental** agar sumber kegagalan dapat dilokalisasi per lapisan modul.

### 3.1 Strategi Pengujian Inkremental

```text
[Lapisan Bawah: DB & Schema] ──► [DTO & Validator] ──► [Service & Auth Guard] ──► [Fastify Routes (app.inject)]
   (Bottom-Up Backend)                                                                     │
                                                                                           ▼
[Lapisan Atas: React Pages]  ──► [Feature Hooks]   ──► [ServiceRegistry Contract] ◄── [HTTP / InMemory Adapter]
   (Top-Down Frontend)
```

1. **Bottom-Up Incremental Integration (Backend):**
   - *Tahap 1 — Fondasi DB & Skema (`db.test.ts`):* Memverifikasi koneksi Neon PostgreSQL, relasi Drizzle (`relations.ts`), serta integritas *seed* (`officer.fixture.ts`, `student.fixture.ts`, `servicePost.fixture.ts`).
   - *Tahap 2 — Kontrak DTO (`*.dto.test.ts`):* Menguji skema validasi Zod untuk `items`, `posts`, `uploads`, dan `officer` sebelum terhubung ke rute HTTP.
   - *Tahap 3 — Modul API & Transaksi (`posts.routes.test.ts`, `items.routes.test.ts`, `auth.test.ts`, `me.routes.test.ts`, `uploads.routes.test.ts`):* Menguji integrasi router → service → repository → DB dengan `app.inject()`.
   - *Tahap 4 — Alur Bisnis End-to-End (`officer.routes.test.ts`, `submissions.test.ts`, `officer-flows.test.ts`):* Menguji siklus hidup lengkap laporan mahasiswa hingga penerimaan fisik, toggle visibilitas, serah terima, dan penyaluran.
2. **Top-Down / Sandwich Integration (Frontend):**
   - Antarmuka UI dan *custom hooks* (`useOfficerReportDetail`, `useOfficerItemDetail`, dll.) dibangun di atas kontrak *interface* `ServiceRegistry` (`apps/frontend/src/services/registry.ts`) sehingga halaman dapat diuji menggunakan *stub in-memory* terlebih dahulu sebelum disambungkan ke `Http*Service` (*live backend*).

### 3.2 Daftar Stub (Simulasi Komponen Bawah / Layanan Eksternal)

| Nama Stub | Lokasi Berkas | Komponen Asli yang Digantikan | Peran dalam Pengujian |
| :--- | :--- | :--- | :--- |
| `InMemoryItemService` | `apps/frontend/src/services/in-memory/InMemoryItemService.ts` | `HttpItemService` + API `/items` & `/officer/items` | Menyediakan katalog publik, filter inventaris termasuk `archivedOnly` (*Hanya Arsip*), simulasi *overdue*, *clean archive* (dengan guard error `0` item), pencatatan `recipientIdentifier` & `returnRecord` pada `returnItem()`, serta isolasi `privateNotes: null` pada mode publik di `mockStore`. |
| `InMemorySubmissionService` | `apps/frontend/src/services/in-memory/InMemorySubmissionService.ts` | `HttpSubmissionService` + API `/submissions` | Mensimulasikan pembuatan laporan mahasiswa (`REP-YYYY-XXXX`), pembatalan, penerimaan fisik menjadi item inventaris, dan penolakan oleh petugas. |
| `InMemoryAuthService` | `apps/frontend/src/services/in-memory/InMemoryAuthService.ts` | `HttpAuthService` + API `/auth/*` & `/me` | Mensimulasikan login mahasiswa/petugas, registrasi `@student.budiluhur.ac.id`, sesi aktif, dan alur *forgot/reset password*. |
| `InMemoryPostService` | `apps/frontend/src/services/in-memory/InMemoryPostService.ts` | `HttpPostService` + API `/posts` & `/officer/post-settings` | Mensimulasikan data Pos Pengajaran dan pembaruan kebijakan `storageLimitDays`. |
| `InMemoryUploadService` | `apps/frontend/src/services/in-memory/InMemoryUploadService.ts` | `HttpUploadService` + Presigned R2 | Mensimulasikan alur dua fase `requestIntent()` → `uploadBinary()` → `finalizeUpload()` tanpa koneksi Cloudflare R2. |
| `MockStorageProvider` | `apps/backend/src/modules/uploads/storage/mock.provider.ts` | `R2StorageProvider` (`r2.provider.ts`) | Menggantikan S3/Cloudflare R2 pada uji integrasi backend (`uploads.routes.test.ts`) menggunakan `Map` in-memory (`getPresignedPutUrl`, `headObject`, `simulatePut`). |

### 3.3 Daftar Driver (Pengendali Eksekusi Pengujian)

| Nama Driver | Teknologi / Lokasi | Target yang Diuji | Deskripsi Mekanisme |
| :--- | :--- | :--- | :--- |
| **Backend Integration Driver** | Vitest v3 + Fastify `app.inject()` (`apps/backend/tests/*.test.ts` — 14 berkas, 145 tests PASS via `npx vitest run --fileParallelism=false`) | Seluruh modul route, middleware RBAC, service, repository, DTO & DB | Mengirimkan request HTTP sintetis langsung ke instance `buildApp()` tanpa overhead socket jaringan dan memverifikasi status, header, JSON envelope, serta state database. |
| **Frontend Component & Flow Driver** | Vitest v5 + React Testing Library + `jsdom` (`apps/frontend/src/**/*.test.ts(x)` — 16 berkas, 95 tests PASS via `npx vitest run`) | Halaman Publik, Mahasiswa, Panel Petugas, Modal, Lembar Cetak (Rekap A4 & BAST), Selectors & `ServiceRegistry` | `setup.ts` memanggil `registry.setMode('in-memory')` dan `mockStore.reset()` pada setiap `beforeEach`, lalu mensimulasikan interaksi pengguna (klik, input, submit form, cetak). |
| **Smoke Test Driver** | Node.js ESM (`scripts/smoke-test.mjs`) | Deployment Staging Lokal & Produksi (`https://lostandfound-budiluhur.web.id`) | Driver black-box tanpa dependensi eksternal yang menembak 6 endpoint kritis via `fetch` native, mengukur latensi (`ms`), dan memvalidasi kontrak respons. |
| **Manual API Driver** | REST Client `api-requests.http` & Koleksi Postman | Endpoint `/api/v1/*` lokal & staging | Digunakan QA/Developer untuk eksplorasi manual skenario multipart/upload dan inspeksi header otentikasi. |

---

## Bab 4: Matriks Test Case, Kasus Kegagalan (Negative Path) & Skenario UAT (*Given–When–Then*)

### 4.1 Matriks Test Case Integrasi & Keamanan (Happy Path & Negative Path)

| ID Test | Modul / Endpoint | Skenario Uji | Tipe Path | Input / Kondisi Uji | Ekspektasi Hasil (Status & Output) | Referensi Test / Issue |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Health & Version (`GET /api/v1/health`) | Cek kesehatan server & metadata rilis | Happy | Request `GET /api/v1/health` tanpa auth | HTTP `200`, JSON `status: "ok"`, `version` sesuai `package.json`, `request_id` terisi | `app.test.ts`, `smoke-test.mjs` |
| **TC-02** | Service Posts (`GET /api/v1/posts`) | Ambil daftar pos layanan aktif | Happy | Request `GET /api/v1/posts` | HTTP `200`, `data` array non-kosong memuat **Pos Pengajaran — Gedung Unit 4 Lt. 1** | `posts.routes.test.ts` |
| **TC-03** | Katalog Publik (`GET /api/v1/items`) | Isolasi privasi pada daftar barang publik | Happy / Security | Request `GET /api/v1/items?page=1&limit=5` | HTTP `200`, hanya item `STORED` & `is_visible=true`; **0 field** `private_verification_notes` atau `recorded_by_user_id` | `items.routes.test.ts` |
| **TC-04** | Detail Publik (`GET /api/v1/items/:id`) | Akses item tersembunyi atau sudah kembali | Negative (`404`) | UUID item berstatus `RETURNED_TO_OWNER`, `DISTRIBUTED`, atau `is_visible=false` | HTTP `404` (`ITEM_NOT_FOUND`), mencegah enumerasi barang non-publik | `items.routes.test.ts` |
| **TC-05** | Filter Pencarian (`GET /api/v1/items?q=...`) | Ketahanan terhadap payload SQL Injection | Negative / Security | Query `?q=' OR 1=1--` | HTTP `200` aman (query terparameterisasi Drizzle), tidak terjadi error 500 atau kebocoran tabel | `items.routes.test.ts` |
| **TC-06** | Guard RBAC (`GET /api/v1/officer/inventory`) | Akses inventaris petugas tanpa token JWT | Negative (`401`) | Request tanpa header `Authorization` | HTTP `401` (`UNAUTHORIZED`) dengan format error envelope standar | `smoke-test.mjs`, `officer.routes.test.ts` |
| **TC-07** | Guard RBAC (`POST /api/v1/officer/items`) | Mahasiswa mencoba mencatat barang inventaris pos | Negative (`403`) | Header `Authorization: Bearer <studentToken>` | HTTP `403` (`FORBIDDEN`), ditolak oleh `requireOfficer` middleware | `officer.routes.test.ts` |
| **TC-08** | Registrasi Mahasiswa (`POST /api/v1/auth/register`) | Registrasi menggunakan domain email publik | Negative (`422`) | Email `mahasiswa@gmail.com` (bukan `@student.budiluhur.ac.id`) | HTTP `422` (`VALIDATION_ERROR`), akun tidak dibuat | `auth.test.ts` |
| **TC-09** | Two-Phase Upload (`POST /uploads/:id/finalize` & replay) | Penggunaan ulang `photo_token` yang sudah dikonsumsi | Negative (`409`/`422`) | Kirim ulang `photo_token` HMAC-SHA256 yang sama pada request kedua | Ditolak server (anti-replay *single-use consumed token*), tidak membuat duplikasi aset | `uploads.routes.test.ts`, `officer.routes.test.ts` |
| **TC-10** | Terima Fisik Laporan (`POST /api/v1/officer/submissions/:id/receive`) | Petugas menerima fisik barang tanpa unggah foto ulang | Happy (Bug `#1` Fix) | Payload tanpa `item_photo_upload_tokens` pada laporan `PENDING_RECEIPT` | HTTP `201`, item inventaris `INV-YYYY-XXXX` dibuat otomatis mewarisi `submission.reportPhotoPath` | `officer-flows.test.ts`, Issue `#1` |
| **TC-11** | Terima Fisik Duplikat (`POST /api/v1/officer/submissions/:id/receive`) | Terima fisik laporan yang sudah berstatus `RECEIVED` / `CANCELLED` | Negative (`409`) | Request ke `submission_id` yang statusnya bukan `PENDING_RECEIPT` | HTTP `409` (`INVALID_STATUS_TRANSITION`), modal UI menampilkan `actionError` tanpa merusak halaman | `officer-flows.test.ts`, `tahap5OfficerReports.test.tsx` |
| **TC-12** | Visibilitas Item (`PATCH /api/v1/officer/items/:id/visibility`) | Ubah visibilitas pada item `RETURNED_TO_OWNER` / `DISTRIBUTED` | Negative (`409`) | Request `PATCH` ke item non-`STORED` (UI menyembunyikan switch) | UI tidak merender `ItemVisibilityToggle`; di API mengembalikan `409` (`INVALID_STATUS_TRANSITION`) + alert inline | `tahap6OfficerHandover.test.tsx`, Issue `#2` |
| **TC-13** | Serah Terima Ganda (`POST /api/v1/officer/items/:id/return`) | Penyerahan ulang barang yang sudah berstatus `RETURNED_TO_OWNER` | Negative (`409`) | Request `POST /return` kedua pada `item_id` yang sama | HTTP `409` (`INVALID_STATUS_TRANSITION`), mencegah duplikasi baris `item_returns` | `officer-flows.test.ts` |
| **TC-14** | Kebijakan Batas Simpan (`PATCH /api/v1/officer/post-settings`) | Ubah `storage_limit_days` valid & di luar batas (`0` / `999`) | Happy & Negative (`422`) | Nilai valid `180` vs invalid `0` atau `731` | Nilai `180` → `200 OK` (item lama tidak berubah retroaktif); nilai di luar `1..730` → `422` | Issue `#3` |
| **TC-15** | Clean Soft-Archive (`POST /api/v1/officer/inventory/clean`) | Arsipkan item selesai tanpa menyentuh item `STORED` | Happy | Eksekusi `POST /officer/inventory/clean` dengan atau tanpa filter `month` | Hanya item `RETURNED_TO_OWNER` & `DISTRIBUTED` yang diisi `archived_at`; item `STORED` & log audit `item_returns` tetap utuh | Issue `#4` |
| **TC-16** | Rekap & Cetak A4 Multi-Periode (`InventoryReportPrintModal`) | Filter periode WIB & verifikasi keamanan isi cetakan | Happy / Security | Pilih mode `day`/`week`/`month`/`year`/`custom`, buka pratinjau cetak | Total Masuk, Tersedia, Diserahkan, Disalurkan & per Kategori akurat sesuai zona `Asia/Jakarta`; `privateNotes` **tidak tercetak** | Issue `#5` |
| **TC-17** | Guard Arsip Kosong (`POST /api/v1/officer/inventory/clean` & `CleanInventoryModal`) | Tolak arsip saat `0` barang selesai tersedia (keseluruhan / bulan kosong) | Negative (`409` / Guard UI) | Request `month: "1999-01"` atau clean kedua saat `0` item selesai; buka `CleanInventoryModal` dengan `0` item eligible | Backend balas HTTP `409` (`NO_ARCHIVABLE_ITEMS`); checkbox konfirmasi & tombol **Bersihkan (Arsipkan)** disabled disertai pesan status; item `STORED` tetap aman | `officer-flows.test.ts`, `tahap3MockDataAndInventory.test.tsx`, `officerHandoverAndReportPrint.test.tsx`, Issue `#28` |
| **TC-18** | Filter Eksklusif `Hanya Arsip` (`GET /api/v1/officer/inventory?archived_only=true`) | Tampilkan hanya barang terarsip & *empty state* saat `0` arsip | Happy & Empty State | Request `archived_only=true` setelah arsip maupun saat belum ada item terarsip | API hanya mengembalikan item `archived_at != null` (tanpa item `STORED`); saat `0` arsip, `InventoryEmptyState` menampilkan *"Belum ada barang yang diarsipkan"*, jumlah barang aktif, & tombol **Kembali ke Inventaris Aktif** | `officer-flows.test.ts`, `tahap3MockDataAndInventory.test.tsx`, `officerHandoverAndReportPrint.test.tsx`, Issue `#29` |
| **TC-19** | Serah Terima NIM/ID Kampus (`POST /api/v1/officer/items/:id/return`) | Catat `recipient_identifier` mahasiswa, mode tamu (`null`), & validasi DTO `> 50` char | Happy & Negative (`422`) | Payload dengan `recipient_identifier: "2111500999"`, tanpa `recipient_identifier` (tamu), & string `51` karakter | HTTP `201` menyimpan `item_returns.recipient_identifier` (`VARCHAR(50)`) atau `null`, `return_record` memuat `returned_by_name`; input `> 50` char ditolak `returnRequestSchema` (`422`) | `officer.dto.test.ts`, `officer-flows.test.ts`, `officerHandoverAndReportPrint.test.tsx`, Issue `#30` |
| **TC-20** | Cetak BAST Satuan (`HandoverReceiptSheet` & `OfficerItemDetailPage`) | Pratinjau & cetak Berita Acara Serah Terima item `RETURNED_TO_OWNER` | Happy / Security | Buka detail item `RETURNED_TO_OWNER` dan klik **Cetak Berita Acara (BAST)** | Lembar BAST (`BAST/<inventoryCode>`) tampil via `window.print()` memuat identitas barang, penerima (`NIM / ID` atau `-`), waktu WIB, & blok tanda tangan tanpa **0 kemunculan** `privateNotes` | `officerHandoverAndReportPrint.test.tsx`, Issue `#30` |
| **TC-21** | Detail Penerima pada Rekap A4 (`InventoryReportPrintModal` & `InventoryReportSheet`) | Toggle kolom *Detail Serah Terima* (auto-aktif saat filter `RETURNED_TO_OWNER`) | Happy / Security | Centang *Sertakan Detail Penerima (Serah Terima)* atau pilih status `RETURNED_TO_OWNER` | Kolom **Detail Serah Terima** menampilkan nama penerima, NIM/ID, waktu WIB, verifikasi, & petugas; `privateNotes` **tidak tercetak** | `officerHandoverAndReportPrint.test.tsx`, Issue `#30` |

### 4.2 Skenario UAT Mitra (*Given–When–Then*)

#### Skenario UAT-01: Konfirmasi Terima Fisik Laporan Mahasiswa Tanpa Upload Foto Ulang (Issue `#1`)
- **Given:** Mahasiswa telah mengirim laporan barang temuan (`REP-2026-XXXX`) beserta foto bukti yang berstatus `PENDING_RECEIPT`, dan mahasiswa menyerahkan barang fisik tersebut ke petugas di Pos Pengajaran.
- **When:** Petugas login ke `/petugas/laporan/:id`, menekan tombol **Terima Fisik Barang**, melengkapi catatan rahasia verifikasi tanpa mengunggah foto baru, lalu mengonfirmasi di `ReceivePhysicalModal`.
- **Then:** Sistem tidak mengirimkan token mock, backend secara otomatis mewarisi `reportPhotoPath` dari laporan mahasiswa, status laporan berubah menjadi `RECEIVED`, barang tercatat di inventaris dengan kode `INV-2026-XXXX` (`STORED`), dan apabila terjadi error validasi/konflik (`422`/`409`), pesan tampil di dalam modal tanpa menimpa halaman dengan pesan *"Laporan Tidak Ditemukan"*.

#### Skenario UAT-02: Pengendalian Toggle Visibilitas Barang Selesai & Isolasi Error (Issue `#2`)
- **Given:** Petugas membuka halaman detail inventaris `/petugas/inventaris/:id` untuk barang yang telah selesai diproses (`RETURNED_TO_OWNER` atau `DISTRIBUTED`).
- **When:** Halaman detail selesai dimuat oleh `OfficerItemDetailPage`.
- **Then:** Komponen `ItemVisibilityToggle` disembunyikan sehingga petugas tidak dapat memicu transisi visibilitas ilegal (`409 INVALID_STATUS_TRANSITION`); dan apabila aksi pada item `STORED` gagal di server, error ditampilkan sebagai banner peringatan *inline* non-destruktif tanpa menghilangkan informasi detail barang.

#### Skenario UAT-03: Kebijakan Batas Simpan Overdue 365 Hari & Snapshot Non-Retroaktif (Issue `#3`)
- **Given:** Pos Pengajaran memiliki default batas simpan `365 hari` (1 tahun) sesuai SOP kampus, dan terdapat barang lama yang dicatat dengan snapshot batas simpan `365 hari`.
- **When:** Petugas membuka `/petugas/akun`, mengubah kebijakan batas simpan pada kartu **Kebijakan Batas Simpan (Overdue)** menjadi `180 hari`, lalu mencatat barang baru serta memeriksa daftar barang `OVERDUE`.
- **Then:** Barang baru menerima snapshot `storage_limit_days = 180`, sedangkan barang lama tetap dievaluasi menggunakan snapshot historisnya (`365 hari`) tanpa perubahan retroaktif; tombol reset `365 Hari` dapat mengembalikan kebijakan default pos dengan aman.

#### Skenario UAT-04: Pembersihan Arsip Inventaris Selesai (Clean Soft-Archive) (Issue `#4`)
- **Given:** Tabel `/petugas/inventaris` menampilkan campuran barang berstatus `STORED`, `RETURNED_TO_OWNER`, dan `DISTRIBUTED` (maks. `100` baris per halaman).
- **When:** Petugas menekan tombol **Bersihkan Arsip**, meninjau peringatan di `CleanInventoryModal` (tersedia pintasan cetak rekap sebelum arsip), lalu mengonfirmasi pembersihan.
- **Then:** Sistem menandai `archived_at` hanya pada barang `RETURNED_TO_OWNER` dan `DISTRIBUTED`, menyembunyikannya dari daftar aktif default serta pengecekan `OVERDUE`, membiarkan seluruh barang `STORED` tetap aktif, dan tetap memungkinkan petugas meninjau riwayat arsip secara terpisah.

#### Skenario UAT-05: Rekapitulasi & Cetak Laporan A4 Multi-Periode (Issue `#5`)
- **Given:** Petugas berada di halaman `/petugas/inventaris` dan membutuhkan laporan pertanggungjawaban periodik untuk kepala pos/kampus.
- **When:** Petugas membuka modal **Rekap & Cetak Laporan**, memilih periode (`Harian`, `Mingguan` Senin–Minggu, `Bulanan`, `Tahunan`, atau `Rentang Kustom` dalam zona waktu WIB), lalu menekan **Cetak / Simpan PDF**.
- **Then:** Dokumen cetak `@media print` A4/PDF multi-halaman di luar *scroll container* modal menampilkan kop resmi **Pos Pengajaran — Gedung Unit 4 Lt. 1**, kartu ringkasan angka (**Total Masuk**, **Tersedia**, **Sudah Diserahkan**, **Disalurkan**), rincian per kategori, tabel daftar barang **tanpa** kolom rahasia `privateNotes`, serta blok tanda tangan petugas pos.

#### Skenario UAT-06: Guard Arsip Kosong & Filter Eksklusif `Hanya Arsip` (Issue `#28`, Issue `#29`)
- **Given:** Petugas berada di halaman `/petugas/inventaris` yang memiliki barang aktif (`STORED`), baik saat belum ada barang selesai/arsip maupun setelah sebagian barang selesai diarsipkan.
- **When:** Petugas membuka **Bersihkan Arsip** ketika `0` barang selesai tersedia (keseluruhan atau pada bulan penerimaan tertentu), lalu mencentang filter **Hanya Arsip** pada `InventoryFilters`.
- **Then:** Pada modal **Bersihkan Arsip**, sistem menampilkan status peringatan bahwa `0` barang selesai siap diarsipkan (serta barang `STORED` tetap aman) dan menonaktifkan checkbox konfirmasi serta tombol **Bersihkan (Arsipkan)** (dan API mengembalikan `409 NO_ARCHIVABLE_ITEMS` bila dipanggil langsung). Saat **Hanya Arsip** dicentang ketika belum ada arsip, `InventoryEmptyState` menampilkan pesan *"Belum ada barang yang diarsipkan"*, jumlah barang aktif di inventaris utama, dan tombol **Kembali ke Inventaris Aktif**; sedangkan bila arsip tersedia, sistem hanya menampilkan barang dengan `archived_at` terisi beserta badge **Diarsipkan** dan banner pintasan **Lihat Inventaris Aktif**.

#### Skenario UAT-07: Pencatatan NIM/ID Kampus Serah Terima, Detail Penerima di Rekap A4 & Cetak BAST Satuan (Issue `#30`)
- **Given:** Petugas memproses serah terima barang `STORED` di `/petugas/inventaris/:id` untuk mahasiswa pemilik atau tamu non-mahasiswa, serta ingin mencetak bukti BAST satuan maupun rekap A4 lengkap dengan detail penerima.
- **When:** Petugas mengisi **Nama Lengkap Penerima**, mengisi atau mengosongkan **NIM / ID Kampus (Opsional)**, dan melengkapi **Ringkasan Verifikasi Kepemilikan** pada `ReturnItemModal`; kemudian menekan **Cetak Berita Acara (BAST)** di halaman detail barang, atau mengaktifkan opsi **Sertakan Detail Penerima (Serah Terima)** di `InventoryReportPrintModal`.
- **Then:** Sistem menyimpan `recipient_identifier` (atau `null` dengan tampilan `-` untuk tamu) beserta `returned_by_name`, menampilkan kartu **Ringkasan Serah Terima** di `OfficerItemDetailPage`, mencetak lembar A4 resmi `HandoverReceiptSheet` (`BAST/<inventoryCode>`) lengkap dengan blok tanda tangan Pihak Penerima & Petugas Pos Pengajaran, serta menampilkan kolom **Detail Serah Terima** pada laporan Rekap A4 (otomatis aktif saat filter status `RETURNED_TO_OWNER`) **tanpa** pernah menyertakan `privateNotes`.

---

## Bab 5: Log Bug Report, Klasifikasi Severity/Priority & Metrik Penyelesaian (`%`)

Format pelaporan defect di bawah ini mengikuti standar **Capstone P11 (Slide 15–16)** yang mencakup identifikasi modul, langkah reproduksi, *expected vs actual*, lingkungan/versi, *severity*, *priority*, bukti komitmen perbaikan, serta status penutupan (`CLOSED`).

### 5.1 Log Bug & Revisi Siklus Evaluasi Pasca-Rilis (`v1.1.1` – `v1.3.0`, Issue `#1`–`#6`, `#28`–`#30`)

| ID | Judul & Modul Terdampak | Langkah Reproduksi Singkat | Expected vs Actual | Lingkungan / Versi | Severity | Priority | Bukti / Issue / Commit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-001** | **Gagal Konfirmasi Terima Fisik Laporan Mahasiswa (`422 INVALID_TOKEN`)**<br>*Modul:* `OfficerReportDetailPage`, `useOfficerReportDetail`, `officer-submissions` | 1. Login sebagai Petugas.<br>2. Buka laporan `PENDING_RECEIPT`.<br>3. Klik *Terima Fisik* tanpa upload foto baru → Konfirmasi. | **Expected:** Item inventaris terbuat memakai foto laporan mahasiswa; error (jika ada) muncul di modal.<br>**Actual:** Frontend mengirim string `'mock-verified-receipt-token'` → backend balas `422 INVALID_TOKEN` dan halaman tertimpa pesan *"Laporan Tidak Ditemukan"*. | Produksi `v1.1.0` (`lostandfound-budiluhur.web.id`) | **High** *(Blocker alur terima fisik)* | **P1** | Issue [`#1`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/1)<br>Commit [`104201d`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/104201d)<br>Regresi: `officer-flows.test.ts`, `tahap5OfficerReports.test.tsx` | **CLOSED** *(v1.1.1)* |
| **BUG-002** | **Toggle Visibilitas Muncul pada Item Non-STORED (`409 INVALID_STATUS_TRANSITION`)**<br>*Modul:* `OfficerItemDetailPage`, `useOfficerItemDetail` | 1. Buka detail barang berstatus `RETURNED_TO_OWNER` atau `DISTRIBUTED`.<br>2. Klik switch visibilitas katalog. | **Expected:** Kontrol visibilitas disembunyikan untuk item non-`STORED`; gagal aksi tampil sebagai alert inline.<br>**Actual:** Switch tetap aktif → memicu error `409` dan state error menimpa detail barang dengan *"Barang Tidak Ditemukan"*. | Produksi `v1.1.0` (`lostandfound-budiluhur.web.id`) | **Medium** *(Salah transisi status & UX error)* | **P2** | Issue [`#2`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/2)<br>Commit [`3f38144`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/3f38144)<br>Regresi: `tahap6OfficerHandover.test.tsx` | **CLOSED** *(v1.1.1)* |
| **UAT-003** | **Batas Simpan Overdue Default 30 Hari Tidak Sesuai SOP & Berisiko Retroaktif**<br>*Modul:* `servicePost.fixture`, `found_items`, `OfficerAccountPage`, `officer-post-settings` | 1. Periksa batas waktu `OVERDUE` default sistem.<br>2. Ubah pengaturan batas simpan di halaman Akun Petugas. | **Expected:** Default SOP `365 hari` (1 tahun), dapat dikonfigurasi (`1..730` hari), dan snapshot per item agar barang lama tidak berubah retroaktif.<br>**Actual:** Default masih `30 hari` dan belum ada snapshot per item maupun UI pengaturan posko. | UAT Mitra v1.1.1 (Pos Pengajaran) | **High** *(Kesesuaian SOP Mitra)* | **P1** | Issue [`#3`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/3)<br>Commit [`676d084`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/676d084)<br>Rilis `v1.2.0` | **CLOSED** *(v1.2.0)* |
| **UAT-004** | **Inventaris Penuh Item Selesai Tanpa Fitur Arsip Aman & Limit Halaman 10**<br>*Modul:* `officer-inventory.routes`, `HttpItemService`, `found_items.archived_at`, `CleanInventoryModal` | 1. Akumulasi puluhan barang `RETURNED_TO_OWNER`/`DISTRIBUTED`.<br>2. Buka `/petugas/inventaris` (`limit=100`). | **Expected:** Tersedia aksi *Bersihkan Arsip* (soft-archive `archived_at`) khusus item selesai tanpa menghapus jejak audit & limit query hingga `100`.<br>**Actual:** Semua item menumpuk di daftar aktif dan query di-clamp `max(10)` di backend & frontend. | UAT Mitra v1.1.1 (Pos Pengajaran) | **Medium** *(Efisiensi operasional harian)* | **P2** | Issue [`#4`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/4)<br>Commit [`444ca6b`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/444ca6b)<br>Rilis `v1.2.0` | **CLOSED** *(v1.2.0)* |
| **UAT-005** | **Belum Tersedia Rekap Statistik & Cetak Laporan A4 Multi-Periode**<br>*Modul:* `reportDateSelectors.ts`, `reportSummarySelectors.ts`, `InventoryReportPrintModal` | 1. Petugas ingin mencetak rekap harian/mingguan/bulanan/tahunan dari `/petugas/inventaris`. | **Expected:** Modal rekap fleksibel (WIB) + preview cetak A4/PDF multi-halaman dengan kop Pos Pengajaran, tanda tangan, & tanpa `privateNotes`.<br>**Actual:** Fitur rekap & layout cetak resmi belum tersedia. | UAT Mitra v1.1.1 (Pos Pengajaran) | **Medium** *(Kebutuhan pelaporan resmi)* | **P2** | Issue [`#5`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/5)<br>Commit [`b8b51f0`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/b8b51f0)<br>Rilis `v1.2.0` | **CLOSED** *(v1.2.0)* |
| **BUG-003** | **Serverless Health Probe `/api/v1/health` Tidak Mengembalikan `version` & `commit`**<br>*Modul:* `apps/backend/src/index.ts` (Vercel Runtime Entrypoint) | 1. Jalankan `npm run smoke -- --base-url=https://lostandfound-budiluhur.web.id`.<br>2. Periksa respons `/api/v1/health`. | **Expected:** HTTP `200` mengembalikan `{ status: "ok", version: "1.2.x", commit: "<sha>" }`.<br>**Actual:** Direct handler probe di `index.ts` memotong request sebelum `app.ts` dan tidak menyertakan `version` (`undefined`). | Produksi `v1.2.0` (`lostandfound-budiluhur.web.id`) | **Medium** *(Observabilitas rilis & smoke gate)* | **P2** | Issue [`#6`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/6)<br>Commit [`685f4c6`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/685f4c6)<br>Verified: `6/6 smoke PASS` | **CLOSED** *(v1.2.1)* |
| **BUG-004** | **Tombol Bersihkan Arsip Tetap Dapat Dijalankan Saat `0` Barang Selesai Tersedia**<br>*Modul:* `CleanInventoryModal`, `useOfficerInventory`, `officer-inventory.service`, `InMemoryItemService` | 1. Buka `/petugas/inventaris` saat `0` barang selesai (atau pilih bulan kosong).<br>2. Buka *Bersihkan Arsip* → centang & submit, atau panggil `POST /officer/inventory/clean`. | **Expected:** Backend menolak dengan `409 NO_ARCHIVABLE_ITEMS`; modal menonaktifkan checkbox & tombol submit serta menampilkan peringatan informatif (`STORED` tetap aman).<br>**Actual:** Checkbox & tombol tetap aktif dan API/stub tidak menjaga kondisi `0` item selesai. | Evaluasi `v1.2.1` (Pos Pengajaran) | **Medium** *(Error UX & guard arsip kosong)* | **P2** | Issue [`#28`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/28)<br>Commit [`57cdc3f`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/57cdc3f)<br>Milestone [`#22`](https://github.com/ArleneNero/UBL-Lost-and-Found/milestone/22)<br>Regresi: `officer-flows.test.ts`, `tahap3MockDataAndInventory.test.tsx`, `officerHandoverAndReportPrint.test.tsx` | **CLOSED** *(v1.3.0)* |
| **BUG-005** | **Filter Arsip Menampilkan Barang Biasa Saat Belum Ada Arsip Tanpa Informasi Status**<br>*Modul:* `officer-inventory.routes`, `officer-inventory.repository`, `InventoryFilters`, `InventoryEmptyState`, `useOfficerInventory` | 1. Buka `/petugas/inventaris` saat hanya ada barang `STORED` (`0` arsip).<br>2. Aktifkan checkbox filter arsip. | **Expected:** Filter eksklusif **Hanya Arsip** (`archived_only=true`) menampilkan *empty state* *"Belum ada barang yang diarsipkan"*, jumlah barang aktif, & tombol **Kembali ke Inventaris Aktif** (atau hanya item ber-badge **Diarsipkan**).<br>**Actual:** Barang biasa tetap tampil saat arsip kosong tanpa informasi status. | Evaluasi `v1.2.1` (Pos Pengajaran) | **Medium** *(Kejelasan filter arsip & empty state)* | **P2** | Issue [`#29`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/29)<br>Commit [`57cdc3f`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/57cdc3f)<br>Milestone [`#22`](https://github.com/ArleneNero/UBL-Lost-and-Found/milestone/22)<br>Regresi: `officer-flows.test.ts`, `tahap3MockDataAndInventory.test.tsx`, `officerHandoverAndReportPrint.test.tsx` | **CLOSED** *(v1.3.0)* |
| **UAT-006** | **Tambah NIM/ID Kampus Penerima Serah Terima, Detail Penerima di Rekap A4 & Cetak BAST Satuan**<br>*Modul:* `item_returns.recipient_identifier`, `officer.dto`, `ReturnItemModal`, `HandoverReceiptSheet`, `OfficerItemDetailPage`, `InventoryReportPrintModal` | 1. Proses serah terima dengan/tanpa NIM di `ReturnItemModal`.<br>2. Cetak BAST satuan di detail item & aktifkan Detail Serah Terima di Rekap A4. | **Expected:** Opsional `recipient_identifier` (`VARCHAR(50)`) tersimpan (tamu `null`), tampil *Ringkasan Serah Terima* + cetak BAST (`BAST/<kode>`) & kolom *Detail Serah Terima* di Rekap A4 tanpa membocorkan `privateNotes`.<br>**Actual:** Belum ada kolom NIM/ID, ringkasan/cetak BAST satuan, maupun opsi detail penerima di Rekap A4. | UAT Mitra `v1.2.1` (Pos Pengajaran) | **Medium** *(Kelengkapan administrasi serah terima & BAST)* | **P2** | Issue [`#30`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/30)<br>Commit [`57cdc3f`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/57cdc3f)<br>Milestone [`#22`](https://github.com/ArleneNero/UBL-Lost-and-Found/milestone/22)<br>Regresi: `officer.dto.test.ts`, `officer-flows.test.ts`, `officerHandoverAndReportPrint.test.tsx` | **CLOSED** *(v1.3.0)* |

### 5.2 Audit Jejak Defect Historis Fase Pengembangan & Launch (`v0.2.0` – `v1.1.0`, Issue `#7`–`#16`)

> [!NOTE]
> Seluruh defect historis di bawah diekstrak secara jujur (*retrospective audit*) dari 25 commit `fix(...)` pada riwayat Git proyek (ditandai label `historical` pada GitHub Issues) agar pelacakan mutu mencakup defect mayor maupun minor sejak fase integrasi awal hingga produksi.

| ID | Judul & Modul Terdampak | Langkah Reproduksi / Kondisi Pemicu | Expected vs Actual | Lingkungan / Versi | Severity | Priority | Issue / Commit Perbaikan | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-H01** | **Data Lokasi Halaman Pos Pelayanan Tidak Konsisten**<br>*Modul:* `ServicePostPage` (`GuestUI`) | 1. Masuk sebagai Tamu (`Guest`).<br>2. Buka menu *Pos Pelayanan*. | **Expected:** Deskripsi lokasi menampilkan detail gedung & unit Pos Pengajaran UBL yang valid.<br>**Actual:** Teks informasi lokasi masih memuat placeholder lama. | Dev Lokal `v0.2.0` | **Low** *(Minor UI copy)* | **P3** | Issue [`#7`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/7)<br>Commit [`b0b0cc6`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/b0b0cc6) | **CLOSED** *(v0.2.0)* |
| **BUG-H02** | **Timestamp `receivedAt` Item Uji Membuat Test Dashboard Gagal**<br>*Modul:* `items.fixture.ts`, `dashboard` tests | 1. Jalankan suite `npx vitest run`.<br>2. Evaluasi *recent items* dashboard. | **Expected:** Seluruh assertion *recent items* pada dashboard lulus 100%.<br>**Actual:** Tanggal item dummy usang menggeser urutan/recency pada uji dashboard. | Dev Lokal `v0.4.1` | **Low** *(Minor test data)* | **P3** | Issue [`#8`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/8)<br>Commit [`0ee6dc7`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/0ee6dc7) | **CLOSED** *(v0.4.1)* |
| **BUG-H03** | **Drizzle Studio Gagal Resolusi Skema & Relasi Inverse Belum Lengkap**<br>*Modul:* `drizzle.config.ts`, `db/relations.ts` | 1. Jalankan runner `db:studio`.<br>2. Inspeksi relasi antar tabel Drizzle. | **Expected:** Drizzle Studio terbuka dan menampilkan relasi tabel dua arah.<br>**Actual:** Path skema tidak terselesaikan dan *inverse relations* belum terdefinisi. | Dev Lokal `v0.4.1` | **Low** *(Minor DX tooling)* | **P3** | Issue [`#9`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/9)<br>Commits [`2020748`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/2020748), [`eb5fa9f`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/eb5fa9f) | **CLOSED** *(v0.4.1)* |
| **BUG-H04** | **Ketidakkonsistenan Alur Login Landing & Verifikasi Password Bcrypt**<br>*Modul:* `auth.service.ts`, `LandingPage` | 1. Pilih peran dari landing page lalu login dengan kredensial valid. | **Expected:** Password diverifikasi aman via `bcryptjs` dan sesi peran tersinkron.<br>**Actual:** Alur redirect peran dan pengecekan hash Bcrypt backend tidak konsisten. | Integrasi Lokal `v0.4.1` | **High** *(Autentikasi gagal)* | **P1** | Issue [`#10`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/10)<br>Commit [`bafe38c`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/bafe38c) | **CLOSED** *(v0.4.1)* |
| **BUG-H05** | **Upload Direct PUT R2 Terblokir CORS & Token JWT Terlalu Singkat**<br>*Modul:* `uploads.routes.ts`, `auth.service.ts`, `RegisterItemPage` | 1. Upload foto barang dari browser ke R2.<br>2. Operasikan form petugas setelah sesi lama. | **Expected:** Foto terunggah mulus, token JWT cukup lama (2 jam), dan `401` otomatis membersihkan sesi.<br>**Actual:** Direct PUT terbentur CORS R2 dan sesi tidak auto-clear saat `401`. | Integrasi Lokal `v0.4.1` | **High** *(Upload & sesi gagal)* | **P1** | Issue [`#11`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/11)<br>Commit [`081d3cc`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/081d3cc) | **CLOSED** *(v0.4.1)* |
| **BUG-H06** | **Kegagalan Runtime Serverless Bridge, Packaging ESM/CJS & Routing Vercel**<br>*Modul:* `apps/backend/src/index.ts`, `vercel.json`, `api/index.cjs` | 1. Deploy backend Fastify ke Vercel Services (`vercel.json`).<br>2. Kirim request HTTP ke `/api/v1/*`. | **Expected:** Endpoint API Fastify merespons normal tanpa crash atau timeout.<br>**Actual:** Terjadi `ENTRYPOINT_NOT_FOUND`, `app.listen()` exit crash, *promise hang*, dan konflik ESM *(dirangkum dari 14 iterasi deploy)*. | Staging / Produksi `v1.0.0` | **Critical** *(Layanan API down)* | **P1** | Issue [`#12`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/12)<br>Commits [`241dca3`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/241dca3)..[`25e603c`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/25e603c) | **CLOSED** *(v1.0.0)* |
| **BUG-H07** | **`/openapi.yaml` Gagal Terbaca di Serverless & Link Email `/lupa-password` 404**<br>*Modul:* `openapi.contract.ts`, `router.tsx`, `Resend mailer` | 1. Akses `/docs` di Vercel.<br>2. Klik tautan reset password `/lupa-password` dari email. | **Expected:** Swagger UI memuat spesifikasi OpenAPI inline & `/lupa-password` diarahkan ke form reset.<br>**Actual:** File `.yaml` tidak ikut ter-bundle & router hanya mengenal `/lupa-sandi`. | Produksi `v1.0.0` | **Medium** *(Dokumentasi & rute auth)* | **P2** | Issue [`#13`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/13)<br>Commits [`192c8c6`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/192c8c6), [`f0140a0`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/f0140a0) | **CLOSED** *(v1.0.0)* |
| **BUG-H08** | **Foto `/storage/` Gagal Termuat di Produksi & Navigasi Guest–Mahasiswa Terpisah**<br>*Modul:* `mappers.ts`, `PublicLayout` | 1. Buka katalog publik atau detail barang di `lostandfound-budiluhur.web.id`.<br>2. Bandingkan shell Guest & Mahasiswa. | **Expected:** Seluruh gambar barang `/storage/*` tampil dan Guest/Mahasiswa berbagi `PublicLayout`.<br>**Actual:** URL foto mengarah ke host preview SSO yang terblokir dan layout masih terpisah. | Produksi `v1.0.0` | **High** *(Media barang rusak di prod)* | **P1** | Issue [`#14`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/14)<br>Commit [`130d6bc`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/130d6bc) | **CLOSED** *(v1.0.1)* |
| **BUG-H09** | **Tata Letak Beranda Mahasiswa Tertinggal dari UI Tamu yang Disetujui**<br>*Modul:* `StudentHomePage`, `GuestHomePage` | 1. Login sebagai Mahasiswa dan bandingkan beranda dengan Guest. | **Expected:** Tata letak & komponen Beranda Mahasiswa konsisten dengan Beranda Tamu.<br>**Actual:** Susunan komponen Beranda Mahasiswa belum tersinkron. | Produksi `v1.0.0` | **Low** *(Minor UI konsistensi)* | **P3** | Issue [`#15`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/15)<br>Commit [`8dee965`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/8dee965) | **CLOSED** *(v1.0.1)* |
| **BUG-H10** | **Form Reset Password Terbuka Tanpa Token URL & Proxy Lokal Vite Belum Aktif**<br>*Modul:* `ForgotPasswordPage`, `vite.config.ts` | 1. Akses rute lupa sandi langsung tanpa query token.<br>2. Jalankan frontend lokal mengakses `/api`. | **Expected:** Form reset hanya terbuka bila token URL valid dan request `/api`/`/storage` lokal diproxy ke `:3000`.<br>**Actual:** Form reset terbuka bebas + terdapat tombol jalan buntu `ForgotSentStep`. | Produksi & Lokal `v1.0.1` | **High** *(Keamanan alur auth & DX)* | **P1** | Issue [`#16`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/16)<br>Commit [`a04cce3`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/a04cce3) | **CLOSED** *(v1.1.0)* |

### 5.3 Metrik Persentase Resolusi (`%`)

$$\text{Persentase Resolusi} = \frac{\text{Jumlah Item Berstatus CLOSED}}{\text{Total Item Dilaporkan}} \times 100\%$$

| Kategori Temuan | Total Dilaporkan | Status `CLOSED` | Status `OPEN` | Persentase Resolusi (`%`) | Keterangan |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Siklus Evaluasi Pasca-Rilis (`#1`–`#6`, `#28`–`#30`)** | 9 | 9 | 0 | **100%** | Patch `v1.1.1` (`#1`–`#2`), Minor `v1.2.0` (`#3`–`#5`), Patch `v1.2.1` (`#6`), Minor `v1.3.0` (`#28`–`#30`) |
| **Jejak Defect Historis (`#7`–`#16`)** | 10 | 10 | 0 | **100%** | Meliputi 1 *Critical*, 4 *High*, 1 *Medium*, 4 *Low* sepanjang `v0.2.0`–`v1.1.0` |
| **Total Keseluruhan (`#1`–`#16`, `#28`–`#30`)** | **19** | **19** | **0** | **100%** | Seluruh bug mayor, minor & revisi UAT tuntas (`19/19 CLOSED`) |

---

## Bab 6: Hasil Smoke Test Otomatis (`scripts/smoke-test.mjs`), Checklist Deployment & Prosedur Rollback

### 6.1 Spesifikasi Smoke Test Otomatis (`scripts/smoke-test.mjs`)
Script `scripts/smoke-test.mjs` (*zero-dependency ESM Node.js*) dijalankan melalui perintah `npm run smoke` (atau dengan flag `--base-url=<url>` dan `--frontend-url=<url>`) untuk melakukan *black-box sanity check* terhadap 6 titik kritis pasca-build dan pasca-deploy:

| No | Nama Probe | Target Endpoint | Kriteria Validasi (`PASS`) |
| :-: | :--- | :--- | :--- |
| 1 | **Health Check & Version** | `GET <base-url>/api/v1/health` | HTTP `200`, JSON `status === "ok"`, field `version` string non-kosong. |
| 2 | **Public Service Posts** | `GET <base-url>/api/v1/posts` | HTTP `200`, JSON `data` berupa array non-kosong (`data.length > 0`). |
| 3 | **Public Items (Zero PII Leak)** | `GET <base-url>/api/v1/items?page=1&limit=5` | HTTP `200`, JSON `data` array, serta **nol kemunculan** `private_verification_notes` pada payload respons. |
| 4 | **Officer RBAC Guard (Unauth)** | `GET <base-url>/api/v1/officer/inventory` | Request tanpa `Authorization` harus ditolak dengan HTTP `401`. |
| 5 | **OpenAPI YAML Contract** | `GET <base-url>/openapi.yaml` | HTTP `200` dan body mengandung `openapi:`. |
| 6 | **Frontend SPA Entrypoint** | `GET <frontend-url>/` | HTTP `200` dan HTML mengandung `<div id="root">` atau `<!doctype html>` *(case-insensitive)*. |

### 6.2 Rekaman Hasil Eksekusi Smoke Test (Lokal Staging vs Produksi)

> [!NOTE]
> Rekaman hasil di bawah merupakan eksekusi terverifikasi untuk rilis sebelumnya (`v1.2.0` lokal & `v1.2.1` produksi pada commit `685f4c6`). Untuk rilis **`v1.3.0`**, gerbang pra-rilis di lokal telah diverifikasi melalui suite Vitest Backend/Frontend, `npm run build`, dan `npm run db:migrate`; eksekusi `npm run smoke` untuk `v1.3.0` dijalankan setelah proses commit, tagging, dan deployment selesai.

#### A. Eksekusi Staging Lokal (`npm run smoke -- --base-url=http://localhost:3000 --frontend-url=http://localhost:4173`)
| Probe | Endpoint | Status HTTP | Latensi (ms) | Hasil |
| :--- | :--- | :---: | :---: | :---: |
| 1. Health Check & Version | `http://localhost:3000/api/v1/health` | `200` | `114.0 ms` | **PASS** |
| 2. Public Service Posts | `http://localhost:3000/api/v1/posts` | `200` | `447.1 ms` | **PASS** |
| 3. Public Items (Zero PII Leak) | `http://localhost:3000/api/v1/items?page=1&limit=5` | `200` | `113.5 ms` | **PASS** |
| 4. Officer RBAC Guard (Unauth) | `http://localhost:3000/api/v1/officer/inventory` | `401` | `2.9 ms` | **PASS** |
| 5. OpenAPI YAML Contract | `http://localhost:3000/openapi.yaml` | `200` | `4.1 ms` | **PASS** |
| 6. Frontend SPA Entrypoint | `http://localhost:4173/` | `200` | `15.6 ms` | **PASS** |

*Ringkasan Lokal (`v1.2.0`):* **6/6 probes PASSED** (exit code `0`).

#### B. Eksekusi Produksi (`npm run smoke -- --base-url=https://lostandfound-budiluhur.web.id` — Rilis `v1.2.1` commit `685f4c6`)
| Probe | Endpoint | Status HTTP | Latensi (ms) | Hasil |
| :--- | :--- | :---: | :---: | :---: |
| 1. Health Check & Version | `https://lostandfound-budiluhur.web.id/api/v1/health` | `200` | `1698.3 ms` | **PASS** |
| 2. Public Service Posts | `https://lostandfound-budiluhur.web.id/api/v1/posts` | `200` | `2901.5 ms` | **PASS** |
| 3. Public Items (Zero PII Leak) | `https://lostandfound-budiluhur.web.id/api/v1/items?page=1&limit=5` | `200` | `3336.8 ms` | **PASS** |
| 4. Officer RBAC Guard (Unauth) | `https://lostandfound-budiluhur.web.id/api/v1/officer/inventory` | `401` | `594.3 ms` | **PASS** |
| 5. OpenAPI YAML Contract | `https://lostandfound-budiluhur.web.id/openapi.yaml` | `200` | `567.3 ms` | **PASS** |
| 6. Frontend SPA Entrypoint | `https://lostandfound-budiluhur.web.id/` | `200` | `782.4 ms` | **PASS** |

*Ringkasan Produksi (`v1.2.1`):* **6/6 probes PASSED** (`version: "1.2.1"`, `commit: "685f4c6"`, `<meta name="app-version" content="1.2.1" />`).

### 6.3 Checklist Deployment Rilis `v1.3.0` (dan Rekam Rilis `v1.2.0` / `v1.2.1`)

- [x] **Sinkronisasi Versi `1.3.0` & Build Monorepo:** Root `package.json`, `apps/backend/package.json`, dan `apps/frontend/package.json` diperbarui ke `1.3.0`; `npm run build` Backend & Frontend selesai dengan exit code `0`.
- [x] **Migrasi Skema Database Neon PostgreSQL (`v1.3.0`):** `npm run db:migrate --prefix apps/backend` menambahkan kolom aditif `item_returns.recipient_identifier VARCHAR(50)` (melengkapi migrasi `v1.2.0`: `found_items.storage_limit_days` & `found_items.archived_at`).
- [x] **Verifikasi Test Suite Lintas Workspace (`v1.3.0`):** Backend (`npx vitest run --fileParallelism=false`: **14 test files, 145 tests PASS**) dan Frontend (`npx vitest run`: **16 test files, 95 tests PASS**) lulus 100%.
- [x] **Verifikasi Smoke Test Rilis Sebelumnya (`v1.2.0` / `v1.2.1`):** Lokal (`:3000` / `:4173`) `6/6 probes PASSED` dan Produksi (`v1.2.1`, `685f4c6`) `6/6 probes PASSED`.
- [ ] **Verifikasi Commit, Tag & Smoke Test Produksi `v1.3.0`:** Jalankan `npm run smoke -- --base-url=https://lostandfound-budiluhur.web.id` setelah commit, git tag `v1.3.0`, dan promosi deployment ke produksi.

### 6.4 Prosedur Rollback (Mitigasi Kegagalan Produksi)

> [!CAUTION]
> Jika pasca-deployment ke produksi ditemukan error `5xx` berulang, kegagalan otentikasi, atau *smoke test* gagal pada salah satu dari 6 probe kritis, segera jalankan langkah *rollback* berikut dalam < 5 menit.

1. **Rollback Instan Aplikasi di Vercel (Zero-Rebuild):**
   - Buka **Vercel Dashboard → Deployments** pada proyek UBL Lost and Found, pilih deployment stabil terakhir bertanda rilis **`v1.2.1`** (commit `685f4c6`) — atau `v1.1.1` (`a92f64f`) bila dibutuhkan — lalu klik **Promote to Production** (atau via CLI `vercel rollback <deployment-url>`).
2. **Rollback Source Code Git ke Tag Stabil `v1.2.1`:**
   ```bash
   # Periksa tag rilis stabil sebelumnya
   git tag -l
   # Buat hotfix/revert dari state stabil v1.2.1 bila diperlukan perbaikan kode
   git revert --no-commit <commit-bermasalah>..HEAD
   ```
3. **Kompatibilitas & Rollback Skema Database (`drizzle-kit` / Neon):**
   - Perubahan skema `v1.3.0` (`item_returns.recipient_identifier VARCHAR(50)`) maupun `v1.2.0` (`found_items.storage_limit_days`, `found_items.archived_at`) dirancang **aditif (*backward-compatible*)**, sehingga kode `v1.2.1` tetap berjalan normal tanpa error kolom bila dilakukan *rollback* aplikasi secara instan.
   - Jika mutlak perlu mengembalikan struktur tabel secara penuh, gunakan fitur **Neon Branching / Point-in-Time Restore** sebelum waktu migrasi atau jalankan `ALTER TABLE` terukur setelah *backup snapshot* Neon dipastikan tersedia.
4. **Verifikasi Pasca-Rollback:**
   - Jalankan ulang `node scripts/smoke-test.mjs --base-url=https://lostandfound-budiluhur.web.id` untuk memastikan seluruh 6 probe kembali berstatus `PASS` dengan versi rilis stabil pada `/api/v1/health`.

---

## Bab 7: Analisis Akhir, Rekomendasi & Form Sign-Off UAT

### 7.1 Analisis Akhir Kesiapan Rilis
Berdasarkan hasil implementasi perbaikan pasca-rilis (`v1.1.1`–`v1.2.1`) serta penyempurnaan arsip dan administrasi serah terima BAST (`v1.3.0`):
1. **Keandalan Fungsional:** Seluruh temuan operasional lintas dua siklus evaluasi (`#1`–`#6` dan `#28`–`#30`, termasuk guard arsip kosong `409`/disabled, filter eksklusif *Hanya Arsip*, NIM/ID Kampus opsional penerima, detail penerima di Rekap A4, dan cetak BAST satuan) telah tertangani dengan persentase resolusi **100% (9/9 pasca-rilis; 19/19 total keseluruhan)**.
2. **Keamanan & Privasi:** Pemisahan DTO publik (`FoundItemPublic`) dan DTO petugas (`InventoryOfficerDto`) menjamin zero-leakage atas `private_verification_notes` baik di API publik, lembar cetak `InventoryReportSheet`, maupun lembar `HandoverReceiptSheet` (BAST), diperkuat oleh validasi RBAC server-side dan upload token anti-replay.
3. **Observabilitas Rilis:** Keberadaan `version` + `commit` di `/api/v1/health` serta script `scripts/smoke-test.mjs` mempermudah verifikasi otomatis setiap kali deployment dilakukan.

### 7.2 Rekomendasi Lanjutan
1. **Otomasi Gate Verifikasi Lokal Pre-Push (Tanpa GitHub Actions):** Biasakan menjalankan satu rangkaian CLI lokal (`npm run typecheck`, `vitest run` backend & frontend, `npm run build`, dan `npm run smoke`) sebelum mengeksekusi `git push origin main --tags`.
2. **Backup & Pemeliharaan Neon PostgreSQL:** Manfaatkan jadwal *snapshot* / *branch backup* Neon sebelum menjalankan skrip migrasi `db:push` dan sebelum petugas melakukan pembersihan arsip masal di akhir tahun ajaran.
3. **Monitoring Latensi & Error Rate:** Pantau log Vercel Functions secara berkala untuk mendeteksi anomali latensi pada endpoint `/api/v1/items` dan `/storage/*`.

### 7.3 Form Sign-Off UAT & Persetujuan Rilis `v1.3.0`

Dengan menandatangani tabel persetujuan di bawah ini, para pemangku kepentingan menyatakan bahwa seluruh skenario pengujian integrasi, UAT mitra, dan kriteria kelayakan rilis telah ditinjau dan disetujui untuk dioperasikan di **Pos Pengajaran — Gedung Unit 4 Lantai 1, Universitas Budi Luhur**.

| Peran / Jabatan | Nama / Perwakilan | Keputusan | Tanggal | Tanda Tangan / Paraf |
| :--- | :--- | :---: | :---: | :---: |
| **Tim Pengembang & QA Lead** | *ArleneNero / Tim Capstone UBL Lost and Found* | `APPROVED` / `HOLD` | 24/11/2026 | `___________________` |
| **Mitra Operasional (Petugas Posko)** | *Perwakilan Pos Pengajaran — Gedung Unit 4 Lt. 1* | `APPROVED` / `HOLD` | `___/___/2026` | `___________________` |
| **Dosen Pengampu / Pembimbing** | *Dosen Pengampu Mata Kuliah Capstone* | `APPROVED` / `HOLD` | `___/___/2026` | `___________________` |
