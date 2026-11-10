# Dokumentasi Progres & Panduan Integrasi Backend–Frontend
**Proyek:** Lezzat Frozen Food (`frozenfood-api` & `lezzat-frontend`)  
**Tanggal Pembaruan:** 10 November 2026  
**Tujuan Dokumen:** Pegangan teknis untuk tim pengembang (Backend & Frontend) mengenai seluruh perbaikan integrasi yang telah selesai serta kontrak API terbaru untuk pengembangan UI/Layout selanjutnya.

---

## Daftar Isi
1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Bagian I — Rekap Progres Sebelumnya (7 Temuan Audit & 4 Tahap Integrasi)](#2-bagian-i--rekap-progres-sebelumnya-7-temuan-audit--4-tahap-integrasi)
3. [Bagian II — Progres Terbaru Hari Ini (Penyempurnaan Backend & Frontend)](#3-bagian-ii--progres-terbaru-hari-ini-penyempurnaan-backend--frontend)
4. [Bagian III — Spesifikasi Kontrak API Baru (Backend → Frontend)](#4-bagian-iii--spesifikasi-kontrak-api-baru-backend--frontend)
5. [Bagian IV — Panduan Tugas & Peningkatan Layout untuk Tim Frontend](#5-bagian-iv--panduan-tugas--peningkatan-layout-untuk-tim-frontend)

---

## 1. Ringkasan Eksekutif

Pekerjaan dibagi menjadi dua gelombang besar:
1. **Gelombang 1 (Progres Kemarin — Selesai di Backend & Frontend):** Menyelesaikan 7 masalah kritis antara `frozenfood-api` dan `lezzat-frontend` melalui 4 tahap (sinkronisasi stok & satuan berat/volume, perbaikan halaman riwayat/detail pesanan & arah checkout B2B/B2C, manajemen batch FEFO di Admin, serta modul profil pelanggan & kelola pelanggan Admin).
2. **Gelombang 2 (Progres Hari Ini — Selesai di Backend, Siap Dipasang di Frontend):** Mengaktifkan fitur-fitur inti backend yang sebelumnya belum terhubung ke API/Frontend melalui 9 tahap (Cronjob Expiry Alert H-30 & Clearance otomatis H-7, endpoint notifikasi Expiry Alert Admin, ekspos harga Clearance & Tiering B2B di Katalog, endpoint override harga batch Admin, CRUD Tiering Price Admin, daftar & update status Order Admin, daftar Delivery Admin, sinkronisasi otomatis `Order` ↔ `Delivery` ↔ `Payment`, serta upload file gambar produk).

---

## 2. Bagian I — Rekap Progres Sebelumnya (7 Temuan Audit & 4 Tahap Integrasi)

### A. 7 Masalah Integrasi yang Ditemukan & Diselesaikan
1. **Mismatch Field Stok (`totalStock` vs `totalStokOnline`):**
   - *Masalah:* Backend mengirim `totalStock`, sedangkan Frontend membaca `totalStokOnline` sehingga stok jatuh ke angka *fallback* palsu `99`.
   - *Solusi:* Menambahkan alias `getTotalStokOnline()` di `ProductCatalogResponse.java` dan menyesuaikan pembacaan stok di `utils.ts`, `product-card.tsx`, `cart-panel.tsx`, serta `products/[id]/page.tsx`.
2. **Halaman `/orders` Terduplikasi dengan Beranda:**
   - *Masalah:* `src/app/orders/page.tsx` berisi duplikat komponen katalog beranda dan belum memanggil `GET /api/orders/my`.
   - *Solusi:* Membangun ulang halaman `/orders` agar menampilkan daftar riwayat pesanan dari `GET /api/orders/my` + fitur lacak ID pesanan.
3. **Halaman Detail Pesanan `/orders/[id]` Hanya Membaca `sessionStorage`:**
   - *Masalah:* Saat dibuka dari tabel Admin atau di-*refresh*, rincian barang menjadi kosong (`Rp 0`).
   - *Solusi:* Menghubungkan `src/app/orders/[id]/page.tsx` langsung ke `GET /api/orders/{idOrder}` agar rincian item dan kode batch FEFO (`idProdBatch`) selalu tampil.
4. **Mismatch Satuan Berat/Volume (`gram/ml` vs `kg/liter`) pada Smart Delivery:**
   - *Masalah:* Input produk 500 gram dihitung sebagai 500 kg oleh `MuatanCalculator` (melebihi kapasitas motor 15 kg), sehingga semua pengiriman dipaksa ke `PIHAK_KETIGA`.
   - *Solusi:* Mengubah konfigurasi `application.yml` (`weight-to-kg: 0.001` dan `volume-to-liter: 0.001`) agar 500 g = 0,5 kg dan 500 ml = 0,5 L.
5. **Manajemen Stok Batch FEFO Belum Ada di UI Admin:**
   - *Masalah:* Produk baru di Admin selalu berstok 0 karena belum ada form input batch di Frontend.
   - *Solusi:* Menambahkan form tambah batch (`POST /api/inventory/batches`) dan tabel daftar batch FEFO (`GET /api/inventory/batches`) di `/admin/products`.
6. **Checkout Akun B2B Masih Memanggil Endpoint Retail (B2C):**
   - *Masalah:* Semua checkout memanggil `POST /api/orders/retail` sehingga akun B2B tidak mendapat harga *Tiering* maupun diskon *Clearance*.
   - *Solusi:* Mengarahkan checkout di `src/app/checkout/page.tsx` ke `POST /api/orders/checkout` khusus untuk `user.tipeAkun === 'B2B'`, dan `POST /api/orders/retail` untuk `B2C`.
7. **Modul Profil Pelanggan & Manajemen Pelanggan Admin Belum Terpasang:**
   - *Solusi:* Membuka akses statis `/uploads/**` di `SecurityConfig.java`, membuat halaman `/profile` (`GET/PUT /api/customers/me`, `PUT /api/customers/me/photo`, `DELETE /api/customers/me`), serta halaman `/admin/customers` (`GET /api/customers`, `DELETE /api/customers/{id}`).

---

## 3. Bagian II — Progres Terbaru Hari Ini (Penyempurnaan Backend & Frontend)

Berikut adalah peningkatan di `frozenfood-api` dan `lezzat-frontend` yang telah selesai dikerjakan hari ini:

| Tahap | Fitur | File yang Diubah | Penjelasan Singkat |
| :--- | :--- | :--- | :--- |
| **1** | **Aktivasi Cronjob & Auto-Clearance H-7** | `FrozenFoodApplication.java`, `ExpiryAlertScheduler.java` | Mengaktifkan `@EnableScheduling`. Cronjob otomatis memindai batch kedaluwarsa $\le 30$ hari (buat alert `DARURAT`) dan batch $\le 7$ hari (otomatis set `diskon = 50.00` jika belum ada `hargaOverride`, lalu buat alert `CLEARANCE 50%`). |
| **2** | **Endpoint `ExpiryAlert` untuk Admin** | `InventoryController.java`, `ExpiryAlertRepository.java` | Menambahkan endpoint `GET /api/inventory/alerts` (dengan query `JOIN FETCH` anti N+1) dan `PATCH /api/inventory/alerts/{idAlert}/resolve` agar Admin bisa melihat dan menyelesaikan notifikasi kedaluwarsa. |
| **3** | **Ekspos Info Clearance & Tiering di Katalog** | `ProductCatalogResponse.java`, `ProductService.java` | Menambahkan field `isClearance`, `stokClearance`, `hargaClearance`, `nearestExpDate`, dan `tieringPrices` langsung pada setiap item di `GET /api/products` dan `GET /api/products/{id}`. |
| **4** | **Edit, Override Harga & Hapus Batch FEFO Admin (Backend + Frontend)** | `ProductBatchController.java`, `ProductBatchService.java`, `src/app/admin/products/page.tsx`, `src/types/api.ts` | Menambahkan `PUT /api/inventory/batches/{idProdBatch}` (edit `stokAwal`, `stokOnline`, `tanggalExp`, `hargaOverride`, `diskon`), `PATCH /api/inventory/batches/{idProdBatch}/pricing`, dan `DELETE /api/inventory/batches/{idProdBatch}` (*soft-delete* batch & nolkan `stokOnline`), lengkap dengan tombol **Edit** dan **Hapus** di tabel Batch FEFO Admin. |
| **5** | **CRUD `TieringPrice` (Harga Grosir B2B)** | `ProductController.java`, `ProductService.java`, `TieringPriceRepository.java` | Menambahkan `POST /api/products/{id}/tiering` dan `DELETE /api/products/tiering/{idTiering}` untuk mengatur rentang harga grosir per kuantitas. |
| **6** | **Manajemen Semua Pesanan untuk Admin** | `OrderController.java`, `OrderService.java`, `OrderRepository.java` | Menambahkan `GET /api/orders` (filter opsional `tipeOrder` & `status`) dan `PATCH /api/orders/{idOrder}/status` untuk mengubah status pesanan. |
| **7** | **Daftar & Filter Pengiriman Admin (Backend + Frontend)** | `DeliveryController.java`, `DeliveryService.java`, `src/app/admin/deliveries/page.tsx` | `GET /api/deliveries` kini mendukung query param `?status=...` maupun `?statusDelivery=...` dan diurutkan dari yang terbaru (`createdAt` desc). Halaman `/admin/deliveries` diperbaiki agar membaca respons `Array` maupun objek paginasi dengan filter status dan paginasi otomatis. |
| **8** | **Sinkronisasi Otomatis `Order` ↔ `Delivery` & `Payment`** | `OrderService.java`, `DeliveryService.java`, `PaymentService.java` | 1) Ongkir awal B2B diset `0` (menunggu hasil kalkulasi `Delivery`).<br>2) Saat `createDelivery` atau `konfirmasiAdmin` dipanggil, `Order.ongkir` & `Order.totalTagihan` otomatis diperbarui.<br>3) Saat webhook `/api/payments/callback` berstatus `LUNAS`, `Order.status` berubah menjadi `DIBAYAR`.<br>4) Saat status `Delivery` diubah ke `DISIAPKAN`/`DALAM_PERJALANAN` → `Order.status` menjadi `DIPROSES`, dan saat `TERKIRIM` → `Order.status` menjadi `SELESAI`. |
| **9** | **Upload File Gambar Produk** | `ProductController.java`, `ProductService.java` | Menambahkan `PUT /api/products/{id}/image` (`multipart/form-data`) yang menyimpan file fisik ke `/uploads/products/` dan memperbarui URL `gambar` produk. |
| **10** | **Kompatibilitas Production Build Next.js 16 (`cacheComponents`)** | `src/app/admin/products/page.tsx` | Menghindari pemanggilan `new Date()` secara sinkron saat *initial render* di halaman Admin Produk agar `npm run build` berhasil tanpa error prerendering. |

