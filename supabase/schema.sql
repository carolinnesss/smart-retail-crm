-- ============================================================================
-- SMART RETAIL CRM & POS — SUPABASE / POSTGRESQL SCHEMA (7 TABEL)
-- Sembako Retail Digitalization, Kasbon Protection & Double-Entry Ledger
-- Target Path: supabase/schema.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. EXTENSIONS & SETUP
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. STORE SETTINGS (Single-Row Store Configuration & Identity)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS store_settings (
    id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    store_name VARCHAR(150) NOT NULL DEFAULT 'Toko Sembako Berkah Mandiri',
    owner_name VARCHAR(100) NOT NULL DEFAULT 'Oline',
    phone VARCHAR(30) NOT NULL DEFAULT '0812-3456-7890',
    address TEXT NOT NULL DEFAULT 'Jl. Raya Pasar Minggu No. 45, Jakarta Selatan',
    header_note TEXT DEFAULT 'Pusat Grosir & Eceran Sembako Murah Berkualitas',
    footer_note TEXT DEFAULT 'Barang yang sudah dibeli dapat ditukar jika kemasan rusak saat diterima. Terima kasih atas kunjungan Anda!',
    low_stock_threshold_default INT NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ----------------------------------------------------------------------------
-- 2. CUSTOMERS (CRM, Dynamic Tier Pricing, Kasbon Debt & Store Savings Wallet)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    address TEXT,
    customer_type VARCHAR(30) NOT NULL DEFAULT 'Eceran',
    max_credit_limit NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    current_debt NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    savings_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),

    -- Integrity Constraints
    CONSTRAINT chk_customer_type CHECK (customer_type IN ('Warung / Grosir', 'Eceran')),
    CONSTRAINT chk_max_credit_limit_positive CHECK (max_credit_limit >= 0),
    CONSTRAINT chk_current_debt_positive CHECK (current_debt >= 0),
    CONSTRAINT chk_current_debt_within_limit CHECK (current_debt <= max_credit_limit),
    CONSTRAINT chk_savings_balance_positive CHECK (savings_balance >= 0)
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_current_debt ON customers(current_debt) WHERE current_debt > 0;
CREATE INDEX IF NOT EXISTS idx_customers_savings ON customers(savings_balance) WHERE savings_balance > 0;
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active);

-- ----------------------------------------------------------------------------
-- 3. PRODUCTS (Sembako Catalog with Dual-Tier Pricing: Retail vs Wholesale)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(60) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    unit VARCHAR(30) NOT NULL DEFAULT 'pcs',
    retail_price NUMERIC(15, 2) NOT NULL,
    wholesale_price NUMERIC(15, 2) NOT NULL,
    stock_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    min_stock_alert NUMERIC(12, 3) NOT NULL DEFAULT 5.000,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),

    -- Integrity Constraints
    CONSTRAINT chk_retail_price_positive CHECK (retail_price > 0),
    CONSTRAINT chk_wholesale_price_positive CHECK (wholesale_price > 0),
    CONSTRAINT chk_wholesale_le_retail CHECK (wholesale_price <= retail_price),
    CONSTRAINT chk_stock_quantity_positive CHECK (stock_quantity >= 0),
    CONSTRAINT chk_min_stock_alert_positive CHECK (min_stock_alert >= 0)
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON products(stock_quantity, min_stock_alert) WHERE stock_quantity <= min_stock_alert;

-- ----------------------------------------------------------------------------
-- 4. TRANSACTIONS (POS Header & Multi-Tender Split Payment Execution)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(60) NOT NULL UNIQUE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    total_amount NUMERIC(15, 2) NOT NULL,
    discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    final_amount NUMERIC(15, 2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    cash_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    savings_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    debt_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),

    -- Integrity Constraints
    CONSTRAINT chk_payment_method CHECK (payment_method IN ('cash', 'savings', 'debt', 'split')),
    CONSTRAINT chk_transaction_status CHECK (status IN ('completed', 'cancelled', 'refunded')),
    CONSTRAINT chk_total_amount_positive CHECK (total_amount >= 0),
    CONSTRAINT chk_discount_positive CHECK (discount_amount >= 0),
    CONSTRAINT chk_final_amount_calc CHECK (final_amount = total_amount - discount_amount),
    CONSTRAINT chk_payment_components_positive CHECK (
        cash_amount >= 0 AND savings_amount >= 0 AND debt_amount >= 0
    ),
    CONSTRAINT chk_split_payment_sum CHECK (
        final_amount = (cash_amount + savings_amount + debt_amount)
    )
);

CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method ON transactions(payment_method);
CREATE INDEX IF NOT EXISTS idx_transactions_invoice ON transactions(invoice_number);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_created ON transactions(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- ----------------------------------------------------------------------------
-- 5. TRANSACTION ITEMS (Line Items with Frozen Price Snapshot at Sale Time)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity NUMERIC(12, 3) NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL,
    price_type VARCHAR(20) NOT NULL DEFAULT 'retail',
    subtotal NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),

    -- Integrity Constraints
    CONSTRAINT chk_item_quantity_positive CHECK (quantity > 0),
    CONSTRAINT chk_item_unit_price_positive CHECK (unit_price > 0),
    CONSTRAINT chk_item_price_type CHECK (price_type IN ('retail', 'wholesale')),
    CONSTRAINT chk_item_subtotal_calc CHECK (subtotal = quantity * unit_price)
);

CREATE INDEX IF NOT EXISTS idx_items_transaction ON transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_items_product ON transaction_items(product_id);

-- ----------------------------------------------------------------------------
-- 6. SAVINGS LEDGER (Buku Besar Tabungan Pelanggan - Double Entry Audit Trail)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS savings_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    mutation_type VARCHAR(20) NOT NULL, -- 'deposit', 'withdrawal', 'payment'
    amount NUMERIC(15, 2) NOT NULL,
    balance_before NUMERIC(15, 2) NOT NULL,
    balance_after NUMERIC(15, 2) NOT NULL,
    reference_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),

    -- Integrity Constraints
    CONSTRAINT chk_savings_mutation_type CHECK (mutation_type IN ('deposit', 'withdrawal', 'payment')),
    CONSTRAINT chk_savings_mutation_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_savings_balance_before_positive CHECK (balance_before >= 0),
    CONSTRAINT chk_savings_balance_after_positive CHECK (balance_after >= 0)
);

CREATE INDEX IF NOT EXISTS idx_savings_ledger_customer ON savings_ledger(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_savings_ledger_reference ON savings_ledger(reference_id);
CREATE INDEX IF NOT EXISTS idx_savings_ledger_type ON savings_ledger(mutation_type);

-- ----------------------------------------------------------------------------
-- 7. DEBT LEDGER (Buku Besar Utang Kasbon & Cicilan - Double Entry Audit Trail)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS debt_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    entry_type VARCHAR(20) NOT NULL, -- 'charge' (kasbon baru), 'payment' (pelunasan cicilan)
    amount NUMERIC(15, 2) NOT NULL,
    debt_before NUMERIC(15, 2) NOT NULL,
    debt_after NUMERIC(15, 2) NOT NULL,
    reference_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    due_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),

    -- Integrity Constraints
    CONSTRAINT chk_debt_entry_type CHECK (entry_type IN ('charge', 'payment')),
    CONSTRAINT chk_debt_entry_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_debt_before_positive CHECK (debt_before >= 0),
    CONSTRAINT chk_debt_after_positive CHECK (debt_after >= 0)
);

