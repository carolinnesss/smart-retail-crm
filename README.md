# Smart Retail CRM & POS (Toko Sembako Indonesia)

A production-ready web application designed specifically for traditional Indonesian grocery stores (*toko sembako*), built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **Zod**, and **Supabase PostgreSQL** with strict **Role-Based Access Control (RBAC)** and **Row Level Security (RLS)**.

---

## 🌟 Fitur Utama & Aturan Bisnis

### 1. POS / Kasir Ramah Sentuh
- **Dynamic Tier Pricing**: Otomatis berganti antara `wholesale_price` (untuk pelanggan tipe `WARUNG` dan `GROSIR`) dan `retail_price` (untuk pelanggan `ECERAN` dan pelanggan tamu/walk-in). Tanpa diskon manual antar-tier.
- **Kuantitas Desimal 3 Digit**: Mendukung takaran komoditas sembako (contoh: `1.500 kg`, `0.750 kg`, `2.500 liter`).
- **Discount Clamping**: Diskon per item dibatasi maksimal sebesar nilai kotor item (subtotal tidak bisa negatif).
- **Struk Thermal & WhatsApp**: Siap cetak printer thermal 58mm / 80mm (`@media print`), serta tombol "Kirim Nota via WhatsApp" dengan teks yang disanitasi dan URL-encoded.
- **Kasir Identity**: Nama kasir yang bertugas otomatis tercetak di struk fisik dan nota WhatsApp.

### 2. Split Payment (3 Pos)
- Satu transaksi dapat dibayar kombinasi dari 3 metode:
  - **Tunai** (Cash)
  - **Saldo Tabungan** (Dompet Tabungan Pelanggan)
  - **Kasbon** (Hutang Toko)
- Tampilan alokasi sisa pembayaran secara *real-time*. Tombol bayar terkunci sampai jumlah alokasi pas dengan total belanja.

### 3. Kasbon (Kredit) + Hard Limit Guard
- Tiap pelanggan memiliki `max_credit_limit` dan `current_debt`.
- **HARD BLOCK**: Transaksi kasbon yang menyebabkan `current_debt > max_credit_limit` ditolak total dengan pesan error jelas dan sisa plafon ditampilkan.
- Pembayaran cicilan kapan saja (`record_debt_payment`) yang otomatis mengurangi `current_debt` dan membuka kembali sisa plafon.

### 4. Dompet Tabungan Pelanggan
- Setoran (*deposit*) dan penarikan (*withdrawal*).
- Saldo tabungan dapat digunakan langsung sebagai alat bayar saat checkout.
- Saldo tidak boleh negatif (`CHECK (savings_balance >= 0)`) dengan pencatatan saldo sebelum dan sesudah (*audit trail*).
- **Aturan Peran**: Kasir hanya boleh melayani setoran tabungan; penarikan tunai saldo tabungan hanya boleh dilakukan oleh Pemilik (**OWNER**).

### 5. Aturan Tamu (Walk-in)
- Pelanggan tamu/tidak terdaftar **DILARANG** menggunakan metode Kasbon dan Tabungan (divalidasi di UI, Zod schema, API route handlers, dan trigger/RLS database).

### 6. Smart Dashboard (Khusus OWNER)
- 4 Kartu Metrik Finansial Utama:
  1. Omzet Hari Ini
  2. Omzet Bulan Ini
  3. Total Piutang Kasbon Berjalan
  4. Total Dana Tabungan Mengendap
- Grafik ringkasan transaksi terbaru dan pantauan operasional.

### 7. Radar Prediksi Restok (EWMA Heuristics - Khusus OWNER)
- Memantau 5 komoditas pokok sembako: **Beras**, **Minyak Goreng**, **Gula Pasir**, **Telur Ayam**, **Tepung Terigu**.
- Menghitung rata-rata siklus belanja per pelanggan per komoditas menggunakan formula **EWMA (Exponentially Weighted Moving Average)** dengan default $\alpha = 0.3$:
  $$S_t = \alpha \cdot \Delta_t + (1 - \alpha) \cdot S_{t-1}$$
- Memerlukan minimal 3 interval pembelian sebelum prediksi ditampilkan.
- Status Rasio Urgensi:
  - `NORMAL`: Rasio $< 0.8$
  - `SOON`: Rasio $0.8 \le \text{rasio} < 1.0$
  - `URGENT`: Rasio $1.0 \le \text{rasio} < 1.3$
  - `CRITICAL`: Rasio $\ge 1.3$
- Tombol "Hubungi via WhatsApp" langsung dengan nomor tujuan dinormalisasi format Indonesia (`628...`) dan pesan penawaran otomatis.

### 8. CRM Profil 360
- Daftar pelanggan dengan pencarian dan filter status aktif/nonaktif.
- Halaman detail 360° dengan 3 tab riwayat:
  1. **Riwayat Belanja** (Detail struk, item belanja, alokasi split payment)
  2. **Mutasi Tabungan** (Debit/kredit saldo, saldo sebelum/sesudah)
  3. **Histori Kasbon** (Nota kasbon dan riwayat pembayaran cicilan)
