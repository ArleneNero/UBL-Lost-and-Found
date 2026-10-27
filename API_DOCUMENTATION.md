# Dokumentasi REST API — UBL Lost and Found (CampusFind)

Dokumentasi resmi arsitektur REST API, kontrak *request/response*, skema autentikasi, penyimpanan Cloudflare R2, dan otorisasi *Role-Based Access Control* (RBAC) untuk backend sistem manajemen barang temuan terpadu Universitas Budi Luhur.

---

## 1. Ringkasan & Konfigurasi Server

- **Base URL API:** `http://localhost:3000/api/v1`
- **Root / Health Check:** `http://localhost:3000/health`
- **Format Payload:** `application/json` (Kecuali endpoint relay unggahan konten foto menggunakan *binary buffer stream* seperti `image/jpeg`, `image/png`, `image/webp`)
- **Keamanan & Middleware:**
  - **Uniform Error Envelope:** Seluruh pesan error dari layer handler, middleware, hingga database ditangkap secara seragam dalam format `{ error: { code, message, request_id, details? } }`.
  - **CORS:** Dibatasi untuk klien Frontend (`http://localhost:5173` dan `http://127.0.0.1:5173`) dengan flag `credentials: true`.
  - **Zero-Trust Policy:** Server memvalidasi seluruh peran (*role*), status verifikasi, dan penugasan pos secara terpusat tanpa mempercayai klaim dari sisi klien.
  - **Privacy Isolation:** Ciri rahasia (*private verification notes*) dan barang yang belum diverifikasi berstatus `STORED` diisolasi ketat dari akses publik/tamu.
  - **Static & Storage Streaming:**
    - `/storage/*` -> Melayani *streaming* langsung dari Cloudflare R2 *bucket* dengan *signed token* serta *fallback* lokal (`apps/backend/storage/...`).

### Mekanisme Autentikasi & Sesi

Sistem menggunakan **JSON Web Token (JWT)** dengan algoritma HMAC-SHA256 (`HS256`).

- **Penyimpanan Token:** Token dikembalikan dalam *body response* saat login sukses dan disimpan pada `sessionStorage` (`lf_auth_token`) di sisi klien.
- **Header Permintaan:** Untuk seluruh *endpoint* terproteksi, sertakan header:
  ```http
  Authorization: Bearer <access_token>
  ```
- **Masa Berlaku Token:**
  - Role `OFFICER` (Petugas Posko): **2 Jam** (7.200 detik) demi keseimbangan optimal antara keamanan operasional posko dan kenyamanan kerja shift.
  - Token yang kedaluwarsa atau tidak valid akan ditolak dengan kode status `401 UNAUTHORIZED`.

### Format Standar Respon API

**Struktur Respon Sukses (Data Tunggal):**

```json
{
  "data": {
    "item_id": "6daac34e-6258-45e7-88ed-175b4097cc00",
    "item_name": "Kunci Motor Honda Vario"
  }
}
```

**Struktur Respon Sukses (Daftar & Pagination):**

```json
{
  "data": [
    {
      "item_id": "6daac34e-6258-45e7-88ed-175b4097cc00",
      "item_name": "Kunci Motor Honda Vario"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 12,
    "total_pages": 2
  }
}
```

