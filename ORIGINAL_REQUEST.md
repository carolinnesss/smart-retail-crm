# Original User Request

## Initial Request — 2026-11-01T05:21:29Z

Aplikasi web Smart Retail CRM & POS terintegrasi untuk mendigitalisasi operasional harian toko sembako tradisional: kasir pintar dengan penyesuaian harga grosir/eceran otomatis, proteksi batas kasbon digital, dompet tabungan pelanggan mandiri, dan smart dashboard prediksi restok.

Working directory: C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm
Integrity mode: development

Requested team: Multi-agent team (Full team: Frontend Architect, Database Engineer, POS Logic Specialist, Quality Auditor)

## Requirements

### R1. Fullstack Architecture & Vercel-Ready Stack
Aplikasi dibangun menggunakan Next.js (App Router, Tailwind CSS, Lucide Icons) dengan backend Route Handlers terintegrasi, Supabase Client (PostgreSQL), serta fallback mock state sehingga aplikasi dapat langsung dijalankan dan didemokan secara interaktif baik secara lokal maupun di Vercel.

### R2. Sistem Kasir (POS) & Penyesuaian Harga Otomatis
- Antarmuka POS kasir yang responsif dan cepat untuk operasional toko sembako.
- Saat kasir memilih nama pelanggan:
  * Jika pelanggan bertipe 'Warung / Grosir', harga item otomatis menerapkan wholesale_price.
  * Jika pelanggan bertipe 'Eceran', harga item menerapkan retail_price.
- Keranjang belanja mendukung penyesuaian kuantitas, diskon, dan subtotal otomatis.

### R3. Manajemen Kasbon & Proteksi Limit Utang Real-Time
- Setiap pelanggan memiliki data max_credit_limit dan current_debt.
- Jika kasir memilih metode kasbon (sebagian atau seluruhnya) dan total utang baru melebihi max_credit_limit, transaksi diblokir dengan peringatan limit terlampaui.
- Fitur pelunasan/cicilan kasbon yang langsung mengurangi current_debt dan mencatat riwayat pelunasan.

### R4. Dompet Tabungan Pelanggan (Store Savings Wallet)
- Modul simpanan/tabungan digital toko: pelanggan dapat menyetor uang tunai (top-up) atau menarik saldo tabungan.
- Di kasir (POS), saldo tabungan dapat digunakan sebagai metode pembayaran belanjaan (potong saldo tabungan).
- Sistem memvalidasi saldo tabungan tidak boleh menjadi negatif.
- Mendukung pembayaran campuran (Split Payment): kombinasi Tunai + Potong Saldo Tabungan + Kasbon (selama dalam batas limit).

### R5. Smart Dashboard & Prediksi Restok Otomatis
- Monitoring keuangan toko: Total Omzet Penjualan Harian/Bulanan, Total Piutang Kasbon di Luar, dan Total Saldo Tabungan Mengendap.
- Prediksi Restok Sembako: Algoritma heuristik yang menganalisis interval frekuensi belanja pelanggan rutin untuk komoditas sembako (beras, minyak, gula, telur, tepung) dan menampilkan sinyal peringatan "Perlu Restok / Hubungi Pelanggan" saat mendekati estimasi siklus habis.

### R6. Centralized CRM & Audit Trail Terpadu
- Profil pelanggan terpadu dengan rekam jejak lengkap:
  * Histori pembelian barang di kasir.
  * Mutasi keluar-masuk saldo tabungan (debit/kredit).
  * Histori kasbon & cicilan pembayaran.
- Manajemen pelanggan: tambah, ubah data, atur limit kredit, dan ubah status tier (Eceran/Grosir).

### R7. Database Schema & Supabase SQL Migration
- Skema PostgreSQL lengkap: tabel customers, products, transactions, transaction_items, debt_payments, savings_mutations, dan store_settings.
- Constraint data integrity, indexes, triggers/functions untuk kalkulasi saldo & utang otomatis.
- File seed data realistis berisi katalog barang sembako Indonesia dan sampel profil pelanggan warung.

## Acceptance Criteria

### Kasir & POS
- [ ] Kasir dapat memilih pelanggan dan verifikasi bahwa harga barang beralih otomatis antara harga grosir dan harga eceran.
- [ ] Keranjang belanja menghitung subtotal, pajak/diskon, dan total pembayaran secara akurat.
- [ ] Transaksi tersimpan ke state/database dengan rincian item, kuantitas, harga applied, dan rincian pembayaran.

### Kasbon & Proteksi Limit
- [ ] Kasir ditolak saat mencoba menyimpan transaksi kasbon yang melebihi limit kredit pelanggan (current_debt + kasbon_amount > max_credit_limit).
- [ ] Transaksi kasbon yang disetujui menambah saldo current_debt pelanggan.
- [ ] Pembayaran cicilan kasbon berhasil memotong nilai current_debt dan tercatat di riwayat kasbon.

### Dompet Tabungan & Split Payment
- [ ] Pelanggan dapat melakukan setor tunai dan tarik saldo tabungan dengan pencatatan mutasi yang akurat.
- [ ] Transaksi POS dapat menggunakan saldo tabungan sebagai pemotong pembayaran.
- [ ] Split payment (misal: belanja Rp 100.000 dibayar Rp 30.000 tabungan + Rp 50.000 tunai + Rp 20.000 kasbon) diproses dan membagi mutasi keuangan ke masing-masing pos secara tepat.
- [ ] Penarikan atau pembayaran tabungan yang melebihi saldo tabungan ditolak sistem.

### Dashboard & Prediksi Restok
- [ ] Dashboard menampilkan kartu ringkasan: Total Penjualan, Total Kasbon Belum Lunas, dan Total Saldo Tabungan Toko.
- [ ] Widget Prediksi Restok memunculkan daftar rekomendasi sembako yang diperkirakan habis berdasarkan tanggal pembelian terakhir dan interval konsumsi pelanggan rutin.

### Database & Deployment
- [ ] Skrip SQL migrasi database Supabase tersedia dan valid (schema.sql dan seed.sql).
- [ ] Aplikasi berjalan tanpa error pada npm run dev / npm run build dan siap di-deploy ke Vercel.