- Pemilik dapat mengatur tipe pelanggan, status aktif, dan plafon kredit.

---

## 🔐 Keamanan, Peran (RBAC), & Row-Level Security (RLS)

Aplikasi menerapkan model keamanan berlapis (*defense-in-depth*): Database RLS + Database Triggers + Next.js Server Middleware + Route Handlers + UI Conditional Rendering.

### Matriks Hak Akses (Permission Matrix)

| Fitur / Tindakan | CASHIER | OWNER | Catatan Penegakan |
| :--- | :---: | :---: | :--- |
| **Login & Ganti Password** | ✅ | ✅ | Rate limited (5 percobaaan / 15 menit), error generik |
| **Akses Layar POS & Checkout** | ✅ | ✅ | `cashier_id` selalu diambil dari sesi server (anti-spoofing) |
| **Katalog Produk (Lihat & Cari Stok)** | ✅ | ✅ | Dapat dibaca oleh semua staf yang aktif |
| **Tambah / Edit / Hapus Produk & Harga** | ❌ (403) | ✅ | Dicegah di UI, API, trigger, & RLS; dicatat di `audit_log` |
| **Daftar & Profil Dasar Pelanggan** | ✅ | ✅ | Dibutuhkan kasir saat proses transaksi POS |
| **Daftarkan Pelanggan Baru** | ✅ (Dibatasi) | ✅ | Kasir dikunci ke `max_credit_limit = 0` dan tipe `Eceran` |
| **Ubah Plafon Kredit & Tipe Pelanggan** | ❌ (403) | ✅ | Kolom sensitif dikunci trigger & dicatat di `audit_log` |
| **Terima Setoran Tabungan (Deposit)** | ✅ | ✅ | Tercatat di `savings_ledger` dengan ID kasir bertugas |
| **Penarikan Saldo Tabungan (Withdrawal)** | ❌ (403) | ✅ | Khusus OWNER; tercatat di `audit_log` dan ledger |
| **Terima Pembayaran Cicilan Kasbon** | ✅ | ✅ | Tercatat di `debt_ledger` dengan ID kasir bertugas |
| **Dashboard Finansial (Omzet & Saldo)** | ❌ (403) | ✅ | Kasir dialihkan otomatis ke `/pos` |
| **Radar Prediksi Restok** | ❌ (403) | ✅ | Fitur analitik pemilik toko |
| **Manajemen Staf (`/users`)** | ❌ (403) | ✅ | Buat akun, ubah status, proteksi OWNER terakhir |
| **Audit Log Sensitif (`/audit`)** | ❌ (403) | ✅ | Riwayat perubahan harga, plafon kredit, dan penarikan |

### Mekanisme Anti-Spoofing & Keamanan Sesi
- **Anti-Spoofing Identity**: Parameter `cashier_id` dari client request body diabaikan dan dibersihkan oleh Zod schema. Nilai `cashier_id` selalu disuntikkan langsung dari profil sesi server (`auth.uid()`).
- **Proteksi Pengguna Nonaktif**: Pengguna dengan `is_active = false` ditolak saat login, sesinya langsung di-invalidate oleh middleware, dan fungsi database menolak eksekusi RPC.
- **Proteksi OWNER Terakhir**: Akun OWNER terakhir yang aktif tidak dapat dinonaktifkan atau diturunkan perannya (*demote*) baik melalui API maupun database trigger.
- **Append-Only Ledgers & Audit Log**: Tabel `savings_ledger`, `debt_ledger`, dan `audit_log` bersifat *append-only* (tidak mengizinkan `UPDATE` atau `DELETE` bagi siapa pun melalui API).
- **Auto Idle Logout**: Sesi otomatis berakhir setelah 30 menit tidak aktif demi keamanan terminal kasir fisik.

---

## 🏗️ Arsitektur Dual-Mode Data Layer

Aplikasi menggunakan **Repository Pattern** (`IDataRepository` dan `IAuthService`):

1. **Zero-Config Mock Mode (Default)**:
   - Aktif otomatis jika `NEXT_PUBLIC_SUPABASE_URL` tidak diisi.
   - Menggunakan in-memory repository yang telah diisi data 30 sembako Indonesia, 10 pelanggan, riwayat transaksi, serta akun demo:
     - **Pemilik (OWNER)**: `owner@demo.local` / `owner123`
     - **Kasir (CASHIER)**: `kasir@demo.local` / `kasir123`
   - *Mock authentication otomatis dinonaktifkan total pada mode produksi (`NODE_ENV=production`)*.

2. **Supabase PostgreSQL Mode (Produksi)**:
   - Terkoneksi ke database PostgreSQL Supabase dengan transaksi atomik via RPC function (`SELECT ... FOR UPDATE` row locking).
   - Menggunakan `@supabase/ssr` dengan cookie `httpOnly`, `sameSite: 'lax'`, dan `secure`.