**Struktur Respon Gagal (Error Envelope Standar):**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Format payload registrasi barang tidak valid",
    "request_id": "fbfeeccc-8928-48f9-9bed-fa0ebdfd3222",
    "details": [
      {
        "code": "too_small",
        "minimum": 1,
        "type": "array",
        "message": "Pencatatan barang mewajibkan tepat 1 token foto",
        "path": ["item_photo_upload_tokens"]
      }
    ]
  }
}
```

---

## 2. Modul Autentikasi & Profil (Auth & Profile)

Modul ini menangani autentikasi petugas pos pelayanan kampus dengan verifikasi kata sandi berbasis *bcrypt*, serta inspeksi profil pengguna aktif.

### 2.1 Login Petugas Posko (Bcrypt Verified)

- **Endpoint:** `POST /api/v1/auth/officer-login` *(Alias: `POST /api/v1/officer/login`)*
- **Authentikasi:** Tidak Butuh
- **Otorisasi Role:** `PUBLIC`

**Contoh Request:**

- **Headers:** `Content-Type: application/json`
- **Request Body JSON:**

```json
{
  "email": "lostandfound.budiluhur@gmail.com",
  "password": "kataSandiPetugas"
}
```

**Contoh Response Sukses (200 OK):**

```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzZWVkLW9mZmljZXItcGVuZ2FqYXJhbi0wMSIsImVtYWlsIjoibG9zdGFuZGZvdW5kLmJ1ZGlsdWh1ckBnbWFpbC5jb20iLCJuYW1lIjoiUGV0dWdhcyBQb3MgUGVuZ2FqYXJhbiIsImlhdCI6MTc5MzEzNTA0OSwiZXhwIjoxNzkzMTQyMjQ5LCJpc3MiOiJ1YmwtbG9zdG5mb3VuZC1hdXRoIn0.signature...",
    "user": {
      "user_id": "157c0aa0-a39a-49bd-a559-7777b20de64c",
      "full_name": "Petugas Pos Pengajaran",
      "email": "lostandfound.budiluhur@gmail.com",
      "student_number": null,
      "role": "OFFICER",
      "assigned_post_id": 1,
      "nim_verification_status": "NOT_VERIFIED"
    }
  }
}
```

**Contoh Response Gagal (400 Bad Request - Validasi Input):**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Format email tidak valid",
    "request_id": "2e8337ed-cc08-45b6-a911-ec484a70781e"
  }
}
```

**Contoh Response Gagal (401 Unauthorized - Kredensial Salah):**

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email atau kata sandi yang Anda masukkan salah",
    "request_id": "a02d986c-6dda-41cd-843c-f7a088056966"
  }
}
```

---

### 2.2 Profil Pengguna Aktif (Current User Profile)

- **Endpoint:** `GET /api/v1/me`
- **Authentikasi:** Membutuhkan Token
- **Otorisasi Role:** `STUDENT`, `OFFICER`, `ADMIN`

**Contoh Request:**

- **Headers:** `Authorization: Bearer <access_token>`

**Contoh Response Sukses (200 OK):**

```json
{
  "data": {
    "user_id": "157c0aa0-a39a-49bd-a559-7777b20de64c",
    "full_name": "Petugas Pos Pengajaran",
    "email": "lostandfound.budiluhur@gmail.com",
    "student_number": null,
    "role": "OFFICER",
    "assigned_post_id": 1,
    "nim_verification_status": "NOT_VERIFIED"
  }
}
```

**Contoh Response Gagal (401 Unauthorized - Token Kadaluwarsa / Rusak):**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token autentikasi tidak valid atau sudah kedaluwarsa",
    "request_id": "aec084c7-3438-4708-9549-d66c1656af3a"
  }
}
```

**Contoh Response Gagal (404 Not Found - User Tidak Terdaftar):**

```json
{
  "error": {
    "code": "PROFILE_NOT_FOUND",
    "message": "Profil pengguna belum terdaftar dalam sistem",
    "request_id": "c432be36-afc2-4cf8-806b-b48bf028ce83"
  }
}
```

---

## 3. Modul Pos Pelayanan Kampus (Service Posts)

Modul ini mengelola data titik operasional posko layanan penampungan dan verifikasi fisik barang temuan di lingkungan Universitas Budi Luhur.

### 3.1 Menampilkan Seluruh Pos Layanan Kampus

- **Endpoint:** `GET /api/v1/posts`
- **Authentikasi:** Tidak Butuh
- **Otorisasi Role:** `PUBLIC`

**Contoh Request:**

- **Query Params:** `?page=1&limit=10`
  - `page` *(number, opsional, default: 1)*
  - `limit` *(number, opsional, default: 10)*

**Contoh Response Sukses (200 OK):**