---

## 4. Bagian III — Spesifikasi Kontrak API Baru (Backend → Frontend)

### 1. Katalog Produk (Sudah Diperkaya dengan Clearance & Tiering)
* **Endpoint:** `GET /api/products` | `GET /api/products/{id}` | `GET /api/products/search?keyword=...`
* **Contoh Response JSON Baru:**
```json
{
  "idProduk": "NGT-001",
  "namaProduk": "Nugget Ayam Premium",
  "deskripsiProduk": "Nugget ayam renyah",
  "kategori": "Nugget",
  "hargaEceran": 40000.00,
  "berat": 500.00,
  "volume": 500.00,
  "gambar": "/uploads/products/NGT-001_1794218010.jpg",
  "isActive": true,
  "totalStock": 35,
  "totalStokOnline": 35,
  "isClearance": true,
  "stokClearance": 10,
  "hargaClearance": 20000.00,
  "nearestExpDate": "2026-11-15",
  "tieringPrices": [
    {
      "idTiering": "8f14e45f-ceea-467a-9a38-123456789abc",
      "minQty": 10,
      "maxQty": 49,
      "hargaPerUnit": 36000.00
    },
    {
      "idTiering": "9a25f56e-ceea-467a-9a38-987654321def",
      "minQty": 50,
      "maxQty": 500,
      "hargaPerUnit": 33000.00
    }
  ]
}
```

