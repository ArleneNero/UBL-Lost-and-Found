# Changelog

Semua perubahan penting pada proyek **UBL Lost and Found** didokumentasikan dalam berkas ini.

Format mengikuti **[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/)** dan menerapkan **[Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html)** (`MAJOR.MINOR.PATCH`), dengan prinsip penulisan *human-first* (deskripsi perubahan di awal kalimat, tautan Issue & hash commit di bagian belakang).

---

## Kebijakan Versi (*Release & Tagging Policy*)

| Segmen | Nama | Trigger Perubahan | Dampak DB / Kompatibilitas |
| :--- | :--- | :--- | :--- |
| **`X.0.0`** | **MAJOR** | *Breaking change* (migrasi kontrak `/api/v1` → `/api/v2`, perombakan auth/RBAC dasar seperti penambahan role baru, atau perubahan skema destruktif). | Tidak kompatibel ke belakang |
| **`1.Y.0`** | **MINOR** | Penambahan fitur baru (`feat`), peningkatan alur UAT, atau perluasan API yang tetap kompatibel ke belakang. | Kompatibel (*backward-compatible*) |
| **`1.1.Z`** | **PATCH** | Perbaikan bug (`fix`), penyesuaian keamanan/deploy/routing, atau refactor tanpa menambah fitur pengguna baru. | Kompatibel |
| **`0.x.y`** | **Pre-Release** | Milestone pengembangan bertahap di Git sebelum rilis produksi stabil pertama (`v1.0.0`) online di Vercel. | Fase pembangunan |

---

## [Unreleased]

---

## [1.5.0] - 2026-11-27