```json
{
  "data": [
    {
      "post_id": 1,
      "name": "Pos Pengajaran",
      "code": "POS-PENG",
      "building": "Gedung Induk",
      "floor": 1,
      "room_info": "Ruang Layanan Akademik & Pengajaran",
      "contact_phone": "021-5853753 ext 214",
      "operating_hours": "Senin - Jumat, 08:00 - 16:00 WIB",
      "photo_url": "https://pub-ec2de406cfec4d6ba5d9a2beb58f023a.r2.dev/posts/pos-pengajaran.jpg",
      "latitude": -6.234567,
      "longitude": 106.758912
    },
    {
      "post_id": 2,
      "name": "Pos Keamanan / Satpam Utama",
      "code": "POS-SATPAM",
      "building": "Gerbang Utama",
      "floor": 1,
      "room_info": "Pos Jaga Gerbang Barat",
      "contact_phone": "021-5853753 ext 110",
      "operating_hours": "24 Jam (Setiap Hari)",
      "photo_url": "https://pub-ec2de406cfec4d6ba5d9a2beb58f023a.r2.dev/posts/pos-satpam.jpg",
      "latitude": -6.23489,
      "longitude": 106.758123
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "total_pages": 1
  }
}
```

---

### 3.2 Menampilkan Detail Pos Berdasarkan ID

- **Endpoint:** `GET /api/v1/posts/:post_id`
- **Authentikasi:** Tidak Butuh
- **Otorisasi Role:** `PUBLIC`

**Contoh Request:**

- **URL Path Params:** `post_id` *(integer, contoh: `1`)*

**Contoh Response Sukses (200 OK):**

```json
{
  "data": {
    "post_id": 1,
    "name": "Pos Pengajaran",
    "code": "POS-PENG",
    "building": "Gedung Induk",
    "floor": 1,
    "room_info": "Ruang Layanan Akademik & Pengajaran",
    "contact_phone": "021-5853753 ext 214",
    "operating_hours": "Senin - Jumat, 08:00 - 16:00 WIB",
    "photo_url": "https://pub-ec2de406cfec4d6ba5d9a2beb58f023a.r2.dev/posts/pos-pengajaran.jpg",
    "latitude": -6.234567,
    "longitude": 106.758912
  }
}
```

**Contoh Response Gagal (404 Not Found):**

```json
{
  "error": {
    "code": "POST_NOT_FOUND",
    "message": "Pos pelayanan dengan ID 999 tidak ditemukan",
    "request_id": "7d92ab01-3847-4f25-a8e1-16731fe2cc3a"
  }
}
```

---

## 4. Modul Katalog Barang Temuan Publik (Public Items)

Modul ini melayani katalog barang temuan publik bagi mahasiswa dan tamu kampus. Hanya barang yang berstatus `STORED` dan `is_visible = true` yang ditampilkan. Seluruh ciri internal (*private notes*) disensor secara otomatis.

### 4.1 Menampilkan Katalog Barang Publik & Pencarian

- **Endpoint:** `GET /api/v1/items`
- **Authentikasi:** Tidak Butuh
- **Otorisasi Role:** `PUBLIC`

**Parameter Query:**
- `page` *(number, opsional, default: 1)* - Halaman pagination
- `limit` *(number, opsional, default: 10, max: 10)* - Jumlah item per halaman (sesuai spesifikasi UI)
- `category` *(string, opsional)* - Filter kategori (misal: `Elektronik`, `Kunci`, `Dompet`, `Aksesori`, `Tas`, `Pakaian`, `Dokumen`, `Lainnya`)
- `query` atau `q` *(string, opsional)* - Pencarian kata kunci nama atau deskripsi publik (kebal SQL Injection)
- `post_id` *(number, opsional)* - Filter pos penyimpanan
- `sort` *(enum, opsional, default: `received_at_desc`)* - Urutan: `received_at_desc`, `received_at_asc`, `item_name_asc`

**Contoh Request:**
`GET /api/v1/items?page=1&limit=8&category=Kunci`

**Contoh Response Sukses (200 OK):**

```json
{
  "data": [
    {
      "item_id": "b38f86eb-3fcd-4280-9b64-c46e93b1cc7c",
      "inventory_code": "INV-2026-0001",
      "item_name": "Kunci Motor Honda Vario",
      "category": "Kunci",
      "public_description": "Gantungan kunci tali hitam logo Honda, dengan 1 kunci motor dan 1 remote alarm.",
      "found_location": "Parkiran Barat Gedung Unit 7",
      "found_on": "2026-10-24",
      "received_at": "2026-10-24T10:00:00.000Z",
      "post": {
        "post_id": 1,
        "name": "Pos Pengajaran"
      },
      "photos": [
        {
          "photo_id": "7970c519-e37c-4622-b832-c1861858c9f5",
          "url": "http://localhost:3000/storage/items/kunci-motor.png?exp=1793136454",
          "expires_at": "2026-10-27T21:27:34.514Z",
          "is_primary": true
        }
      ]
    }
  ],
  "meta": {
    "page": 1,
    "limit": 8,
    "total": 1,
    "total_pages": 1
  }
}
```

