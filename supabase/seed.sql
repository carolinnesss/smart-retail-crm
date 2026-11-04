-- ============================================================================
-- SMART RETAIL CRM & POS — SUPABASE / POSTGRESQL SEED DATA (R7)
-- Authentic Indonesian Sembako Catalog & Realistic Customer Profiles
-- Target Path: supabase/seed.sql
-- ============================================================================

-- Disable triggers during seeding to populate historical transactions, ledgers, and pre-calculated balances
ALTER TABLE transactions DISABLE TRIGGER trg_validate_transaction_limits;
ALTER TABLE transactions DISABLE TRIGGER trg_sync_transaction_balances;
ALTER TABLE transaction_items DISABLE TRIGGER trg_decrement_product_stock;
ALTER TABLE debt_payments DISABLE TRIGGER trg_process_debt_payment;
ALTER TABLE savings_mutations DISABLE TRIGGER trg_process_manual_savings_mutation;

-- ----------------------------------------------------------------------------
-- 1. STORE IDENTITY & METADATA
-- ----------------------------------------------------------------------------
INSERT INTO store_settings (
    id,
    store_name,
    owner_name,
    phone,
    address,
    header_note,
    footer_note,
    low_stock_threshold_default,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Toko Sembako Berkah Mandiri',
    'Oline',
    '0812-3456-7890',
    'Jl. Raya Pasar Minggu No. 45, Jakarta Selatan',
    'Pusat Grosir & Eceran Sembako Murah Berkualitas',
    'Barang yang sudah dibeli dapat ditukar jika kemasan rusak saat diterima. Terima kasih atas kunjungan Anda!',
    10,
    timezone('utc', now() - INTERVAL '30 days'),
    timezone('utc', now())
) ON CONFLICT (id) DO UPDATE SET
    store_name = EXCLUDED.store_name,
    owner_name = EXCLUDED.owner_name,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    header_note = EXCLUDED.header_note,
    footer_note = EXCLUDED.footer_note,
    low_stock_threshold_default = EXCLUDED.low_stock_threshold_default,
    updated_at = timezone('utc', now());