Rilis **Security Hardening & 30-Bug Audit Remediation** (Milestone [`#23`](https://github.com/ArleneNero/UBL-Lost-and-Found/milestone/23)) yang menuntaskan seluruh 30 temuan (`FIND-01`–`FIND-30`: `3` Critical, `11` High, `10` Medium, `6` Low) lintas konfigurasi environment, pipeline upload R2 serverless, autentikasi/OTP/reset sandi, konkurensi database, dan keamanan frontend, terverifikasi **`35/35` test files (`319/319` tests PASS)**.

### Security
- Hapus seluruh kredensial fallback live Neon PostgreSQL dan Cloudflare R2 dari `apps/backend/src/config/env.ts` (`FIND-01`), wajibkan validasi env *fail-fast* (`parseEnv()`) di non-test serta `AUTH_SECRET` (`>= 32` karakter) di produksi, dan derivasikan `getStorageSigningSecret()` dari `resolveRuntimeAuthSecret()` ([`#33`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/33), [`4deff2b`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/4deff2b)).
- Tutup celah penulisan R2 tanpa autentikasi dengan menghapus `simulatePut` dari `R2StorageProvider` serta menonaktifkan rute `/mock-r2/:bucket/*` di luar runtime uji mock (`NODE_ENV === "test" && !uploadsService.isUsingR2()`, `FIND-02`) ([`#33`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/33), [`4deff2b`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/4deff2b), [`76e3857`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/76e3857)).
- Tutup celah *path traversal* & *Stored XSS* pada proxy media `GET /storage/*` (`FIND-03`, `FIND-05`) melalui `validateStorageKey()` (`STORAGE_KEY_REGEX`), boundary check `storageRoot`, penonaktifan local fallback di produksi, tanda tangan URL HMAC-SHA256 ber-TTL (`verifyStorageSignature` + `timingSafeEqual`), whitelist MIME raster (`image/jpeg`, `image/png`, `image/webp`), serta header `X-Content-Type-Options: nosniff` dan `Content-Security-Policy: default-src 'none'` ([`#33`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/33), [`4deff2b`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/4deff2b), [`76e3857`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/76e3857)).
- Perketat keamanan relay `PUT /api/v1/uploads/:upload_id/content` (`FIND-06`), kebijakan CORS allowlist `env.FRONTEND_ORIGIN` (`FIND-07`), dan validasi *magic bytes* gambar JPEG/PNG/WebP + kecocokan `Content-Type` saat finalisasi upload (`FIND-18`) ([`#33`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/33), [`#34`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/34), [`4deff2b`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/4deff2b)).
- Terapkan *rate limiting* terdistribusi berbasis PostgreSQL (`@fastify/rate-limit@^10.3.0` + `ServerlessRateLimitStore` pada `rate_limit_buckets`) untuk endpoint `/api/v1/auth/*`, `/api/v1/student/*`, dan `/api/v1/uploads/*`, cooldown 60 detik berbasis DB pada `POST /auth/forgot-password` (`FIND-16`), serta `AuthProbeLimiter` per-IP pada probe duplikat registrasi OTP (`FIND-17`) ([`#34`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/34), [`#35`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/35), [`4deff2b`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/4deff2b), [`5b664df`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/5b664df)).
- Migrasikan token reset kata sandi ke penyimpanan persisten sekali pakai `password_reset_tokens` dengan konsumsi atomik `jti` (`FIND-04`), terapkan validasi ketat header `alg`/`typ`, klaim `iss`, dan wajib `exp` pada `JwtService.verifyToken()` (`FIND-25`), bungkus seluruh rute auth dengan `handleAuthCatchError()`, dan tambahkan `bcrypt.compare(..., DUMMY_BCRYPT_HASH)` konstan pada miss login (`FIND-26`) ([`#35`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/35), [`5b664df`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/5b664df)).
- Tambahkan `OfficerRouteGuard` untuk membungkus seluruh rute `/petugas/*` agar pengguna anonim dan non-`OFFICER` diarahkan ke `/petugas/login` (`FIND-12`), serta hapus fallback kredensial demo hardcoded di `LoginForm.tsx` (`FIND-13`) ([`#37`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/37), [`d3aa9e8`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/d3aa9e8)).

### Added
- Tambah skema Drizzle & migrasi idempoten (`apps/backend/src/db/schema/uploads.ts`, `auth.ts`, `migrate-columns.ts`) untuk tabel `upload_intents`, `consumed_upload_tokens`, `password_reset_tokens`, dan `rate_limit_buckets` guna mendukung eksekusi stateless multi-instance Vercel (`FIND-04`, `FIND-08`, `FIND-09`, `FIND-16`) ([`#34`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/34), [`#35`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/35), [`4deff2b`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/4deff2b)).
- Tambah metode kontrak eksplisit `getMySubmissions`, `getOfficerSubmissions`, `getOfficerItemById`, `requestPasswordReset`, dan `resetPassword` pada kontrak & layanan `Http*` / `InMemory*` (`FIND-14`, `FIND-30`), utilitas paginasi `fetchAllPages()` (`FIND-21`), serta suite pengujian baru `uploads.security.test.ts` (9 tests), `officer-logic.unit.test.ts`, `auditFixesGuardsAndAuth.test.tsx` (11 tests), dan `auditFixesServicesAndUi.test.tsx` (13 tests) ([`#33`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/33), [`#36`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/36), [`#37`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/37), [`4deff2b`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/4deff2b), [`2af3106`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/2af3106), [`d3aa9e8`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/d3aa9e8)).

### Fixed
- Migrasikan `IntentRegistry` dan `UploadTokenService` ke PostgreSQL dengan finalisasi/konsumsi atomik lintas instance serta perbaiki `bodyLimit: MAX_UPLOAD_SIZE_BYTES` (5 MiB) pada relay `PUT /uploads/:upload_id/content` (`FIND-08`, `FIND-09`, `FIND-19`) ([`#34`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/34), [`4deff2b`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/4deff2b), [`2af3106`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/2af3106)).
- Serialisasi `requestStudentRegisterOtp` dalam satu `db.transaction` dengan `pg_advisory_xact_lock(hashtext(normalizedEmail))` serta rollback lock challenge bila pengiriman Resend gagal (`FIND-15`) ([`#35`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/35), [`5b664df`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/5b664df)).
- Terapkan row lock `SELECT ... FOR UPDATE` dan guard precondition status atomik pada seluruh transisi laporan & inventaris (`cancelSubmission`, `receiveSubmission`, `rejectSubmission`, `returnItem`, `distributeItem`, `updateItemVisibility`, `FIND-10`), advisory lock untuk penomoran berurutan `INV-YYYY-XXXX` & `REP-YYYY-XXXX` (`FIND-11`), validasi tanggal kalender `isValidCalendarDate()` pada `found_on` (`FIND-20`), pre-check kelayakan sebelum konsumsi token upload pada penerimaan laporan (`FIND-27`), serta penolakan eksplisit `400 VALIDATION_ERROR` untuk query list invalid (`FIND-28`) ([`#36`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/36), [`2af3106`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/2af3106)).
- Hilangkan ketergantungan `mockStore.currentUser` di adapter HTTP (`FIND-14`), lengkapi paginasi agregasi dashboard/laporan/profil (`FIND-21`), pertahankan sesi pengguna saat error jaringan/`5xx` pada `HttpAuthService.getCurrentUser()` (`FIND-22`), tampilkan `<ErrorState onRetry />` pada kegagalan load `ItemDetailPage`/`PostsPage` (`FIND-23`), sinkronkan validasi `description` laporan, payload `{ notes }` pada `distributeItem`, tanggal WIB, & preview waktu server read-only di `OfficerRegisterItemPage` (`FIND-24`), pisahkan tampilan status `CANCELLED` di `OfficerReportDetailPage` (`FIND-29`), dan arahkan `ForgotPasswordForm` ke `ServiceRegistry` (`FIND-30`) ([`#37`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/37), [`d3aa9e8`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/d3aa9e8), [`2af3106`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/2af3106)).
- Bump versi monorepo (`package.json`, `apps/backend/package.json`, `apps/frontend/package.json`) ke `1.5.0` dan sinkronkan seluruh bundle serverless `api/*.cjs`, `api/*.js`, `api/[...routes].cjs`, dan `apps/backend/*.cjs` ([`ced40e6`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/ced40e6)).

---

## [1.4.0] - 2026-11-25

### Added
- Tambah tabel `otp_challenges` pada skema Drizzle (`apps/backend/src/db/schema/auth.ts`, `schema/index.ts`) beserta indeks `idx_otp_challenges_email_created` dan migrasi SQL idempoten (`apps/backend/src/db/migrate-columns.ts`) untuk penyimpanan OTP 6 digit *stateful* (HMAC-SHA256 bergaram, masa berlaku 10 menit, cooldown resend 60 detik, batas 5 percobaan, dan konsumsi atomik *single-use*) ([`#31`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/31), [`#32`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/32), [`f392bf4`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/f392bf4)).
- Tambah endpoint `POST /api/v1/auth/student-register/request-otp` (`auth.routes.ts`, `auth.service.ts`, `openapi.contract.ts`) beserta pengiriman kode OTP ke email kampus melalui Resend (`EmailService.sendRegistrationOtpEmail()` dengan *HTML escaping* `escapeHtml()`, pembatalan challenge & respons `502 EMAIL_DELIVERY_FAILED` saat gagal kirim) dan guard cooldown `429 OTP_COOLDOWN_ACTIVE` ([`#31`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/31), [`#32`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/32), [`f392bf4`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/f392bf4)).
- Tambah helper frontend `validateAndExtractStudentNim()` (`apps/frontend/src/features/auth/utils/studentEmailNim.ts`), tampilan pratinjau **NIM Terdeteksi Otomatis** pada `RegisterForm.tsx`, integrasi modal `OtpVerificationModal.tsx` (6 digit OTP, `autoComplete="one-time-code"`, paste multi-digit, countdown 60 detik sinkron, dan lock aksi selama request), serta suite pengujian baru `apps/frontend/src/tests/studentRegisterOtp.test.tsx` (14 tests) ([`#32`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/32), [`f392bf4`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/f392bf4)).

### Changed
- Hapus kolom input manual **NIM** dari `RegisterForm.tsx`, serta perketat kontrak DTO `studentRegisterRequestOtpSchema`, `studentRegisterSchema`, dan `bootstrapRequestSchema` dengan `.strict()` agar injeksi field `student_number` ditolak (`400 VALIDATION_ERROR`) dan NIM selalu diekstrak dari *local-part* email kampus di UI maupun server ([`#31`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/31), [`#32`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/32), [`f392bf4`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/f392bf4)).
- Sinkronkan paritas `HttpAuthService.ts` & `InMemoryAuthService.ts` (dukungan `requestStudentRegisterOtp`, challenge token, guard replay, dan lockout 5 percobaan OTP), validasi nama lengkap `2–120` karakter di `RegisterForm.tsx`, serta perluas build root `package.json` untuk menyalin `api/[...routes].cjs` ([`#31`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/31), [`#32`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/32), [`f392bf4`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/f392bf4)).

### Fixed
- Tutup celah registrasi NIM fiktif & email kampus non-NIM dengan memberlakukan `STRICT_STUDENT_NIM_REGEX` (`/^\d{10}$/`) dan `isStrictStudentEmail()` (`@student.budiluhur.ac.id` tepat 10 digit angka, menolak `< 10`, `> 10`, maupun non-angka dengan `400 INVALID_STUDENT_NIM` / `403 INVALID_STUDENT_DOMAIN`) serta mewajibkan verifikasi OTP Resend sebelum pembuatan akun `STUDENT` (`429 OTP_MAX_ATTEMPTS_EXCEEDED` setelah 5x salah) ([`#31`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/31), [`f392bf4`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/f392bf4)).
- Perketat keamanan autentikasi melalui `resolveRuntimeAuthSecret()` (`env.ts`: wajib `AUTH_SECRET` >= 32 karakter di produksi / `503 SERVER_MISCONFIGURED` tanpa fallback statis), penolakan token ber-`purpose` di `authenticate()` dan `POST /api/v1/me/bootstrap` (`401 UNAUTHORIZED`), pencegahan penimpaan role `OFFICER` di `bootstrapStudent()`, validasi origin tepercaya `resolveTrustedFrontendOrigin()` pada `/auth/forgot-password`, sanitasi error `500` & mapping unique constraint `23505 -> 409`, serta ubah fallback UI NIM kosong pada `StudentLayout.tsx` dan `StudentWelcomeBanner.tsx` dari `'2411502194'` menjadi `'-'` ([`#31`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/31), [`f392bf4`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/f392bf4)).

---

## [1.3.0] - 2026-11-24

### Added
- Tambah kolom opsional `item_returns.recipient_identifier` (`VARCHAR(50)`) pada skema Drizzle (`apps/backend/src/db/schema/items.ts`) dan migrasi idempoten (`apps/backend/src/db/migrate-columns.ts`), serta perluas `returnRecordDtoSchema` dan `inventoryOfficerDtoSchema` untuk menyertakan `recipient_identifier` dan `returned_by_name` ([`#30`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/30), [`57cdc3f`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/57cdc3f)).
- Tambah input **NIM / ID Kampus (Opsional)** pada `ReturnItemModal` (mendukung tamu non-mahasiswa bila dikosongkan), panel **Ringkasan Serah Terima**, serta lembar cetak A4 resmi **Berita Acara Serah Terima Barang Temuan (`HandoverReceiptSheet`, `BAST/<inventoryCode>`)** di `OfficerItemDetailPage` tanpa membocorkan `privateNotes` ([`#30`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/30), [`57cdc3f`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/57cdc3f)).
- Tambah opsi **Sertakan Detail Penerima (Serah Terima)** di `InventoryReportPeriodBar` dan `InventoryReportPrintModal` (otomatis aktif saat filter status `RETURNED_TO_OWNER`) untuk menampilkan kolom **Detail Serah Terima** pada `InventoryReportSheet` dengan format tanggal/waktu WIB (`wibDateFormatters.ts`) tanpa menyertakan `privateNotes` ([`#30`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/30), [`57cdc3f`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/57cdc3f)).
- Tambah suite pengujian baru `apps/frontend/src/tests/officerHandoverAndReportPrint.test.tsx` serta perluasan cakupan pengujian DTO, arsip, dan serah terima pada `apps/backend/tests/officer.dto.test.ts`, `apps/backend/tests/officer-flows.test.ts`, dan `apps/frontend/src/tests/tahap3MockDataAndInventory.test.tsx` ([`#28`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/28), [`#29`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/29), [`#30`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/30), [`57cdc3f`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/57cdc3f)).

### Fixed
- Tolak eksekusi arsip kosong di `OfficerInventoryService.cleanCompletedInventory` (`POST /api/v1/officer/inventory/clean`) dengan HTTP `409` (`NO_ARCHIVABLE_ITEMS`) serta guard error di `InMemoryItemService.cleanCompletedInventory`, dan nonaktifkan checkbox konfirmasi serta tombol **Bersihkan (Arsipkan)** di `CleanInventoryModal` disertai pesan status informatif ketika `0` barang selesai siap diarsipkan ([`#28`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/28), [`57cdc3f`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/57cdc3f)).
- Tambah parameter query `archived_only=true` pada `GET /api/v1/officer/inventory` (`officer-inventory.routes.ts`, `officer-inventory.repository.ts`, `HttpItemService.ts`, `InMemoryItemService.ts`) dan perbarui filter arsip di `/petugas/inventaris` menjadi checkbox eksklusif **Hanya Arsip** dengan banner mode arsip, badge **Diarsipkan**, serta komponen `InventoryEmptyState` yang menampilkan jumlah barang aktif dan tombol **Kembali ke Inventaris Aktif** saat belum ada arsip ([`#29`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/29), [`57cdc3f`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/57cdc3f)).

---

## [1.2.1] - 2026-11-23

### Fixed
- Sertakan field `version` dan `commit` pada direct diagnostic health probe handler di `apps/backend/src/index.ts` agar `/api/v1/health` dan `/health` di serverless Vercel melaporkan versi rilis secara akurat ([`#6`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/6), [`685f4c6`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/685f4c6)).

---

## [1.2.0] - 2026-11-23

### Added
- Ubah default `storage_limit_days` pada seed Pos Pengajaran (`servicePost.fixture.ts`) dan `DEFAULT_STORAGE_LIMIT_DAYS` frontend dari `30` menjadi **`365 hari` (1 tahun)** sesuai SOP mitra ([`#3`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/3), [`676d084`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/676d084)).
- Tambah kolom snapshot `found_items.storage_limit_days` yang otomatis diisi saat item baru dicatat/diterima (`insertItemWithPhoto` & `receiveSubmission`) sehingga perubahan setting tidak mengubah batas simpan barang lama secara retroaktif ([`#3`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/3), [`676d084`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/676d084)).
- Tambah endpoint `GET /api/v1/officer/post-settings` dan `PATCH /api/v1/officer/post-settings` (validasi `1..730` hari) dengan scoping ketat `context.postId` ([`#3`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/3), [`676d084`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/676d084)).
- Tambah kartu **Kebijakan Batas Simpan (Overdue)** (`StoragePolicyCard` + `useStoragePolicy`) pada halaman Akun Petugas (`/petugas/akun`) lengkap dengan tombol reset `365 Hari` dan konfirmasi dampak non-retroaktif ([`#3`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/3), [`676d084`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/676d084)).
- Tambah kolom nullable `found_items.archived_at` pada skema Drizzle untuk menandai arsip item selesai tanpa menghapus jejak audit (`item_returns`, `found_submissions`) ([`#4`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/4), [`444ca6b`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/444ca6b)).
- Tambah endpoint `POST /api/v1/officer/inventory/clean` (opsional filter `month`) yang hanya mengarsipkan item berstatus `RETURNED_TO_OWNER` dan `DISTRIBUTED` — barang `STORED` tetap aman ([`#4`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/4), [`444ca6b`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/444ca6b)).
- Tambah modal konfirmasi `CleanInventoryModal`, tombol **Bersihkan Arsip**, pintasan ke cetak rekap sebelum clean, dan toggle filter **Tampilkan Arsip** pada `/petugas/inventaris` ([`#4`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/4), [`444ca6b`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/444ca6b)).
- Tambah selector periode fleksibel (`day`, `week` Senin–Minggu, `month`, `year`, `custom`) berbasis tanggal lokal WIB (`Asia/Jakarta`) pada `reportDateSelectors.ts`, `reportSummarySelectors.ts`, `InventoryReportPeriodBar`, dan `InventoryReportPrintModal` ([`#5`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/5), [`b8b51f0`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/b8b51f0)).
- Sajikan ringkasan angka (**Total Masuk**, **Tersedia**, **Sudah Diserahkan**, **Disalurkan**, dan breakdown **per Kategori**) serta tabel rincian barang tanpa catatan rahasia `privateNotes` ([`#5`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/5), [`b8b51f0`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/b8b51f0)).
- Tambah kop resmi Pos Pengajaran, blok tanda tangan petugas, dan layout `@media print` A4/PDF multi-halaman di luar container scroll modal (`hidden print:block`) ([`#5`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/5), [`b8b51f0`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/b8b51f0)).
- Tambah script `scripts/smoke-test.mjs` (`npm run smoke`) yang memverifikasi status HTTP dan latensi (`ms`) untuk `/api/v1/health`, `/api/v1/posts`, isolasi PII `/api/v1/items`, guard `401` `/api/v1/officer/inventory`, `/openapi.yaml`, dan halaman frontend `/` ([`7aba54c`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/7aba54c)).
- Tambah `docs/reports/LAPORAN_PENGUJIAN_DAN_UAT.md` sesuai standar P11: strategi integrasi, daftar stub/driver, matriks test case + kasus gagal, skenario UAT *Given–When–Then*, log bug + metrik `%` penyelesaian, serta checklist deploy & rollback ([`ee323ac`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/ee323ac)).

### Changed
- Naikkan batas maksimum query `limit` pada `GET /api/v1/officer/inventory` (`officer-inventory.routes.ts`, `officer-inventory.repository.ts`, dan `HttpItemService.ts`) dari `10` menjadi `100` dengan query `include_archived` ([`#4`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/4), [`444ca6b`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/444ca6b)).
- Perbarui `getOverdueItems()` untuk mengevaluasi `item.storageLimitDays ?? post.storageLimitDays ?? 365` dan mengabaikan item yang sudah diarsipkan (`archived_at IS NOT NULL`) ([`#3`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/3), [`676d084`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/676d084), [`444ca6b`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/444ca6b)).

---

## [1.1.1] - 2026-11-23

### Added
- Jadikan root `package.json` sebagai *Single Source of Truth* versi rilis, disuntikkan ke build frontend Vite (`__APP_VERSION__` & `<meta name="app-version">`), badge halaman Akun Petugas, serta diekspos bersama `VERCEL_GIT_COMMIT_SHA` di `/health` dan `/api/v1/health` ([`a92f64f`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/a92f64f)).

### Fixed
- Perbaiki kegagalan konfirmasi terima fisik laporan masuk di produksi (`422 INVALID_TOKEN`) akibat string mock `'mock-verified-receipt-token'` di `OfficerReportDetailPage.tsx`; jadikan `item_photo_upload_tokens` opsional di `receiveRequestSchema` agar server otomatis memakai `submission.reportPhotoPath`, dan pisahkan `actionError` dari state `error` halaman di `useOfficerReportDetail.ts` ([`#1`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/1), [`104201d`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/104201d)).
- Sembunyikan komponen `ItemVisibilityToggle` di `OfficerItemDetailPage.tsx` untuk barang berstatus `RETURNED_TO_OWNER` dan `DISTRIBUTED` agar tidak memicu `409 INVALID_STATUS_TRANSITION`, serta pisahkan `actionError` di `useOfficerItemDetail.ts` menjadi alert inline non-destruktif ([`#2`](https://github.com/ArleneNero/UBL-Lost-and-Found/issues/2), [`3f38144`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/3f38144)).

---

## [1.1.0] - 2026-11-21

### Added
- Tambah `PhotoSourceModal` & `CameraCaptureModal` (WebRTC), hooks `useCameraStream`/`usePhotoInput`, utilitas validasi/kompresi `photoFile.ts`, refactor `ItemPhotoUploader` & `ReportPhotoUploader`, serta unit test `photoUploader.test.tsx` ([`6b66337`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/6b66337)).
- Ganti pill header mahasiswa menjadi ikon bulat + dropdown gaya GitHub, tambah tombol `Ganti Peran` mode tamu, ringkas footer desktop 1 baris, tambah badge kategori katalog, `Hapus Filter` kondisional, navigasi `← Kembali` dinamis, grid 3×2 Panduan, dan bersihkan `StudentIdentityCard` ([`d7377a0`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/d7377a0)).
- Sinkronkan `?status=` pada Dashboard/Inventaris/Laporan petugas, tambah tombol `Catat Barang Manual` + active sidebar `/petugas/catat-barang`, tabel `whitespace-nowrap`, tampilan kartu mobile, dan rapikan catatan internal di `ReturnItemModal`/`DistributeItemModal` ([`b36af69`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/b36af69)).
- Tulis ulang menyeluruh `README.md` sesuai arsitektur aktual, peta peran, lifecycle status, keamanan R2, setup lokal, dan troubleshooting ([`75a9126`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/75a9126)).

### Changed
- Pisahkan fixture seed `student.fixture.ts` & `servicePost.fixture.ts` dari `officer.fixture.ts` dan sinkronkan `db/seed.ts` ([`cae845a`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/cae845a)).
- Sentralisasi konstanta lokasi `ACTIVE_SERVICE_POST` (`Pos Pengajaran`, `Gedung Unit 4 Lt. 1`), tambah `guestSession` guard & `?switch=true` di landing page, serta set base font `16px` input mobile anti-zoom ([`67f8d3d`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/67f8d3d)).

### Fixed
- Kunci form lupa sandi agar hanya terbuka lewat token URL valid, hapus tombol jalan buntu `ForgotSentStep`, tambah toggle sandi & recovery token kedaluwarsa, konfigurasi Vite proxy `/api` & `/storage` ke `:3000`, dan tambah `forgotPassword.test.tsx` ([`a04cce3`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/a04cce3)).

---

## [1.0.1] - 2026-11-16

### Fixed
- Satukan shell navigasi publik/mahasiswa dalam satu `PublicLayout` dan perbaiki resolusi URL foto `/storage/` di lingkungan produksi ([`130d6bc`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/130d6bc)).
- Sinkronkan tata letak dan komponen Beranda Mahasiswa agar konsisten dengan Beranda Tamu yang disetujui ([`8dee965`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/8dee965)).

---

## [1.0.0] - 2026-11-15

### Added
- Konfigurasi npm workspaces monorepo di root dan script build terpadu frontend + backend ([`243e015`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/243e015)).
- Tambahkan bundling backend Fastify dengan `esbuild` menjadi standalone runtime `dist/bundle.cjs` ([`c96bbb1`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/c96bbb1)).
- Tambahkan meta tag `deployed-commit` pada `index.html` sebagai penanda verifikasi deployment ([`f2a11fd`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/f2a11fd)).
- Tambahkan direct diagnostic probe handler untuk endpoint health `/api/v1/health` dan perbarui deploy marker ([`13ec9f5`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/13ec9f5)).

### Fixed
- Implementasikan serverless request handler bridge untuk menjalankan Fastify di Vercel ([`241dca3`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/241dca3)).
- Konfigurasikan `package.json` modul ESM pada output build `dist` untuk runtime serverless Vercel ([`16af9d0`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/16af9d0)).
- Hapus pembatasan `outputDirectory` pada service backend agar `node_modules` tetap tersedia di runtime ([`bf409cc`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/bf409cc)).
- Sertakan artefak entrypoint `bundle.cjs` untuk mengatasi error pre-build `ENTRYPOINT_NOT_FOUND` ([`24b26c4`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/24b26c4)).
- Perbaiki export handler serverless Fastify dan tambahkan JSON body parser resilient di `app.ts` ([`ffb600b`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/ffb600b)).
- Tunggu penyelesaian lifecycle response pada bridge serverless dan bersihkan file proxy usang ([`06a5a48`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/06a5a48)).
- Bersihkan export serverless Fastify untuk menghilangkan kasus request promise hang di Vercel ([`d0e7fd9`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/d0e7fd9)).
- Sediakan file entrypoint `app.cjs` dan `index.cjs` agar dikenali otomatis oleh detektor Fastify Vercel ([`556f351`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/556f351)).
- Arahkan konfigurasi service backend di `vercel.json` langsung ke entrypoint `index.cjs` ([`871a398`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/871a398)).
- Hapus pemanggilan `app.listen()` dari entrypoint serverless untuk mencegah process exit crash di Vercel ([`44e684d`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/44e684d)).
- Pulihkan aturan rewrite tingkat-service di `vercel.json` dan perbaiki await response lifecycle bridge ([`1262b30`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/1262b30)).
- Seragamkan seluruh varian entrypoint backend (`index.js`, `app.js`, `index.cjs`, `app.cjs`) menjadi pure CommonJS bundles ([`3547e49`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/3547e49)).
- Inline seluruh dependensi ke standalone CommonJS bundle di `api/` dan pulihkan lossless ingress routing ([`25e603c`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/25e603c)).
- Inline isi kontrak OpenAPI ke dalam `openapi.contract.ts` agar `/openapi.yaml` dan `/docs` berjalan penuh di serverless Vercel ([`192c8c6`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/192c8c6)).
- Tambahkan alias rute `/lupa-password` → `/lupa-sandi` pada router frontend dan selaraskan tautan reset pada email ([`f0140a0`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/f0140a0)).

---

## [0.6.0] - 2026-11-13

### Added
- Selaraskan halaman login/daftar mahasiswa, beranda mahasiswa, dan formulir lapor temuan dengan desain Figma ([`433e473`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/433e473)).
- Integrasikan layanan email **Resend** untuk tautan reset kata sandi berbatas waktu (`30 menit`) dan sederhanakan alur registrasi mahasiswa tanpa OTP ([`677088f`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/677088f)).

### Fixed
- Konfigurasi awal Vercel Fastify entrypoint, default environment variable yang tangguh, dan SPA fallback rewrites ([`8a701d9`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/8a701d9)).

---

## [0.5.0] - 2026-11-12

### Added
- Implementasi lengkap UI **Modul Mahasiswa** (`F/D`: beranda, lapor temuan, riwayat laporan, detail + pembatalan, profil) berbasis adapter mock ([`c5525cb`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/c5525cb)).
- Implementasi endpoint backend untuk laporan temuan mahasiswa (`/submissions`), antrean review & terima fisik petugas (`/officer/submissions/*`), serta serah terima & penyaluran (`/return`, `/distribute`) (`B/H`–`B/J`) ([`9e79dcd`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/9e79dcd)).
- Hubungkan layanan pelaporan temuan mahasiswa (`HttpSubmissionService`) ke REST API backend (`F/B.4`) ([`fc8e812`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/fc8e812)).
- Implementasi alur autentikasi dan registrasi mahasiswa end-to-end antara frontend dan Fastify API (`B/H.1`–`F/D.1`) ([`9e9be35`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/9e9be35)).
- Hubungkan seluruh operasi inventaris, toggle visibilitas, serah terima, dan penyaluran panel petugas ke REST API (`F/B.5`, `B/G`–`B/J`) ([`30bde13`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/30bde13)).

### Changed
- Integrasikan commit modul mahasiswa ke branch utama `main` ([`83e38d1`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/83e38d1)).
- Tambahkan konfigurasi awal Vercel multi-service hosting (`vercel.json`) untuk frontend dan backend ([`ce76e1d`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/ce76e1d)).
- Gabungkan konfigurasi Vercel multi-service hosting ke `main` ([`9d5332e`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/9d5332e)).
- Inisialisasi SDK Neon Managed Better Auth pada backend dan frontend (`B/D.1`) ([`0159d72`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/0159d72)).

### Security
- Terapkan validasi wajib email resmi kampus `@student.budiluhur.ac.id` pada registrasi dan login mahasiswa (frontend & backend) ([`5bc7969`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/5bc7969)).

---

## [0.4.1] - 2026-11-01

### Added
- Tambahkan koleksi pengujian Postman, berkas REST Client `api-requests.http`, dan konfigurasi timeout Vitest backend ([`c4f0617`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/c4f0617)).
- Tambahkan dokumentasi REST API komprehensif (`API_DOCUMENTATION.md`) ([`515b8c7`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/515b8c7)).
- Snapshot dokumentasi lengkap proyek, kontrak API/ERD, dan konfigurasi workspace ([`e22f8ce`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/e22f8ce)).

### Fixed
- Selaraskan timestamp `receivedAt` pada data item uji agar seluruh test dashboard recent items lulus konsisten ([`0ee6dc7`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/0ee6dc7)).
- Tambahkan runner npm `db:studio` dan perbaiki resolusi path skema Drizzle ([`2020748`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/2020748)).
- Definisikan lengkap relasi inverse (`relations.ts`) untuk inspeksi data di Drizzle Studio ([`eb5fa9f`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/eb5fa9f)).
- Perbaiki konsistensi alur login dari halaman landing dan verifikasi password Bcrypt di backend ([`bafe38c`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/bafe38c)).
- Tambah fallback relay upload `PUT /api/v1/uploads/:id/content` anti-CORS R2, perpanjang masa berlaku JWT petugas menjadi 2 jam, auto-clear token pada error `401`, dan perbaiki UX waktu di registrasi barang ([`081d3cc`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/081d3cc)).

---

## [0.4.0] - 2026-10-26

### Added
- Inisialisasi dokumentasi sistem komprehensif dan panduan monorepo pada `README.md` ([`cffba0b`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/cffba0b)).
- Implementasi `apiClient` type-safe dengan penanganan error envelope baku untuk frontend (`F/E.1`) ([`47e5aad`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/47e5aad)).
- Implementasi `HttpUploadService` untuk menghubungkan frontend ke pipeline Presigned PUT R2 & HMAC token (`F/E.2`) ([`bef27f5`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/bef27f5)).
- Implementasi `HttpItemService` untuk integrasi katalog publik & detail barang ke Fastify API (`F/E.2.0`–`F/E.2.1`) ([`4dd2ce9`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/4dd2ce9)).
- Tambahkan method `createItem` pada `HttpItemService` untuk pencatatan barang petugas langsung ke backend (`F/F.3.1`) ([`df3a366`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/df3a366)).
- Hubungkan adapter HTTP ke `ServiceRegistry` dan aktifkan mode live API gateway (`F/E.3.1`) ([`6e6bc08`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/6e6bc08)).
- Perbaikan isolasi navigasi guest–mahasiswa, pagination numerik 8 item/halaman, dan modal notice lapor temuan ([`22d48f9`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/22d48f9)).
- Adopsi 12 aset gambar barang temuan resmi, reset dummy data, dan setup script sinkronisasi ke Cloudflare R2 (`r2:sync`) ([`bb94757`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/bb94757)).

### Changed
- Perbarui referensi konfigurasi environment backend dan auth pada `README.md` ([`90bafd9`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/90bafd9)).

---

## [0.3.0] - 2026-10-25

### Added
- Inisialisasi backend Fastify TypeScript, skema modular Drizzle ORM, Neon PostgreSQL, dan seed runner idempoten (`B/B`) ([`9180bff`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/9180bff)).
- Implementasi DTO publik dan endpoint pembacaan pos pelayanan `GET /api/v1/posts` (`B/C.1`) ([`77a8925`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/77a8925)).
- Implementasi katalog barang publik `GET /api/v1/items` dengan filter defensif anti-SQL injection (`B/C.2`) ([`2550924`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/2550924)).
- Implementasi verifikasi token JWT, pemetaan identitas pengguna, dan policy guard khusus petugas (`B/D.1`) ([`7fe8598`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/7fe8598)).
- Implementasi endpoint `/api/v1/me`, batas trust provisioning akun, serta sensor PII otomatis pada log Fastify (`B/D.2`) ([`ff82cdc`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/ff82cdc)).
- Implementasi adapter Cloudflare R2, endpoint `POST /uploads/intents`, dan pembuatan Presigned PUT URL (`B/E.1`) ([`d7166cb`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/d7166cb)).
- Implementasi finalisasi upload `POST /uploads/:id/finalize`, token anti-replay HMAC-SHA256 15 menit, dan validasi headObject R2 (`B/E.2`) ([`02d37a6`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/02d37a6)).
- Implementasi endpoint pencatatan barang langsung `POST /officer/items`, nomor inventaris otomatis, dan transaksi DB atomik (`B/F.1`) ([`cf798ed`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/cf798ed)).
- Pengujian integrasi/E2E alur penuh MVP, aturan visibilitas publik, dan mitigasi IDOR/privasi (`B/F.2`) ([`294fac0`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/294fac0)).

### Changed
- Refactor modularisasi layer database, service, repository, dan auth guard backend (`B/B`–`B/D`) ([`4c6c8cc`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/4c6c8cc)).

---

## [0.2.0] - 2026-10-24

### Added
- Implementasi form pencatatan barang temuan langsung oleh petugas dengan preview foto wajib (`F/B.3`) ([`2ab4f36`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/2ab4f36)).
- Implementasi antrean laporan masuk mahasiswa, halaman detail laporan, dan modal konfirmasi terima fisik/tolak (`F/B.4`) ([`7e1320d`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/7e1320d)).
- Implementasi modal serah terima ke pemilik, penyaluran barang overdue, dan halaman akun petugas (`F/B.5`) ([`74207b6`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/74207b6)).
- Integrasi penyesuaian visual selektif pada dashboard, laporan menunggu, dan detail inventaris (`R1`–`R4`) ([`faed6ee`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/faed6ee)).
- Implementasi panoramic 3D hero banner pada halaman landing (`LandingPage.tsx`) ([`dd9132d`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/dd9132d)).
- Implementasi modul Tamu/Guest lengkap: beranda publik, katalog pencarian, detail barang, halaman pos pelayanan, dan panduan (`F/C`) ([`fa23787`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/fa23787)).

### Changed
- Rename struktur direktori frontend dari `apps/web` menjadi `apps/frontend` ([`5593693`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/5593693)).
- Penyesuaian tinggi hero banner dan padding tipografi landing ([`5df16ba`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/5df16ba)).

### Fixed
- Perbaikan konten dan informasi lokasi pada halaman Pos Pelayanan ([`b0b0cc6`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/b0b0cc6)).

---

## [0.1.0] - 2026-10-23

### Added
- Inisialisasi fondasi frontend React 19, Vite, Tailwind v4, design tokens, router, dan halaman autentikasi dasar (`F/A`) ([`24ea204`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/24ea204)).
- Implementasi halaman dashboard dan layout sidebar/bottom-nav panel petugas (`F/B.1`) ([`4bda491`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/4bda491)).
- Implementasi mock data store (`mockStore.ts`) dan halaman manajemen tabel inventaris petugas (`F/B.2`) ([`0d1600c`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/0d1600c)).

### Changed
- Konfigurasi production base path untuk deployment frontend statis ([`51c18f4`](https://github.com/ArleneNero/UBL-Lost-and-Found/commit/51c18f4)).

---

[Unreleased]: https://github.com/ArleneNero/UBL-Lost-and-Found/compare/v1.5.0...HEAD
[1.5.0]: https://github.com/ArleneNero/UBL-Lost-and-Found/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/ArleneNero/UBL-Lost-and-Found/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/ArleneNero/UBL-Lost-and-Found/compare/v1.2.1...v1.3.0
[1.2.1]: https://github.com/ArleneNero/UBL-Lost-and-Found/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/ArleneNero/UBL-Lost-and-Found/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/ArleneNero/UBL-Lost-and-Found/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/ArleneNero/UBL-Lost-and-Found/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/ArleneNero/UBL-Lost-and-Found/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/ArleneNero/UBL-Lost-and-Found/compare/v0.6.0...v1.0.0
[0.6.0]: https://github.com/ArleneNero/UBL-Lost-and-Found/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/ArleneNero/UBL-Lost-and-Found/compare/v0.4.1...v0.5.0
[0.4.1]: https://github.com/ArleneNero/UBL-Lost-and-Found/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/ArleneNero/UBL-Lost-and-Found/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/ArleneNero/UBL-Lost-and-Found/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/ArleneNero/UBL-Lost-and-Found/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/ArleneNero/UBL-Lost-and-Found/releases/tag/v0.1.0