**Contoh Response Gagal (400 Bad Request):**

```json
{
  "error": {
    "code": "INVALID_QUERY_PARAMS",
    "message": "Limit maksimal 10",
    "request_id": "700ba6b0-5936-466e-bba4-906b3b9eead7"
  }
}
```

---

### 4.2 Menampilkan Detail Barang Publik Berdasarkan ID

- **Endpoint:** `GET /api/v1/items/:item_id`
- **Authentikasi:** Tidak Butuh
- **Otorisasi Role:** `PUBLIC`

**Contoh Request:**

- **URL Path Params:** `item_id` *(string, UUID valid)*

**Contoh Response Sukses (200 OK):**

```json
{
  "data": {
    "item_id": "b38f86eb-3fcd-4280-9b64-c46e93b1cc7c",
    "inventory_code": "INV-2026-0001",
    "item_name": "Kunci Motor Honda Vario",
    "category": "Kunci",
    "public_description": "Gantungan kunci tali hitam logo Honda, dengan 1 kunci motor dan 1 remote alarm.",
    "found_location": "Parkiran Barat Gedung Unit 7",
    "found_on": "2026-10-24",
    "received_at": "2026-10-24T10:00:00.000Z",
    "post": {
      "post_id": 1,
      "name": "Pos Pengajaran"
    },
    "photos": [
      {
        "photo_id": "7970c519-e37c-4622-b832-c1861858c9f5",
        "url": "http://localhost:3000/storage/items/kunci-motor.png?exp=1793136454",
        "expires_at": "2026-10-27T21:27:34.514Z",
        "is_primary": true
      }
    ]
  }
}
```

**Contoh Response Gagal (404 Not Found - Barang Tidak Ada / Belum STORED):**

```json
{
  "error": {
    "code": "ITEM_NOT_FOUND",
    "message": "Barang temuan tidak ditemukan atau tidak tersedia untuk publik",
    "request_id": "155d889c-93eb-46e3-beee-aba17b8742d0"
  }
}
```

---

## 5. Modul Penyimpanan & Unggah Foto (Uploads & Cloudflare R2)

Sistem menggunakan arsitektur **Signed Upload Intent** yang terhubung ke Cloudflare R2 Object Storage:
1. Klien membuat permohonan *upload intent* (`POST /uploads/intents`).
2. Klien mengunggah *binary* file ke storage:
   - **Jalur Utama:** Direct `PUT` langsung ke Cloudflare R2 via `direct_upload_url`.
   - **Jalur Relay (CORS Fallback):** `PUT /uploads/:upload_id/content` jika browser terhalang pembatasan CORS bucket R2.
3. Klien memfinalisasi intent (`POST /uploads/:upload_id/finalize`) untuk menerima `upload_token` bertanda tangan kriptografis yang diverifikasi saat pencatatan barang.

### 5.1 Permintaan Intent Unggah Foto (Upload Intent)

- **Endpoint:** `POST /api/v1/uploads/intents`
- **Authentikasi:** Membutuhkan Token
- **Otorisasi Role:** `OFFICER`, `STUDENT`, `ADMIN`

**Contoh Request:**

- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
- **Request Body JSON:**

```json
{
  "purpose": "ITEM_PHOTO",
  "content_type": "image/jpeg",
  "size_bytes": 1048576
}
```

**Contoh Response Sukses (201 Created):**

```json
{
  "data": {
    "upload_id": "344664ff-aafc-46f6-a706-83697366ae85",
    "direct_upload_url": "https://pub-ec2de406cfec4d6ba5d9a2beb58f023a.r2.dev/items/344664ff-aafc-46f6-a706-83697366ae85.jpg?X-Amz-Signature=...",
    "required_headers": {
      "content-type": "image/jpeg"
    },
    "expires_at": "2026-10-28T07:15:00.000Z"
  }
}
```