---

### 2. Notifikasi Kedaluwarsa (`ExpiryAlert`) — Khusus Admin
* **Ambil Daftar Alert:** `GET /api/inventory/alerts?unresolvedOnly=true`
  * Query param `unresolvedOnly` (opsional, default `false`). Isi `true` untuk menampilkan alert yang belum ditangani saja.
  * **Contoh Response JSON:**
  ```json
  [
    {
      "idAlert": "c3b2a100-1111-2222-3333-444455556666",
      "idProdBatch": "B-NGT001-261115",
      "idProduk": "NGT-001",
      "namaProduk": "Nugget Ayam Premium",
      "tanggalExp": "2026-11-15",
      "stokOnline": 10,
      "pesan": "CLEARANCE 50%: Produk Nugget Ayam Premium (Batch: B-NGT001-261115) kedaluwarsa pada 2026-11-15",
      "isResolved": false,
      "createdAt": "2026-11-10T15:59:53"
    }
  ]
  ```
* **Tandai Alert Selesai:** `PATCH /api/inventory/alerts/{idAlert}/resolve`
  * **Response JSON:** `{"idAlert": "...", "isResolved": true}`

---

### 3. Edit, Override Harga & Hapus Batch Gudang — Khusus Admin
* **Edit Data Batch Lengkap:** `PUT /api/inventory/batches/{idProdBatch}`
  * **Request Body JSON:**
  ```json
  {
    "stokAwal": 50,
    "stokOnline": 45,
    "tanggalExp": "2027-05-15",
    "hargaOverride": 18000.00,
    "diskon": 50.00
  }
  ```
  * **Response:** Mengembalikan `ProductBatchResponse` terbaru.