---

## 🚀 Panduan Menjalankan Aplikasi

### 1. Prasyarat
- Node.js 18+ (direkomendasikan Node 20 LTS atau Node 22)
- npm atau yarn

### 2. Instalasi Dependensi
```bash
git clone <repository-url>
cd smart-retail-crm
npm install
```

### 3. Menjalankan Demo Zero-Config (Tanpa Konfigurasi)
Tidak memerlukan file `.env` atau konfigurasi Supabase apa pun:
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) di browser:
- Anda akan diarahkan ke halaman login `/login`.
- Gunakan tombol cepat demo: **Masuk sebagai Pemilik** atau **Masuk sebagai Kasir**.

---

## 🗄️ Setup Supabase (Mode Produksi)

1. Buat project baru di [Supabase](https://supabase.com).
2. Buka **SQL Editor** pada dashboard Supabase.
3. Jalankan skrip fondasi dari [`supabase/schema.sql`](file:///C:/Users/lenovo/.gemini/antigravity/scratch/smart-retail-crm/supabase/schema.sql).
4. Jalankan skrip migrasi autentikasi & RLS dari [`supabase/migrations/20261101_auth_rbac_rls.sql`](file:///C:/Users/lenovo/.gemini/antigravity/scratch/smart-retail-crm/supabase/migrations/20261101_auth_rbac_rls.sql).

### Cara Aman Membuat Akun OWNER Pertama di Supabase
Pendaftaran publik (*public signup*) dinonaktifkan. Untuk membuat akun OWNER pertama:
1. Buka dashboard Supabase -> **Authentication** -> **Users** -> **Add user** (Create user).
2. Masukkan email dan password pemilik toko (contoh: `pemilik@tokoberkah.com`). Centang *Auto Confirm User*.
3. Buka **SQL Editor** dan jalankan perintah berikut untuk mengangkat user tersebut menjadi OWNER:
   ```sql
   UPDATE public.profiles
   SET role = 'OWNER', full_name = 'Haji Sulaiman (Pemilik Toko)'
   WHERE id = (SELECT id FROM auth.users WHERE email = 'pemilik@tokoberkah.com');
   ```
4. Salin file `.env.example` menjadi `.env.local` dan isi kredensial Supabase Anda:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
5. Akun kasir selanjutnya dapat dibuat langsung oleh OWNER melalui antarmuka web di menu **Kelola Staf** (`/users`).

---

## 🧪 Pengujian Otomatis

Aplikasi dilengkapi dengan **120 skenario pengujian otomatis** menggunakan **Vitest** dan skrip verifikasi RLS PostgreSQL.

### Menjalankan Vitest
```bash
npm test
```

### Cakupan Pengujian (10 File Test Suite, 120 Test Lulus):
- `auth-rbac.test.ts` (20 test):
  - Mock Auth security & penonaktifan total di mode produksi (`NODE_ENV=production`).
  - Proteksi rute unauthenticated (401).
  - Hak akses CASHIER vs OWNER (pembatasan produk, penolakan tarik tabungan, kunci limit kredit).
  - Anti-spoofing identitas kasir pada transaksi dan ledger.
  - Penolakan akun nonaktif.
  - Proteksi OWNER terakhir dari demotion atau penonaktifan.
  - Pencatatan aktivitas sensitif ke `audit_log`.
- `repository-atomic.test.ts` (11 test): Transaksi atomik dan rollback konsistensi.
- `acceptance-criteria-given-when-then.test.ts` (14 test): Skenario Given-When-Then sesuai proposal sembako.
- `pricing.test.ts` (12 test): Kalkulasi harga tier warung/eceran, kuantitas 3 desimal, discount clamping.
- `split-payment.test.ts` (8 test): Validasi alokasi 3 pos pembayaran.
- `credit-guard.test.ts` (9 test): Hard limit guard kasbon dan pemulihan plafon via cicilan.
- `guest-rules.test.ts` (6 test): Larangan kasbon dan tabungan untuk tamu walk-in.
- `ewma-radar.test.ts` (13 test): Formula interval EWMA dan transisi status urgensi.
- `whatsapp.test.ts` (12 test): Normalisasi telepon Indonesia dan sanitasi pesan WhatsApp.
- `validations.test.ts` (15 test): Schema Zod untuk semua data masukan.

### Menjalankan Uji Kebijakan Database (PostgreSQL RLS)
Jalankan file skrip pengujian SQL di Supabase SQL Editor:
[`supabase/tests/rls_permission_matrix.sql`](file:///C:/Users/lenovo/.gemini/antigravity/scratch/smart-retail-crm/supabase/tests/rls_permission_matrix.sql)

---

## 🌐 Deploy ke Vercel

1. Hubungkan repository GitHub ke [Vercel](https://vercel.com).
2. Di pengaturan **Environment Variables**, masukkan:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Deploy! Next.js App Router dan security headers (CSP, HSTS, X-Frame-Options) akan langsung aktif.