**Contoh Response Gagal (422 Unprocessable Entity):**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Format request intent upload tidak valid",
    "request_id": "aec084c7-3438-4708-9549-d66c1656af3a"
  }
}
```

---

### 5.2 Unggah Konten Foto via Server Relay (CORS Bypass Fallback)

- **Endpoint:** `PUT /api/v1/uploads/:upload_id/content`
- **Authentikasi:** Membutuhkan Token
- **Otorisasi Role:** `OFFICER`, `STUDENT`, `ADMIN`

**Contoh Request:**

- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: image/jpeg` (atau `image/png`, `image/webp`)
- **Body:** Binary Buffer Gambar

**Contoh Response Sukses (200 OK):**

```json
{
  "data": {
    "success": true
  }
}
```

---

### 5.3 Finalisasi Unggah Foto (Finalize Upload)

- **Endpoint:** `POST /api/v1/uploads/:upload_id/finalize`
- **Authentikasi:** Membutuhkan Token
- **Otorisasi Role:** `OFFICER`, `STUDENT`, `ADMIN`

**Contoh Request:**

- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
- **URL Path Params:** `upload_id` *(string, UUID)*
- **Request Body JSON:** `{}`

**Contoh Response Sukses (200 OK):**

```json
{
  "data": {
    "upload_token": "eyJ0b2tlbklkIjoiYjRiZWUwYjYtN2M5Ny00MDNhLTk4MjYtZTY5Mjk0NzIwOTllIiwidXNlcklkIjoiMTU3YzBhYTAtYTM5YS00OWJkLWE1NTktNzc3N2IyMGRlNjRjIiwicHVycG9zZSI6IklURU1fUEhPVE8iLCJzdG9yYWdlUGF0aCI6Iml0ZW1zLzM0NDY2NGZmLWFhZmMtNDZmNi1hNzA2LTgzNjk3MzY2YWU4NS5qcGciLCJleHAiOjE3OTMxMzYxMDd9.WiHUDc8Ackb1qdXQfgsm-BXn7F-bSUZS0z5vdDwci7I",
    "storage_path": "items/344664ff-aafc-46f6-a706-83697366ae85.jpg"
  }
}
```

---

### 5.4 Streaming Aset Foto Cloudflare R2 / Fallback Lokal

- **Endpoint:** `GET /storage/*`
- **Authentikasi:** Tidak Butuh
- **Otorisasi Role:** `PUBLIC`

**Contoh Request:**
`GET http://localhost:3000/storage/items/kunci-motor.png`

**Contoh Response:**
- Stream file biner gambar (`Content-Type: image/png`, `image/jpeg`, atau `image/webp`).

---

## 6. Modul Operasional Petugas Posko (Officer Operations)

Modul ini dikhususkan bagi Petugas Posko Operasional terautentikasi untuk mencatat barang temuan fisik yang diterima langsung di posko kampus.

> **Catatan Otorisasi:** Endpoint ini dilindungi oleh guard `requireOfficer`. Sistem secara otomatis mengaitkan barang ke `storage_post_id` pos petugas yang login dan memvalidasi kepemilikan upload token foto (pertahanan anti-IDOR).

### 6.1 Pencatatan Barang Temuan Fisik (Direct Item Registration)

- **Endpoint:** `POST /api/v1/officer/items`
- **Authentikasi:** Membutuhkan Token
- **Otorisasi Role:** `OFFICER`

**Contoh Request:**

- **Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
- **Request Body JSON:**

```json
{
  "item_name": "Helm KYT Merah Glossy",
  "category": "Aksesori",
  "found_location": "Parkiran Barat Gedung Unit 7",
  "found_on": "2026-10-27",
  "public_description": "Helm half-face warna merah glossy dengan visor pelangi bening",
  "private_verification_notes": "Ada stiker nama kecil di bagian busa belakang helm",
  "item_photo_upload_tokens": [
    "eyJ0b2tlbklkIjoiYjRiZWUwYjYtN2M5Ny00MDNhLTk4MjYtZTY5Mjk0NzIwOTll..."
  ]
}
```

**Contoh Response Sukses (201 Created):**