* **Override Harga & Diskon Cepat:** `PATCH /api/inventory/batches/{idProdBatch}/pricing`
  * **Request Body JSON:**
  ```json
  {
    "hargaOverride": 18000.00,
    "diskon": 50.00
  }
  ```
  *(Catatan: Kirim `null` pada `hargaOverride` jika ingin mengembalikan ke kalkulasi otomatis).*
* **Hapus Batch (*Soft-Delete*):** `DELETE /api/inventory/batches/{idProdBatch}`
  * Mengubah `stokOnline` menjadi `0` dan menandai `deleted_at = CURRENT_TIMESTAMP` agar riwayat pesanan lama tetap aman namun batch tidak lagi dihitung sebagai stok aktif FEFO.
  * **Response:** `204 No Content`

---

### 4. Kelola Harga Grosir Bertingkat (`TieringPrice`) — Khusus Admin
* **Tambah Aturan Tiering:** `POST /api/products/{idProduk}/tiering`
  * **Request Body JSON:**
  ```json
  {
    "minQty": 10,
    "maxQty": 49,
    "hargaPerUnit": 36000.00
  }
  ```
  * **Response:** Mengembalikan objek `ProductCatalogResponse` terbaru lengkap dengan `tieringPrices`.
* **Hapus Aturan Tiering:** `DELETE /api/products/tiering/{idTiering}`
  * **Response:** `204 No Content`

---

### 5. Upload Gambar Produk — Khusus Admin
* **Endpoint:** `PUT /api/products/{idProduk}/image`
* **Content-Type:** `multipart/form-data`
* **Form Field:** `file` (File gambar JPG/PNG/WEBP)
* **Response:** Mengembalikan `ProductCatalogResponse` dengan field `gambar` berisi path `/uploads/products/<nama_file>`.

---

### 6. Manajemen Semua Pesanan (`Order`) — Khusus Admin
* **Daftar Semua Pesanan:** `GET /api/orders?tipeOrder=B2B&status=DIBAYAR`
  * Query param `tipeOrder` (`B2B` / `B2C`) dan `status` bersifat opsional.
* **Ubah Status Pesanan:** `PATCH /api/orders/{idOrder}/status?status=DIPROSES`