-- ----------------------------------------------------------------------------
-- 2. CUSTOMER PROFILES (CRM, Dual Tiers, Credit Limits & Savings Balances)
-- ----------------------------------------------------------------------------
INSERT INTO customers (
    id,
    name,
    phone,
    address,
    customer_type,
    max_credit_limit,
    current_debt,
    savings_balance,
    is_active,
    created_at,
    updated_at
) VALUES
-- 1. Walk-in Guest (Cash only, 0 credit limit, 0 savings)
(
    '10000000-0000-0000-0000-000000000001',
    'Pelanggan Umum (Walk-in)',
    '0000-0000-0000',
    'Kasir / Walk-in Store',
    'Eceran',
    0.00,
    0.00,
    0.00,
    true,
    timezone('utc', now() - INTERVAL '30 days'),
    timezone('utc', now())
),
-- 2. Warung Bu Siti (Warung / Grosir tier, active debt, active savings)
(
    '10000000-0000-0000-0000-000000000002',
    'Warung Bu Siti',
    '0812-9876-5432',
    'Jl. Melati No. 12 RT 03/RW 04, Kelurahan Sukamaju',
    'Warung / Grosir',
    3000000.00,
    750000.00,
    450000.00,
    true,
    timezone('utc', now() - INTERVAL '25 days'),
    timezone('utc', now())
),
-- 3. Pak Joko Grosir (High credit limit, wholesale distributor partner)
(
    '10000000-0000-0000-0000-000000000003',
    'Pak Joko Grosir',
    '0813-1122-3344',
    'Komp. Pasar Induk Kios B-14, Sukamaju',
    'Warung / Grosir',
    5000000.00,
    2200000.00,
    1500000.00,
    true,
    timezone('utc', now() - INTERVAL '28 days'),
    timezone('utc', now())
),
-- 4. Warung Kopi Mas Dimas (Small wholesale business account)
(
    '10000000-0000-0000-0000-000000000004',
    'Warung Kopi Mas Dimas',
    '0857-4455-6677',
    'Jl. Raya Stasiun No. 5',
    'Warung / Grosir',
    1500000.00,
    400000.00,
    120000.00,
    true,
    timezone('utc', now() - INTERVAL '20 days'),
    timezone('utc', now())
),
-- 5. Ibu Rini Eceran (Neighborhood household buyer, modest kasbon limit)
(
    '10000000-0000-0000-0000-000000000005',
    'Ibu Rini Eceran',
    '0878-8899-0011',
    'Gang Rambutan RT 01/RW 02 No. 8',
    'Eceran',
    300000.00,
    85000.00,
    250000.00,
    true,
    timezone('utc', now() - INTERVAL '22 days'),
    timezone('utc', now())
),
-- 6. Pak Bambang (Guru Tetangga - High savings wallet balance, zero debt)
(
    '10000000-0000-0000-0000-000000000006',
    'Pak Bambang (Guru Tetangga)',
    '0821-3322-1100',
    'Jl. Cempaka No. 44',
    'Eceran',
    500000.00,
    0.00,
    800000.00,
    true,
    timezone('utc', now() - INTERVAL '24 days'),
    timezone('utc', now())
),
-- 7. Mbak Dewi Laundry (Local micro business, frequent retail buyer)
(
    '10000000-0000-0000-0000-000000000007',
    'Mbak Dewi Laundry',
    '0896-1234-5678',
    'Jl. Kober Gang Musholla No. 19',
    'Eceran',
    400000.00,
    125000.00,
    50000.00,
    true,
    timezone('utc', now() - INTERVAL '18 days'),
    timezone('utc', now())
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    customer_type = EXCLUDED.customer_type,
    max_credit_limit = EXCLUDED.max_credit_limit,
    current_debt = EXCLUDED.current_debt,
    savings_balance = EXCLUDED.savings_balance,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc', now());

-- ----------------------------------------------------------------------------
-- 3. PRODUCTS MASTER (30 Authentic Indonesian Sembako Items with EAN-13 Barcodes)
-- ----------------------------------------------------------------------------
INSERT INTO products (
    id,
    sku,
    name,
    category,
    unit,
    retail_price,
    wholesale_price,
    stock_quantity,
    min_stock_alert,
    is_active,
    created_at,
    updated_at
) VALUES
-- Category: Beras (Staple Commodity #1)
('20000000-0000-0000-0000-000000000001', '8991001100011', 'Beras Setra Ramos Cap Bunga 5kg', 'Beras', 'sak 5kg', 74000.00, 69000.00, 45, 10, true, timezone('utc', now() - INTERVAL '30 days'), timezone('utc', now())),
('20000000-0000-0000-0000-000000000002', '8991001100028', 'Beras Setra Ramos Cap Bunga Karung 25kg', 'Beras', 'karung 25kg', 360000.00, 340000.00, 20, 5, true, timezone('utc', now() - INTERVAL '30 days'), timezone('utc', now())),
('20000000-0000-0000-0000-000000000003', '8991001100035', 'Beras Pandan Wangi Cianjur Premium 5kg', 'Beras', 'sak 5kg', 85000.00, 79000.00, 30, 8, true, timezone('utc', now() - INTERVAL '30 days'), timezone('utc', now())),
('20000000-0000-0000-0000-000000000004', '8991001100042', 'Beras Rojo Lele Super 5kg', 'Beras', 'sak 5kg', 72000.00, 67500.00, 40, 10, true, timezone('utc', now() - INTERVAL '30 days'), timezone('utc', now())),
('20000000-0000-0000-0000-000000000005', '8991001100059', 'Beras Ketan Putih Super 1kg', 'Beras', 'kg', 18000.00, 16500.00, 25, 5, true, timezone('utc', now() - INTERVAL '30 days'), timezone('utc', now())),

-- Category: Minyak Goreng (Staple Commodity #2)
('20000000-0000-0000-0000-000000000006', '8991002200010', 'Minyak Goreng Bimoli Klasik Pouch 2L', 'Minyak Goreng', 'pouch 2L', 38500.00, 35500.00, 60, 15, true, timezone('utc', now() - INTERVAL '30 days'), timezone('utc', now())),
('20000000-0000-0000-0000-000000000007', '8991002200027', 'Minyak Goreng Bimoli Karton (6 x 2L)', 'Minyak Goreng', 'karton (6 pouch)', 228000.00, 212000.00, 15, 3, true, timezone('utc', now() - INTERVAL '30 days'), timezone('utc', now())),
('20000000-0000-0000-0000-000000000008', '8991002200034', 'Minyak Goreng Filma Pouch 2L', 'Minyak Goreng', 'pouch 2L', 37000.00, 34000.00, 50, 12, true, timezone('utc', now() - INTERVAL '30 days'), timezone('utc', now())),
('20000000-0000-0000-0000-000000000009', '8991002200041', 'Minyak Goreng SunCo Pouch 2L', 'Minyak Goreng', 'pouch 2L', 38000.00, 35000.00, 45, 10, true, timezone('utc', now() - INTERVAL '30 days'), timezone('utc', now())),
('20000000-0000-0000-0000-000000000010', '8991002200058', 'Minyakita Bantal 1 Liter', 'Minyak Goreng', 'bantal 1L', 16000.00, 14500.00, 80, 20, true, timezone('utc', now() - INTERVAL '30 days'), timezone('utc', now())),
('20000000-0000-0000-0000-000000000011', '8991002200065', 'Minyakita Karton (12 x 1L)', 'Minyak Goreng', 'karton (12 pcs)', 190000.00, 174000.00, 25, 5, true, timezone('utc', now() - INTERVAL '30 days'), timezone('utc', now())),

-- Category: Gula Pasir (Staple Commodity #3)
('20000000-0000-0000-0000-000000000012', '8991003300019', 'Gula Pasir Gulaku Kuning Premium 1kg', 'Gula Pasir', 'pack 1kg', 18000.00, 16500.00, 90, 20, true, timezone('utc', now() - INTERVAL '30 days'), timezone('utc', now())),
('20000000-0000-0000-0000-000000000013', '8991003300026', 'Gulaku Kuning Karton (24 x 1kg)', 'Gula Pasir', 'karton (24 pack)', 425000.00, 395000.00, 12, 3, true, timezone('utc', now() - INTERVAL '30 days'), timezone('utc', now())),
('20000000-0000-0000-0000-000000000014', '8991003300033', 'Gula Pasir Gulaku Putih Premium 1kg', 'Gula Pasir', 'pack 1kg', 18500.00, 17000.00, 65, 15, true, timezone('utc', now() - INTERVAL '30 days'), timezone('utc', now())),
('20000000-0000-0000-0000-000000000015', '8991003300040', 'Gula Merah Kelapa Cetak Super 1kg', 'Gula Pasir', 'kg', 22000.00, 19500.00, 35, 8, true, timezone('utc', now() - INTERVAL '30 days'), timezone('utc', now())),

-- Category: Telur Ayam (Staple Commodity #4)
('20000000-0000-0000-0000-000000000016', '8991004400018', 'Telur Ayam Negeri Fresh 1kg', 'Telur Ayam', 'kg', 29000.00, 27000.00, 50, 10, true, timezone('utc', now() - INTERVAL '30 days'), timezone('utc', now())),
('20000000-0000-0000-0000-000000000017', '8991004400025', 'Telur Ayam Tray Karton (30 butir / ~1.8kg)', 'Telur Ayam', 'tray (30 butir)', 51000.00, 47500.00, 30, 5, true, timezone('utc', now() - INTERVAL '30 days'), timezone('utc', now())),
('20000000-0000-0000-0000-000000000018', '8991004400032', 'Telur Bebek Asin Asli Brebes', 'Telur Ayam', 'butir', 4500.00, 3800.00, 120, 20, true, timezone('utc', now() - INTERVAL '30 days'), timezone('utc', now())),

-- Category: Tepung Terigu (Staple Commodity #5)
('20000000-0000-0000-0000-000000000019', '8991005500017', 'Tepung Terigu Segitiga Biru Bogasari 1kg', 'Tepung Terigu', 'pack 1kg', 14000.00, 12500.00, 75, 15, true, timezone('utc', now() - INTERVAL '30 days'), timezone('utc', now())),
('20000000-0000-0000-0000-000000000020', '8991005500024', 'Segitiga Biru Karton (12 x 1kg)', 'Tepung Terigu', 'karton (12 pack)', 165000.00, 149000.00, 18, 4, true, timezone('utc', now() - INTERVAL '30 days'), timezone('utc', now())),
('20000000-0000-0000-0000-000000000021', '8991005500031', 'Tepung Terigu Cakra Kembar Bogasari 1kg', 'Tepung Terigu', 'pack 1kg', 15000.00, 13500.00, 50, 10, true, timezone('utc', now() - INTERVAL '30 days'), timezone('utc', now())),
('20000000-0000-0000-0000-000000000022', '8991005500048', 'Tepung Beras Putih Rose Brand 500g', 'Tepung Terigu', 'pack 500g', 9000.00, 8000.00, 60, 15, true, timezone('utc', now() - INTERVAL '30 days'), timezone('utc', now())),
('20000000-0000-0000-0000-000000000023', '8991005500055', 'Tepung Tapioka Cap Pak Tani Gunung 500g', 'Tepung Terigu', 'pack 500g', 10500.00, 9200.00, 40, 10, true, timezone('utc', now() - INTERVAL '30 days'), timezone('utc', now())),

-- Category: Mie Instan
('20000000-0000-0000-0000-000000000024', '8998866200225', 'Indomie Goreng Spesial 85g (Pcs)', 'Mie Instan', 'pcs', 3200.00, 2900.00, 200, 40, true, timezone('utc', now() - INTERVAL '30 days'), timezone('utc', now())),
('20000000-0000-0000-0000-000000000025', '8998866200232', 'Indomie Goreng Karton (40 pcs)', 'Mie Instan', 'karton (40 pcs)', 125000.00, 115000.00, 20, 5, true, timezone('utc', now() - INTERVAL '30 days'), timezone('utc', now())),
('20000000-0000-0000-0000-000000000026', '8998866200119', 'Indomie Kuah Ayam Bawang 75g (Pcs)', 'Mie Instan', 'pcs', 3000.00, 2750.00, 180, 40, true, timezone('utc', now() - INTERVAL '30 days'), timezone('utc', now())),
('20000000-0000-0000-0000-000000000027', '8998866200126', 'Indomie Kuah Soto Mie 70g (Pcs)', 'Mie Instan', 'pcs', 3000.00, 2750.00, 150, 30, true, timezone('utc', now() - INTERVAL '30 days'), timezone('utc', now())),
('20000000-0000-0000-0000-000000000028', '8998866200133', 'Mie Sedaap Goreng Krispi 90g (Pcs)', 'Mie Instan', 'pcs', 3200.00, 2900.00, 160, 35, true, timezone('utc', now() - INTERVAL '30 days'), timezone('utc', now())),

-- Category: Bumbu Dapur & Minuman
('20000000-0000-0000-0000-000000000029', '8991006600016', 'Kecap Manis Bango Botol 275ml', 'Bumbu Dapur', 'botol 275ml', 16500.00, 14000.00, 40, 10, true, timezone('utc', now() - INTERVAL '30 days'), timezone('utc', now())),
('20000000-0000-0000-0000-000000000030', '8991006600023', 'Kopi Kapal Api Spesial Mix Renceng (10 sachet)', 'Susu & Minuman', 'renceng (10 sachet)', 14000.00, 12500.00, 60, 15, true, timezone('utc', now() - INTERVAL '30 days'), timezone('utc', now()))
ON CONFLICT (sku) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    unit = EXCLUDED.unit,
    retail_price = EXCLUDED.retail_price,
    wholesale_price = EXCLUDED.wholesale_price,
    stock_quantity = EXCLUDED.stock_quantity,
    min_stock_alert = EXCLUDED.min_stock_alert,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc', now());

-- ----------------------------------------------------------------------------
-- 4. SAMPLE TRANSACTIONS & ITEMS (Demonstrating Cash, Kasbon, Savings & Split Payment)
-- ----------------------------------------------------------------------------

-- Transaction 1: Cash Checkout (Guest Walk-in, 10 days ago)
-- Total: Rp 112.500 (Beras Ramos 5kg 74.000 + Bimoli 2L 38.500)
INSERT INTO transactions (
    id, invoice_number, customer_id, total_amount, discount_amount, final_amount,
    payment_method, cash_amount, savings_amount, debt_amount, status, notes, created_at, updated_at
) VALUES (
    '30000000-0000-0000-0000-000000000001',
    'INV-20261101-0001',
    '10000000-0000-0000-0000-000000000001',
    112500.00, 0.00, 112500.00,
    'cash', 112500.00, 0.00, 0.00, 'completed', 'Belanja tunai langsung kasir',
    timezone('utc', now() - INTERVAL '10 days'),
    timezone('utc', now() - INTERVAL '10 days')
) ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO transaction_items (id, transaction_id, product_id, quantity, unit_price, price_type, subtotal, created_at) VALUES
('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 1, 74000.00, 'retail', 74000.00, timezone('utc', now() - INTERVAL '10 days')),
('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', 1, 38500.00, 'retail', 38500.00, timezone('utc', now() - INTERVAL '10 days'))
ON CONFLICT (id) DO NOTHING;

-- Transaction 2: Wholesale Split Payment (Warung Bu Siti, 7 days ago)
-- Total: Rp 715.000. Split: Rp 200.000 Cash + Rp 150.000 Tabungan + Rp 365.000 Kasbon
INSERT INTO transactions (
    id, invoice_number, customer_id, total_amount, discount_amount, final_amount,
    payment_method, cash_amount, savings_amount, debt_amount, status, notes, created_at, updated_at
) VALUES (
    '30000000-0000-0000-0000-000000000002',
    'INV-20261101-0002',
    '10000000-0000-0000-0000-000000000002',
    715000.00, 0.00, 715000.00,
    'split', 200000.00, 150000.00, 365000.00, 'completed', 'Restok warung mingguan split payment',
    timezone('utc', now() - INTERVAL '7 days'),
    timezone('utc', now() - INTERVAL '7 days')
) ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO transaction_items (id, transaction_id, product_id, quantity, unit_price, price_type, subtotal, created_at) VALUES
('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 1, 340000.00, 'wholesale', 340000.00, timezone('utc', now() - INTERVAL '7 days')),
('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000007', 1, 212000.00, 'wholesale', 212000.00, timezone('utc', now() - INTERVAL '7 days')),
('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000020', 1, 149000.00, 'wholesale', 149000.00, timezone('utc', now() - INTERVAL '7 days')),
('40000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000029', 1, 14000.00, 'wholesale', 14000.00, timezone('utc', now() - INTERVAL '7 days'))
ON CONFLICT (id) DO NOTHING;

-- Transaction 3: Recurring Purchase for Restock Heuristic Prediction (Warung Bu Siti, 3 days ago)
-- Buys Minyak Bimoli Karton again, forming a clear 4-day recurring consumption cycle
INSERT INTO transactions (
    id, invoice_number, customer_id, total_amount, discount_amount, final_amount,
    payment_method, cash_amount, savings_amount, debt_amount, status, notes, created_at, updated_at
) VALUES (
    '30000000-0000-0000-0000-000000000003',
    'INV-20261101-0003',
    '10000000-0000-0000-0000-000000000002',
    212000.00, 0.00, 212000.00,
    'cash', 212000.00, 0.00, 0.00, 'completed', 'Bimoli karton tambahan',
    timezone('utc', now() - INTERVAL '3 days'),
    timezone('utc', now() - INTERVAL '3 days')
) ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO transaction_items (id, transaction_id, product_id, quantity, unit_price, price_type, subtotal, created_at) VALUES
('40000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000007', 1, 212000.00, 'wholesale', 212000.00, timezone('utc', now() - INTERVAL '3 days'))
ON CONFLICT (id) DO NOTHING;

-- Transaction 4: Wholesale Kasbon Order (Pak Joko Grosir, 6 days ago)
-- Total: Rp 629.000. Fully kasbon (debt_amount = 629.000)
INSERT INTO transactions (
    id, invoice_number, customer_id, total_amount, discount_amount, final_amount,
    payment_method, cash_amount, savings_amount, debt_amount, status, notes, created_at, updated_at
) VALUES (
    '30000000-0000-0000-0000-000000000004',
    'INV-20261101-0004',
    '10000000-0000-0000-0000-000000000003',
    629000.00, 0.00, 629000.00,
    'debt', 0.00, 0.00, 629000.00, 'completed', 'Pengambilan sembako grosir kasbon',
    timezone('utc', now() - INTERVAL '6 days'),
    timezone('utc', now() - INTERVAL '6 days')
) ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO transaction_items (id, transaction_id, product_id, quantity, unit_price, price_type, subtotal, created_at) VALUES
('40000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', 1, 340000.00, 'wholesale', 340000.00, timezone('utc', now() - INTERVAL '6 days')),
('40000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000011', 1, 174000.00, 'wholesale', 174000.00, timezone('utc', now() - INTERVAL '6 days')),
('40000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000025', 1, 115000.00, 'wholesale', 115000.00, timezone('utc', now() - INTERVAL '6 days'))
ON CONFLICT (id) DO NOTHING;

-- Transaction 5: Recurring Rice Purchase for Restock Heuristic (Pak Joko Grosir, 1 day ago)
INSERT INTO transactions (
    id, invoice_number, customer_id, total_amount, discount_amount, final_amount,
    payment_method, cash_amount, savings_amount, debt_amount, status, notes, created_at, updated_at
) VALUES (
    '30000000-0000-0000-0000-000000000005',
    'INV-20261101-0005',
    '10000000-0000-0000-0000-000000000003',
    158000.00, 0.00, 158000.00,
    'cash', 158000.00, 0.00, 0.00, 'completed', 'Beras Pandan Wangi tambahan',
    timezone('utc', now() - INTERVAL '1 day'),
    timezone('utc', now() - INTERVAL '1 day')
) ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO transaction_items (id, transaction_id, product_id, quantity, unit_price, price_type, subtotal, created_at) VALUES
('40000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000003', 2, 79000.00, 'wholesale', 158000.00, timezone('utc', now() - INTERVAL '1 day'))
ON CONFLICT (id) DO NOTHING;

-- Transaction 6: Retail Split Payment (Ibu Rini Eceran, 4 days ago)
-- Total: Rp 63.000. Tender: Rp 50.000 Tabungan + Rp 13.000 Cash
INSERT INTO transactions (
    id, invoice_number, customer_id, total_amount, discount_amount, final_amount,
    payment_method, cash_amount, savings_amount, debt_amount, status, notes, created_at, updated_at
) VALUES (
    '30000000-0000-0000-0000-000000000006',
    'INV-20261101-0006',
    '10000000-0000-0000-0000-000000000005',
    63000.00, 0.00, 63000.00,
    'split', 13000.00, 50000.00, 0.00, 'completed', 'Belanja dapur harian potong tabungan',
    timezone('utc', now() - INTERVAL '4 days'),
    timezone('utc', now() - INTERVAL '4 days')
) ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO transaction_items (id, transaction_id, product_id, quantity, unit_price, price_type, subtotal, created_at) VALUES
('40000000-0000-0000-0000-000000000012', '30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000012', 1, 18000.00, 'retail', 18000.00, timezone('utc', now() - INTERVAL '4 days')),
('40000000-0000-0000-0000-000000000013', '30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000016', 1, 29000.00, 'retail', 29000.00, timezone('utc', now() - INTERVAL '4 days')),
('40000000-0000-0000-0000-000000000014', '30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000024', 5, 3200.00, 'retail', 16000.00, timezone('utc', now() - INTERVAL '4 days'))
ON CONFLICT (id) DO NOTHING;

-- Transaction 7: Retail Kasbon Order (Mbak Dewi Laundry, 2 days ago)
-- Total: Rp 46.000. Full Kasbon (debt_amount = 46.000)
INSERT INTO transactions (
    id, invoice_number, customer_id, total_amount, discount_amount, final_amount,
    payment_method, cash_amount, savings_amount, debt_amount, status, notes, created_at, updated_at
) VALUES (
    '30000000-0000-0000-0000-000000000007',
    'INV-20261101-0007',
    '10000000-0000-0000-0000-000000000007',
    46000.00, 0.00, 46000.00,
    'debt', 0.00, 0.00, 46000.00, 'completed', 'Kasbon sembako keperluan laundry',
    timezone('utc', now() - INTERVAL '2 days'),
    timezone('utc', now() - INTERVAL '2 days')
) ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO transaction_items (id, transaction_id, product_id, quantity, unit_price, price_type, subtotal, created_at) VALUES
('40000000-0000-0000-0000-000000000015', '30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000010', 2, 16000.00, 'retail', 32000.00, timezone('utc', now() - INTERVAL '2 days')),
('40000000-0000-0000-0000-000000000016', '30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000019', 1, 14000.00, 'retail', 14000.00, timezone('utc', now() - INTERVAL '2 days'))
ON CONFLICT (id) DO NOTHING;

-- Transaction 8: Today Cash Sale (Pak Bambang Guru Tetangga, today)
-- Contributes to today_sales in get_store_financial_summary()
INSERT INTO transactions (
    id, invoice_number, customer_id, total_amount, discount_amount, final_amount,
    payment_method, cash_amount, savings_amount, debt_amount, status, notes, created_at, updated_at
) VALUES (
    '30000000-0000-0000-0000-000000000008',
    'INV-20261101-0008',
    '10000000-0000-0000-0000-000000000006',
    58000.00, 0.00, 58000.00,
    'cash', 58000.00, 0.00, 0.00, 'completed', 'Belanja kopi & telur pagi',
    timezone('utc', now() - INTERVAL '2 hours'),
    timezone('utc', now() - INTERVAL '2 hours')
) ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO transaction_items (id, transaction_id, product_id, quantity, unit_price, price_type, subtotal, created_at) VALUES
('40000000-0000-0000-0000-000000000017', '30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000016', 1, 29000.00, 'retail', 29000.00, timezone('utc', now() - INTERVAL '2 hours')),
('40000000-0000-0000-0000-000000000018', '30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000030', 1, 14000.00, 'retail', 14000.00, timezone('utc', now() - INTERVAL '2 hours')),
('40000000-0000-0000-0000-000000000019', '30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000027', 5, 3000.00, 'retail', 15000.00, timezone('utc', now() - INTERVAL '2 hours'))
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. SAVINGS MUTATIONS AUDIT LEDGER
-- ----------------------------------------------------------------------------
INSERT INTO savings_mutations (
    id, customer_id, mutation_type, amount, balance_after, reference_id, notes, created_at
) VALUES
-- Warung Bu Siti: Initial deposit Rp 600.000 -> 600.000
(
    '50000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    'deposit',
    600000.00,
    600000.00,
    NULL,
    'Setor tabungan awal warung',
    timezone('utc', now() - INTERVAL '14 days')
),
-- Warung Bu Siti: Checkout deduction Rp 150.000 -> 450.000
(
    '50000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    'payment',
    150000.00,
    450000.00,
    '30000000-0000-0000-0000-000000000002',
    'Pembayaran transaksi kasir No. INV-20261101-0002',
    timezone('utc', now() - INTERVAL '7 days')
),
-- Pak Joko Grosir: High-value deposit Rp 1.500.000 -> 1.500.000
(
    '50000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000003',
    'deposit',
    1500000.00,
    1500000.00,
    NULL,
    'Setor saldo tabungan belanja grosir',
    timezone('utc', now() - INTERVAL '12 days')
),
-- Ibu Rini: Deposit Rp 300.000 -> 300.000
(
    '50000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000005',
    'deposit',
    300000.00,
    300000.00,
    NULL,
    'Titip tabungan belanja arisan',
    timezone('utc', now() - INTERVAL '10 days')
),
-- Ibu Rini: Checkout deduction Rp 50.000 -> 250.000
(
    '50000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000005',
    'payment',
    50000.00,
    250000.00,
    '30000000-0000-0000-0000-000000000006',
    'Pembayaran transaksi kasir No. INV-20261101-0006',
    timezone('utc', now() - INTERVAL '4 days')
),
-- Pak Bambang Guru: Deposit Rp 800.000 -> 800.000
(
    '50000000-0000-0000-0000-000000000006',
    '10000000-0000-0000-0000-000000000006',
    'deposit',
    800000.00,
    800000.00,
    NULL,
    'Simpanan saldo belanja bulanan tetangga',
    timezone('utc', now() - INTERVAL '5 days')
),
-- Mbak Dewi Laundry: Deposit Rp 50.000 -> 50.000
(
    '50000000-0000-0000-0000-000000000007',
    '10000000-0000-0000-0000-000000000007',
    'deposit',
    50000.00,
    50000.00,
    NULL,
    'Tabungan kembalian belanja laundry',
    timezone('utc', now() - INTERVAL '8 days')
),
-- Warung Kopi Mas Dimas: Deposit Rp 120.000 -> 120.000
(
    '50000000-0000-0000-0000-000000000008',
    '10000000-0000-0000-0000-000000000004',
    'deposit',
    120000.00,
    120000.00,
    NULL,
    'Setoran uang receh warkop',
    timezone('utc', now() - INTERVAL '9 days')
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. DEBT PAYMENTS AUDIT LEDGER
-- ----------------------------------------------------------------------------
INSERT INTO debt_payments (
    id, customer_id, transaction_id, payment_amount, payment_date, notes, created_at
) VALUES
-- Warung Bu Siti: Partial debt installment Rp 100.000 for INV-20261101-0002
(
    '60000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000002',
    100000.00,
    timezone('utc', now() - INTERVAL '2 days'),
    'Cicilan kasbon belanja minggu lalu',
    timezone('utc', now() - INTERVAL '2 days')
),
-- Pak Joko Grosir: Large debt payment Rp 500.000 for INV-20261101-0004
(
    '60000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000004',
    500000.00,
    timezone('utc', now() - INTERVAL '1 day'),
    'Pelunasan sebagian sembako grosir',
    timezone('utc', now() - INTERVAL '1 day')
),
-- Mbak Dewi Laundry: Small installment payment Rp 20.000
(
    '60000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000007',
    '30000000-0000-0000-0000-000000000007',
    20000.00,
    timezone('utc', now() - INTERVAL '1 day'),
    'Cicilan kasbon belanja kemarin',
    timezone('utc', now() - INTERVAL '1 day')
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 7. RE-ENABLE OPERATIONAL TRIGGERS
-- ----------------------------------------------------------------------------
ALTER TABLE transactions ENABLE TRIGGER trg_validate_transaction_limits;
ALTER TABLE transactions ENABLE TRIGGER trg_sync_transaction_balances;
ALTER TABLE transaction_items ENABLE TRIGGER trg_decrement_product_stock;
ALTER TABLE debt_payments ENABLE TRIGGER trg_process_debt_payment;
ALTER TABLE savings_mutations ENABLE TRIGGER trg_process_manual_savings_mutation;