```json
{
  "data": {
    "item_id": "4e7a61af-5404-4981-99f2-b07fdc0f51f4",
    "inventory_code": "INV-2026-0018",
    "item_name": "Helm KYT Merah Glossy",
    "category": "Aksesori",
    "public_description": "Helm half-face warna merah glossy dengan visor pelangi bening",
    "found_location": "Parkiran Barat Gedung Unit 7",
    "found_on": "2026-10-27",
    "received_at": "2026-10-28T05:30:00.000Z",
    "storage_post_id": 1,
    "status": "STORED",
    "is_visible": true,
    "photos": [
      {
        "photo_id": "32037722-1bd7-47ee-af29-f94daa14c4cc",
        "url": "http://localhost:3000/storage/items/344664ff-aafc-46f6-a706-83697366ae85.jpg?exp=1793139600"
      }
    ]
  }
}
```

**Contoh Response Gagal (401 Unauthorized - Sesi Habis):**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token autentikasi tidak valid atau sudah kedaluwarsa",
    "request_id": "aec084c7-3438-4708-9549-d66c1656af3a"
  }
}
```

**Contoh Response Gagal (403 Forbidden - IDOR Token Foto / Bukan Petugas):**

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Token foto yang disertakan tidak diterbitkan untuk sesi petugas Anda",
    "request_id": "1ce683ec-aec2-4704-9da2-12373180cf15"
  }
}
```

**Contoh Response Gagal (422 Unprocessable Entity - Foto Tidak Disertakan):**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Format payload registrasi barang tidak valid",
    "request_id": "66cc930b-80b1-4358-8711-fbd9ec6dc7c8",
    "details": [
      {
        "code": "too_small",
        "minimum": 1,
        "type": "array",
        "message": "Pencatatan barang mewajibkan tepat 1 token foto",
        "path": ["item_photo_upload_tokens"]
      }
    ]
  }
}
```

---

## 7. Matriks Otorisasi Endpoint (Cheat Sheet)

Tabel ringkasan seluruh *endpoint*, metode HTTP, persyaratan autentikasi, dan peran (*role*) yang diizinkan dalam arsitektur UBL Lost and Found:

| Endpoint | Method | Autentikasi | Role Diizinkan | Deskripsi Singkat |
| :--- | :--- | :--- | :--- | :--- |
| `/health` | `GET` | Tidak Butuh | `PUBLIC` | Health check & status server Fastify |
| `/storage/*` | `GET` | Tidak Butuh | `PUBLIC` | Stream foto barang dari Cloudflare R2 / lokal |
| `/api/v1/auth/officer-login` | `POST` | Tidak Butuh | `PUBLIC` | Login akun petugas posko (Bcrypt verified) |
| `/api/v1/officer/login` | `POST` | Tidak Butuh | `PUBLIC` | Alias login petugas posko |
| `/api/v1/me` | `GET` | Membutuhkan Token | `OFFICER`, `STUDENT`, `ADMIN` | Ambil profil pengguna & status penugasan pos |
| `/api/v1/posts` | `GET` | Tidak Butuh | `PUBLIC` | Daftar seluruh posko layanan kampus |
| `/api/v1/posts/:post_id` | `GET` | Tidak Butuh | `PUBLIC` | Detail satu posko pelayanan kampus |
| `/api/v1/items` | `GET` | Tidak Butuh | `PUBLIC` | Katalog publik barang temuan & filter |
| `/api/v1/items/:item_id` | `GET` | Tidak Butuh | `PUBLIC` | Detail publik barang temuan (sensor ciri rahasia) |
| `/api/v1/uploads/intents` | `POST` | Membutuhkan Token | `OFFICER`, `STUDENT`, `ADMIN` | Buat signed upload intent ke Cloudflare R2 |
| `/api/v1/uploads/:upload_id/content` | `PUT` | Membutuhkan Token | `OFFICER`, `STUDENT`, `ADMIN` | Relay upload konten foto (CORS bypass fallback) |
| `/api/v1/uploads/:upload_id/finalize` | `POST` | Membutuhkan Token | `OFFICER`, `STUDENT`, `ADMIN` | Finalisasi upload & terbitkan signed photo token |
| `/api/v1/officer/items` | `POST` | Membutuhkan Token | `OFFICER` | Pencatatan fisik barang temuan oleh petugas posko |