---

### 7. Daftar Semua Pengiriman (`Delivery`) — Khusus Admin
* **Daftar Semua Pengiriman:** `GET /api/deliveries?statusDelivery=MENUNGGU_KONFIRMASI_ADMIN`
  * Query param `statusDelivery` bersifat opsional (contoh nilai: `MENUNGGU_KONFIRMASI_ADMIN`, `MENUNGGU_PICKUP`, `DALAM_PERJALANAN`, `TERKIRIM`, `DIBATALKAN`).

---

## 5. Bagian IV — Panduan Tugas & Peningkatan Layout untuk Tim Frontend

Berikut adalah daftar komponen/halaman di `lezzat-frontend` yang bisa langsung ditingkatkan oleh tim Frontend menggunakan API baru di atas:

1. **Kartu Produk (`product-card.tsx`) & Halaman Detail Produk (`products/[id]/page.tsx`):**
   - Tampilkan **Badge "CLEARANCE SALE -50%"** berwarna mencolok jika `product.isClearance === true` (khususnya saat dilihat oleh akun B2B), lengkap dengan informasi `stokClearance`, `hargaClearance`, dan tanggal kedaluwarsa terdekat (`nearestExpDate`).
   - Pada halaman detail produk, tampilkan **Tabel Harga Grosir (Tiering B2B)** dari array `product.tieringPrices` (`minQty` – `maxQty` → `hargaPerUnit`).
2. **Halaman Admin Produk (`/admin/products`):**
   - **Upload Gambar Produk:** Ganti/tambahkan input file gambar pada form produk yang memanggil `PUT /api/products/{id}/image`.
   - **Kelola Tiering B2B:** Tambahkan bagian/modal di tiap produk untuk menambah (`POST /api/products/{id}/tiering`) dan menghapus (`DELETE /api/products/tiering/{idTiering}`) aturan harga grosir.
   - **Tombol Edit Harga/Diskon Batch:** Pada tabel daftar batch FEFO yang sudah ada, tambahkan tombol edit cepat untuk memanggil `PATCH /api/inventory/batches/{idProdBatch}/pricing` (mengubah `hargaOverride` atau `diskon`).
3. **Panel Notifikasi Expiry Alert di Dashboard Admin (`/admin` atau `/admin/products`):**
   - Buat komponen lonceng/banner peringatan yang memanggil `GET /api/inventory/alerts?unresolvedOnly=true`.
   - Sediakan tombol **"Tandai Selesai"** (`PATCH /api/inventory/alerts/{idAlert}/resolve`) dan tombol pintas untuk langsung meng-*override* harga batch terkait.
4. **Halaman Admin Pesanan & Pengiriman (`/admin/deliveries` & `/admin/orders`):**
   - Gunakan `GET /api/deliveries` (tanpa harus input UUID manual) agar Admin langsung melihat tabel seluruh pengiriman, terutama filter tab **`MENUNGGU_KONFIRMASI_ADMIN`** untuk pengiriman pihak ketiga yang butuh input ongkir & nama pengantar.
   - Gunakan `GET /api/orders` dan `PATCH /api/orders/{idOrder}/status` untuk memantau seluruh pesanan B2B/B2C yang masuk.
5. **Urutan Alur Checkout → Delivery → Payment di Frontend (`/checkout`):**
   - Pastikan urutan panggilan API saat checkout adalah:
     1. Buat Order (`POST /api/orders/retail` atau `POST /api/orders/checkout`)
     2. Buat Delivery (`POST /api/deliveries`) — *langkah ini otomatis meng-update `ongkir` dan `totalTagihan` pada Order*
     3. Inisiasi Payment (`POST /api/payments`) — *membaca `totalTagihan` terbaru yang sudah termasuk ongkir*.
   - Khusus jika hasil `POST /api/deliveries` berstatus `MENUNGGU_KONFIRMASI_ADMIN` (Pihak Ketiga), tampilkan informasi bahwa pembayaran menunggu konfirmasi ongkir dari Admin terlebih dahulu.