CREATE INDEX IF NOT EXISTS idx_debt_ledger_customer ON debt_ledger(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_debt_ledger_reference ON debt_ledger(reference_id);
CREATE INDEX IF NOT EXISTS idx_debt_ledger_entry_type ON debt_ledger(entry_type);

-- ============================================================================
-- BACKWARDS COMPATIBILITY VIEWS
-- Memastikan query warisan tetap berjalan transparan
-- ============================================================================
CREATE OR REPLACE VIEW debt_payments AS
SELECT
    id,
    customer_id,
    reference_id AS transaction_id,
    amount AS payment_amount,
    created_at AS payment_date,
    notes,
    created_at
FROM debt_ledger
WHERE entry_type = 'payment';

CREATE OR REPLACE VIEW savings_mutations AS
SELECT
    id,
    customer_id,
    mutation_type,
    amount,
    balance_after,
    reference_id,
    notes,
    created_at
FROM savings_ledger;

-- ============================================================================
-- ATOMIC CHECKOUT STORED PROCEDURE (RPC: execute_checkout)
-- Eksekusi checkout kasir atomik dalam 1 transaksi PostgreSQL dengan row locking
-- ============================================================================
CREATE OR REPLACE FUNCTION execute_checkout(
    p_customer_id UUID,
    p_items JSONB,
    p_discount_amount NUMERIC(15, 2),
    p_payment_method VARCHAR(30),
    p_cash_amount NUMERIC(15, 2),
    p_savings_amount NUMERIC(15, 2),
    p_debt_amount NUMERIC(15, 2),
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_customer_name VARCHAR(150);
    v_current_debt NUMERIC(15, 2) := 0.00;
    v_max_credit_limit NUMERIC(15, 2) := 0.00;
    v_savings_balance NUMERIC(15, 2) := 0.00;
    v_new_debt NUMERIC(15, 2) := 0.00;
    v_new_savings NUMERIC(15, 2) := 0.00;
    v_calculated_total NUMERIC(15, 2) := 0.00;
    v_final_amount NUMERIC(15, 2) := 0.00;
    v_discount NUMERIC(15, 2) := 0.00;
    v_transaction_id UUID;
    v_invoice_number VARCHAR(60);
    v_item JSONB;
    v_prod_id UUID;
    v_prod_name VARCHAR(200);
    v_prod_stock NUMERIC(12, 3);
    v_prod_unit VARCHAR(30);
    v_item_qty NUMERIC(12, 3);
    v_item_price NUMERIC(15, 2);
    v_item_subtotal NUMERIC(15, 2);
    v_item_price_type VARCHAR(20);
    v_now TIMESTAMPTZ := timezone('utc', now());
    v_date_str VARCHAR(10);
    v_rand_seq INT;
BEGIN
    -- 1. Validasi keranjang item tidak kosong
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Keranjang belanja tidak boleh kosong.';
    END IF;

    -- 2. Validasi nominal non-negatif
    IF COALESCE(p_cash_amount, 0) < 0 OR COALESCE(p_savings_amount, 0) < 0 OR
       COALESCE(p_debt_amount, 0) < 0 OR COALESCE(p_discount_amount, 0) < 0 THEN
        RAISE EXCEPTION 'Nominal pembayaran dan diskon tidak boleh bernilai negatif.';
    END IF;

    -- 3. Row locking dan validasi pelanggan (Walk-in vs Member)
    IF p_customer_id IS NULL THEN
        -- Tamu/Walk-in tidak boleh menggunakan kasbon atau tabungan
        IF COALESCE(p_debt_amount, 0) > 0 THEN
            RAISE EXCEPTION 'Pelanggan non-member/umum tidak diperkenankan kasbon.';
        END IF;
        IF COALESCE(p_savings_amount, 0) > 0 THEN
            RAISE EXCEPTION 'Pelanggan non-member/umum tidak memiliki akun tabungan.';
        END IF;
    ELSE
        -- Kunci baris pelanggan dengan FOR UPDATE untuk mencegah race condition
        SELECT name, current_debt, max_credit_limit, savings_balance
        INTO v_customer_name, v_current_debt, v_max_credit_limit, v_savings_balance
        FROM customers
        WHERE id = p_customer_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Data pelanggan dengan ID % tidak ditemukan.', p_customer_id;
        END IF;

        -- Validasi Plafon Kredit Kasbon (Hard Block)
        IF COALESCE(p_debt_amount, 0) > 0 THEN
            IF (v_current_debt + p_debt_amount) > v_max_credit_limit THEN
                RAISE EXCEPTION 'Kasbon ditolak: Total kasbon akan menjadi Rp %, melebihi batas limit kredit pelanggan (%) sebesar Rp % (Utang saat ini: Rp %, Tambahan kasbon: Rp %). Sisa plafon: Rp %.',
                    (v_current_debt + p_debt_amount),
                    v_customer_name,
                    v_max_credit_limit,
                    v_current_debt,
                    p_debt_amount,
                    GREATEST(0, v_max_credit_limit - v_current_debt);
            END IF;
        END IF;

        -- Validasi Kecukupan Saldo Tabungan
        IF COALESCE(p_savings_amount, 0) > 0 THEN
            IF p_savings_amount > v_savings_balance THEN
                RAISE EXCEPTION 'Pembayaran tabungan ditolak: Saldo tabungan % (Rp %) tidak mencukupi untuk pembayaran sebesar Rp %.',
                    v_customer_name,
                    v_savings_balance,
                    p_savings_amount;
            END IF;
        END IF;
    END IF;

    -- 4. Hitung subtotal dan periksa stok produk (dengan row locking FOR UPDATE)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_prod_id := (v_item->>'product_id')::UUID;
        v_item_qty := (v_item->>'quantity')::NUMERIC(12, 3);
        v_item_price := (v_item->>'unit_price')::NUMERIC(15, 2);

        IF v_item_qty <= 0 THEN
            RAISE EXCEPTION 'Kuantitas produk harus lebih besar dari 0.';
        END IF;
        IF v_item_price <= 0 THEN
            RAISE EXCEPTION 'Harga satuan produk harus lebih besar dari 0.';
        END IF;

        -- Kunci baris produk
        SELECT name, stock_quantity, unit
        INTO v_prod_name, v_prod_stock, v_prod_unit
        FROM products
        WHERE id = v_prod_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Produk dengan ID % tidak ditemukan.', v_prod_id;
        END IF;

        IF v_prod_stock < v_item_qty THEN
            RAISE EXCEPTION 'Stok produk "%" tidak mencukupi (Tersedia: % %, Diminta: % %).',
                v_prod_name, v_prod_stock, v_prod_unit, v_item_qty, v_prod_unit;
        END IF;

        v_item_subtotal := v_item_qty * v_item_price;
        v_calculated_total := v_calculated_total + v_item_subtotal;
    END LOOP;

    -- 5. Clamping diskon dan hitung total akhir
    v_discount := LEAST(v_calculated_total, COALESCE(p_discount_amount, 0));
    v_final_amount := GREATEST(0.00, v_calculated_total - v_discount);

    -- 6. Validasi split payment balance persis
    IF ABS((COALESCE(p_cash_amount, 0) + COALESCE(p_savings_amount, 0) + COALESCE(p_debt_amount, 0)) - v_final_amount) > 0.01 THEN
        RAISE EXCEPTION 'Pembayaran tidak seimbang! Total akhir: Rp %, Jumlah dibayar: Rp % (Tunai: Rp %, Tabungan: Rp %, Kasbon: Rp %).',
            v_final_amount,
            (COALESCE(p_cash_amount, 0) + COALESCE(p_savings_amount, 0) + COALESCE(p_debt_amount, 0)),
            COALESCE(p_cash_amount, 0),
            COALESCE(p_savings_amount, 0),
            COALESCE(p_debt_amount, 0);
    END IF;

    -- 7. Generate nomor nota
    v_date_str := to_char(v_now, 'YYYYMMDD');
    v_rand_seq := FLOOR(1000 + random() * 9000)::INT;
    v_invoice_number := 'INV-' || v_date_str || '-' || v_rand_seq::TEXT;
    v_transaction_id := gen_random_uuid();

    -- 8. Insert header transaksi
    INSERT INTO transactions (
        id,
        invoice_number,
        customer_id,
        total_amount,
        discount_amount,
        final_amount,
        payment_method,
        cash_amount,
        savings_amount,
        debt_amount,
        status,
        notes,
        created_at,
        updated_at
    ) VALUES (
        v_transaction_id,
        v_invoice_number,
        p_customer_id,
        v_calculated_total,
        v_discount,
        v_final_amount,
        p_payment_method,
        COALESCE(p_cash_amount, 0),
        COALESCE(p_savings_amount, 0),
        COALESCE(p_debt_amount, 0),
        'completed',
        p_notes,
        v_now,
        v_now
    );

    -- 9. Insert item transaksi & potong stok produk
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_prod_id := (v_item->>'product_id')::UUID;
        v_item_qty := (v_item->>'quantity')::NUMERIC(12, 3);
        v_item_price := (v_item->>'unit_price')::NUMERIC(15, 2);
        v_item_price_type := COALESCE(v_item->>'price_type', 'retail');
        v_item_subtotal := v_item_qty * v_item_price;

        INSERT INTO transaction_items (
            id,
            transaction_id,
            product_id,
            quantity,
            unit_price,
            price_type,
            subtotal,
            created_at
        ) VALUES (
            gen_random_uuid(),
            v_transaction_id,
            v_prod_id,
            v_item_qty,
            v_item_price,
            v_item_price_type,
            v_item_subtotal,
            v_now
        );

        UPDATE products
        SET stock_quantity = stock_quantity - v_item_qty,
            updated_at = v_now
        WHERE id = v_prod_id;
    END LOOP;

    -- 10. Update saldo pelanggan & catat Double-Entry Ledger
    IF p_customer_id IS NOT NULL THEN
        -- Mutasi Tabungan
        IF COALESCE(p_savings_amount, 0) > 0 THEN
            v_new_savings := v_savings_balance - p_savings_amount;
            UPDATE customers
            SET savings_balance = v_new_savings,
                updated_at = v_now
            WHERE id = p_customer_id;

            INSERT INTO savings_ledger (
                id,
                customer_id,
                mutation_type,
                amount,
                balance_before,
                balance_after,
                reference_id,
                notes,
                created_at
            ) VALUES (
                gen_random_uuid(),
                p_customer_id,
                'payment',
                p_savings_amount,
                v_savings_balance,
                v_new_savings,
                v_transaction_id,
                'Pembayaran transaksi kasir No. ' || v_invoice_number,
                v_now
            );
        END IF;

        -- Mutasi Kasbon
        IF COALESCE(p_debt_amount, 0) > 0 THEN
            v_new_debt := v_current_debt + p_debt_amount;
            UPDATE customers
            SET current_debt = v_new_debt,
                updated_at = v_now
            WHERE id = p_customer_id;

            INSERT INTO debt_ledger (
                id,
                customer_id,
                entry_type,
                amount,
                debt_before,
                debt_after,
                reference_id,
                due_date,
                notes,
                created_at
            ) VALUES (
                gen_random_uuid(),
                p_customer_id,
                'charge',
                p_debt_amount,
                v_current_debt,
                v_new_debt,
                v_transaction_id,
                v_now + INTERVAL '14 days',
                'Kasbon transaksi kasir No. ' || v_invoice_number,
                v_now
            );
        END IF;
    END IF;

    -- Return ringkasan transaksi
    RETURN jsonb_build_object(
        'id', v_transaction_id,
        'invoice_number', v_invoice_number,
        'customer_id', p_customer_id,
        'total_amount', v_calculated_total,
        'discount_amount', v_discount,
        'final_amount', v_final_amount,
        'payment_method', p_payment_method,
        'cash_amount', COALESCE(p_cash_amount, 0),
        'savings_amount', COALESCE(p_savings_amount, 0),
        'debt_amount', COALESCE(p_debt_amount, 0),
        'status', 'completed',
        'created_at', v_now
    );
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- RPC: record_savings_mutation (Manual Top-up / Withdrawal)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION record_savings_mutation(
    p_customer_id UUID,
    p_mutation_type VARCHAR(20),
    p_amount NUMERIC(15, 2),
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_balance_before NUMERIC(15, 2);
    v_balance_after NUMERIC(15, 2);
    v_mutation_id UUID := gen_random_uuid();
    v_now TIMESTAMPTZ := timezone('utc', now());
    v_cust_name VARCHAR(150);
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Nominal mutasi tabungan harus lebih besar dari 0.';
    END IF;

    IF p_mutation_type NOT IN ('deposit', 'withdrawal') THEN
        RAISE EXCEPTION 'Tipe mutasi manual harus berupa deposit atau withdrawal.';
    END IF;

    SELECT name, savings_balance INTO v_cust_name, v_balance_before
    FROM customers
    WHERE id = p_customer_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pelanggan dengan ID % tidak ditemukan.', p_customer_id;
    END IF;

    IF p_mutation_type = 'withdrawal' AND p_amount > v_balance_before THEN
        RAISE EXCEPTION 'Penarikan ditolak: Saldo tabungan % saat ini (Rp %) tidak mencukupi untuk penarikan sebesar Rp %.',
            v_cust_name, v_balance_before, p_amount;
    END IF;

    IF p_mutation_type = 'deposit' THEN
        v_balance_after := v_balance_before + p_amount;
    ELSE
        v_balance_after := v_balance_before - p_amount;
    END IF;

    UPDATE customers
    SET savings_balance = v_balance_after,
        updated_at = v_now
    WHERE id = p_customer_id;

    INSERT INTO savings_ledger (
        id,
        customer_id,
        mutation_type,
        amount,
        balance_before,
        balance_after,
        notes,
        created_at
    ) VALUES (
        v_mutation_id,
        p_customer_id,
        p_mutation_type,
        p_amount,
        v_balance_before,
        v_balance_after,
        p_notes,
        v_now
    );

    RETURN jsonb_build_object(
        'id', v_mutation_id,
        'customer_id', p_customer_id,
        'mutation_type', p_mutation_type,
        'amount', p_amount,
        'balance_before', v_balance_before,
        'balance_after', v_balance_after,
        'notes', p_notes,
        'created_at', v_now
    );
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- RPC: record_debt_payment (Cicilan Pelunasan Kasbon)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION record_debt_payment(
    p_customer_id UUID,
    p_payment_amount NUMERIC(15, 2),
    p_transaction_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_debt_before NUMERIC(15, 2);
    v_debt_after NUMERIC(15, 2);
    v_payment_id UUID := gen_random_uuid();
    v_now TIMESTAMPTZ := timezone('utc', now());
    v_cust_name VARCHAR(150);
BEGIN
    IF p_payment_amount <= 0 THEN
        RAISE EXCEPTION 'Nominal pembayaran cicilan harus lebih besar dari 0.';
    END IF;

    SELECT name, current_debt INTO v_cust_name, v_debt_before
    FROM customers
    WHERE id = p_customer_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pelanggan dengan ID % tidak ditemukan.', p_customer_id;
    END IF;

    IF p_payment_amount > v_debt_before THEN
        RAISE EXCEPTION 'Jumlah pelunasan (Rp %) melebihi total kasbon pelanggan % (Rp %).',
            p_payment_amount, v_cust_name, v_debt_before;
    END IF;

    v_debt_after := v_debt_before - p_payment_amount;

    UPDATE customers
    SET current_debt = v_debt_after,
        updated_at = v_now
    WHERE id = p_customer_id;

    INSERT INTO debt_ledger (
        id,
        customer_id,
        entry_type,
        amount,
        debt_before,
        debt_after,
        reference_id,
        notes,
        created_at
    ) VALUES (
        v_payment_id,
        p_customer_id,
        'payment',
        p_payment_amount,
        v_debt_before,
        v_debt_after,
        p_transaction_id,
        p_notes,
        v_now
    );

    RETURN jsonb_build_object(
        'id', v_payment_id,
        'customer_id', p_customer_id,
        'payment_amount', p_payment_amount,
        'debt_before', v_debt_before,
        'debt_after', v_debt_after,
        'notes', p_notes,
        'created_at', v_now
    );
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- ANALYTICS & DASHBOARD RPC
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_store_financial_summary()
RETURNS TABLE (
    today_sales NUMERIC(15, 2),
    month_sales NUMERIC(15, 2),
    total_active_debt NUMERIC(15, 2),
    total_savings_deposits NUMERIC(15, 2),
    active_debtors_count BIGINT,
    total_customers BIGINT,
    total_low_stock_items BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE((SELECT SUM(final_amount) FROM transactions WHERE status = 'completed' AND created_at >= date_trunc('day', timezone('utc', now()))), 0.00) AS today_sales,
        COALESCE((SELECT SUM(final_amount) FROM transactions WHERE status = 'completed' AND created_at >= date_trunc('month', timezone('utc', now()))), 0.00) AS month_sales,
        COALESCE((SELECT SUM(current_debt) FROM customers WHERE is_active = true), 0.00) AS total_active_debt,
        COALESCE((SELECT SUM(savings_balance) FROM customers WHERE is_active = true), 0.00) AS total_savings_deposits,
        COALESCE((SELECT COUNT(*) FROM customers WHERE current_debt > 0 AND is_active = true), 0) AS active_debtors_count,
        COALESCE((SELECT COUNT(*) FROM customers WHERE is_active = true), 0) AS total_customers,
        COALESCE((SELECT COUNT(*) FROM products WHERE stock_quantity <= min_stock_alert AND is_active = true), 0) AS total_low_stock_items;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SUPABASE ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- RLS diaktifkan pada seluruh tabel. Karena aplikasi ini merupakan sistem POS & CRM
-- toko sembako yang dioperasikan kasir dan staf toko terautentikasi (atau via
-- service role di server Route Handlers Next.js), kebijakan mengizinkan akses penuh
-- kepada kredensial service role / authenticated store context.
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store staff access store_settings" ON store_settings;
CREATE POLICY "Store staff access store_settings" ON store_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Store staff access customers" ON customers;
CREATE POLICY "Store staff access customers" ON customers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Store staff access products" ON products;
CREATE POLICY "Store staff access products" ON products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Store staff access transactions" ON transactions;
CREATE POLICY "Store staff access transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Store staff access transaction_items" ON transaction_items;
CREATE POLICY "Store staff access transaction_items" ON transaction_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Store staff access savings_ledger" ON savings_ledger;
CREATE POLICY "Store staff access savings_ledger" ON savings_ledger FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Store staff access debt_ledger" ON debt_ledger;
CREATE POLICY "Store staff access debt_ledger" ON debt_ledger FOR ALL USING (true) WITH CHECK (true);
