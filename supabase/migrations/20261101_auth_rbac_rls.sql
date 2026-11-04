-- ============================================================================
-- MIGRATION: AUTHENTICATION, RBAC (OWNER/CASHIER), STRICT RLS & AUDIT LOG
-- Target Path: supabase/migrations/20261101_auth_rbac_rls.sql
-- Safe to execute against existing populated databases (Non-destructive).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PROFILES TABLE (Linked with auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'CASHIER',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),

    CONSTRAINT chk_profile_role CHECK (role IN ('OWNER', 'CASHIER'))
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON public.profiles(is_active);

-- ----------------------------------------------------------------------------
-- 2. CASHIER ATTRIBUTION COLUMNS ON TRANSACTIONS & LEDGERS
-- ----------------------------------------------------------------------------
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS cashier_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_cashier ON public.transactions(cashier_id);

ALTER TABLE public.savings_ledger 
ADD COLUMN IF NOT EXISTS cashier_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_savings_ledger_cashier ON public.savings_ledger(cashier_id);

ALTER TABLE public.debt_ledger 
ADD COLUMN IF NOT EXISTS cashier_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_debt_ledger_cashier ON public.debt_ledger(cashier_id);

-- ----------------------------------------------------------------------------
-- 3. AUDIT LOG TABLE (Append-Only, OWNER Read-Only)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action VARCHAR(60) NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);

-- ----------------------------------------------------------------------------
-- 4. SECURITY DEFINER HELPER FUNCTIONS WITH SEARCH_PATH LOCKED
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_role VARCHAR;
BEGIN
    SELECT role INTO v_role
    FROM public.profiles
    WHERE id = auth.uid() AND is_active = true;
    RETURN COALESCE(v_role, 'ANON');
END;
$$;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN false;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_active = true
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    RETURN (public.current_user_role() = 'OWNER');
END;
$$;

CREATE OR REPLACE FUNCTION public.record_audit_log(
    p_action VARCHAR(60),
    p_entity VARCHAR(50),
    p_entity_id VARCHAR(100),
    p_old_value JSONB DEFAULT NULL,
    p_new_value JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_log_id UUID := gen_random_uuid();
    v_actor_id UUID := auth.uid();
BEGIN
    INSERT INTO public.audit_log (
        id,
        actor_id,
        action,
        entity,
        entity_id,
        old_value,
        new_value,
        created_at
    ) VALUES (
        v_log_id,
        v_actor_id,
        p_action,
        p_entity,
        p_entity_id,
        p_old_value,
        p_new_value,
        timezone('utc', now())
    );
    RETURN v_log_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. TRIGGERS: AUTOMATIC PROFILE CREATION & SELF-PROTECTION GUARDS
-- ----------------------------------------------------------------------------
-- Automatic profile creation on auth.users insertion
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_full_name VARCHAR(150);
    v_role VARCHAR(20);
BEGIN
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1)
    );
    
    -- Default lowest privilege (CASHIER) unless explicitly set in admin context
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'CASHIER');
    IF v_role NOT IN ('OWNER', 'CASHIER') THEN
        v_role := 'CASHIER';
    END IF;

    INSERT INTO public.profiles (id, full_name, role, is_active, created_at, updated_at)
    VALUES (NEW.id, v_full_name, v_role, true, timezone('utc', now()), timezone('utc', now()))
    ON CONFLICT (id) DO NOTHING;

    -- Audit user creation
    PERFORM public.record_audit_log(
        'USER_CREATE',
        'user',
        NEW.id::text,
        NULL,
        jsonb_build_object('email', NEW.email, 'full_name', v_full_name, 'role', v_role)
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Prevent self-role elevation and guard last active OWNER
CREATE OR REPLACE FUNCTION public.guard_profile_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_active_owners_count INT;
BEGIN
    -- 1. Users cannot change their own role or active status
    IF v_caller_id = OLD.id AND current_setting('role', true) != 'service_role' THEN
        IF NEW.role != OLD.role THEN
            RAISE EXCEPTION 'Pengguna tidak diizinkan mengubah peran (role) akun miliknya sendiri.';
        END IF;
        IF NEW.is_active != OLD.is_active THEN
            RAISE EXCEPTION 'Pengguna tidak diizinkan menonaktifkan akun miliknya sendiri.';
        END IF;
    END IF;

    -- 2. Guard last active OWNER
    IF OLD.role = 'OWNER' AND (NEW.role != 'OWNER' OR NEW.is_active = false) THEN
        SELECT COUNT(*) INTO v_active_owners_count
        FROM public.profiles
        WHERE role = 'OWNER' AND is_active = true AND id != OLD.id;

        IF v_active_owners_count = 0 THEN
            RAISE EXCEPTION 'Operasi dibatalkan: Toko harus memiliki setidaknya satu OWNER yang aktif.';
        END IF;
    END IF;

    -- 3. Audit role / active status modifications
    IF NEW.role != OLD.role OR NEW.is_active != OLD.is_active THEN
        PERFORM public.record_audit_log(
            CASE 
                WHEN NEW.role != OLD.role THEN 'USER_ROLE_CHANGE'
                ELSE 'USER_STATUS_CHANGE'
            END,
            'user',
            OLD.id::text,
            jsonb_build_object('role', OLD.role, 'is_active', OLD.is_active),
            jsonb_build_object('role', NEW.role, 'is_active', NEW.is_active)
        );
    END IF;

    NEW.updated_at := timezone('utc', now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_updates ON public.profiles;
CREATE TRIGGER trg_guard_profile_updates
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.guard_profile_updates();

-- ----------------------------------------------------------------------------
-- 6. TRIGGERS: SENSITIVE COLUMN RESTRICTIONS & AUTOMATIC AUDIT LOGGING
-- ----------------------------------------------------------------------------
-- Customer sensitive modifications guard (max_credit_limit, customer_type, is_active)
CREATE OR REPLACE FUNCTION public.guard_customer_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- If caller is not OWNER and not service_role, restrict sensitive columns
    IF NOT public.is_owner() AND current_setting('role', true) != 'service_role' THEN
        IF NEW.max_credit_limit != OLD.max_credit_limit THEN
            RAISE EXCEPTION 'Akses ditolak: Hanya Pemilik Toko (OWNER) yang dapat mengubah limit kredit pelanggan.';
        END IF;
        IF NEW.customer_type != OLD.customer_type THEN
            RAISE EXCEPTION 'Akses ditolak: Hanya Pemilik Toko (OWNER) yang dapat mengubah tipe pelanggan.';
        END IF;
        IF NEW.is_active != OLD.is_active THEN
            RAISE EXCEPTION 'Akses ditolak: Hanya Pemilik Toko (OWNER) yang dapat mengaktifkan atau menonaktifkan pelanggan.';
        END IF;
        IF NEW.current_debt != OLD.current_debt THEN
            RAISE EXCEPTION 'Akses ditolak: Perubahan hutang kasbon hanya dapat terjadi melalui transaksi kasir atau cicilan.';
        END IF;
        IF NEW.savings_balance != OLD.savings_balance THEN
            RAISE EXCEPTION 'Akses ditolak: Perubahan saldo tabungan hanya dapat terjadi melalui setoran/tarikan resmi.';
        END IF;
    END IF;

    -- Audit credit limit adjustments by OWNER
    IF NEW.max_credit_limit != OLD.max_credit_limit THEN
        PERFORM public.record_audit_log(
            'UPDATE_CREDIT_LIMIT',
            'customer',
            OLD.id::text,
            jsonb_build_object('max_credit_limit', OLD.max_credit_limit),
            jsonb_build_object('max_credit_limit', NEW.max_credit_limit, 'customer_name', OLD.name)
        );
    END IF;

    -- Audit customer type adjustments
    IF NEW.customer_type != OLD.customer_type THEN
        PERFORM public.record_audit_log(
            'UPDATE_CUSTOMER_TYPE',
            'customer',
            OLD.id::text,
            jsonb_build_object('customer_type', OLD.customer_type),
            jsonb_build_object('customer_type', NEW.customer_type, 'customer_name', OLD.name)
        );
    END IF;

    -- Audit customer active status changes
    IF NEW.is_active != OLD.is_active THEN
        PERFORM public.record_audit_log(
            'UPDATE_CUSTOMER_STATUS',
            'customer',
            OLD.id::text,
            jsonb_build_object('is_active', OLD.is_active),
            jsonb_build_object('is_active', NEW.is_active, 'customer_name', OLD.name)
        );
    END IF;

    NEW.updated_at := timezone('utc', now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_customer_updates ON public.customers;
CREATE TRIGGER trg_guard_customer_updates
    BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.guard_customer_updates();

-- Product sensitive modifications guard (prices, sku, category)
CREATE OR REPLACE FUNCTION public.guard_product_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- If caller is not OWNER and not service_role
    IF NOT public.is_owner() AND current_setting('role', true) != 'service_role' THEN
        IF NEW.retail_price != OLD.retail_price OR NEW.wholesale_price != OLD.wholesale_price OR
           NEW.name != OLD.name OR NEW.sku != OLD.sku OR NEW.category != OLD.category OR NEW.unit != OLD.unit THEN
            RAISE EXCEPTION 'Akses ditolak: Hanya Pemilik Toko (OWNER) yang dapat mengubah harga atau data produk.';
        END IF;
    END IF;

    -- Audit price changes
    IF NEW.retail_price != OLD.retail_price OR NEW.wholesale_price != OLD.wholesale_price THEN
        PERFORM public.record_audit_log(
            'UPDATE_PRODUCT_PRICE',
            'product',
            OLD.id::text,
            jsonb_build_object('retail_price', OLD.retail_price, 'wholesale_price', OLD.wholesale_price),
            jsonb_build_object('retail_price', NEW.retail_price, 'wholesale_price', NEW.wholesale_price, 'product_name', OLD.name)
        );
    END IF;

    NEW.updated_at := timezone('utc', now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_product_updates ON public.products;
CREATE TRIGGER trg_guard_product_updates
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.guard_product_updates();

-- ----------------------------------------------------------------------------
-- 7. REVISED STORED PROCEDURES (RPCs) WITH AUTH & CASHIER CONTEXT
-- ----------------------------------------------------------------------------
-- execute_checkout
CREATE OR REPLACE FUNCTION public.execute_checkout(
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
    v_cashier_id UUID := auth.uid();
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
    -- 0. Validasi Pengguna Aktif
    IF NOT public.is_active_user() AND current_setting('role', true) != 'service_role' THEN
        RAISE EXCEPTION 'Akses ditolak: Pengguna tidak aktif atau sesi login tidak valid.';
    END IF;

    -- 1. Validasi keranjang belanja
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Keranjang belanja tidak boleh kosong.';
    END IF;

    -- 2. Validasi nominal non-negatif
    IF COALESCE(p_cash_amount, 0) < 0 OR COALESCE(p_savings_amount, 0) < 0 OR
       COALESCE(p_debt_amount, 0) < 0 OR COALESCE(p_discount_amount, 0) < 0 THEN
        RAISE EXCEPTION 'Nominal pembayaran dan diskon tidak boleh bernilai negatif.';
    END IF;

    -- 3. Row locking dan validasi pelanggan (Walk-in vs Terdaftar)
    IF p_customer_id IS NULL THEN
        IF COALESCE(p_debt_amount, 0) > 0 THEN
            RAISE EXCEPTION 'Pelanggan non-member/umum tidak diperkenankan kasbon.';
        END IF;
        IF COALESCE(p_savings_amount, 0) > 0 THEN
            RAISE EXCEPTION 'Pelanggan non-member/umum tidak memiliki akun tabungan.';
        END IF;
    ELSE
        SELECT name, current_debt, max_credit_limit, savings_balance
        INTO v_customer_name, v_current_debt, v_max_credit_limit, v_savings_balance
        FROM public.customers
        WHERE id = p_customer_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Data pelanggan dengan ID % tidak ditemukan.', p_customer_id;
        END IF;

        -- Hard Block Limit Kasbon
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

        -- Validasi Saldo Tabungan
        IF COALESCE(p_savings_amount, 0) > 0 THEN
            IF p_savings_amount > v_savings_balance THEN
                RAISE EXCEPTION 'Pembayaran tabungan ditolak: Saldo tabungan % (Rp %) tidak mencukupi untuk pembayaran sebesar Rp %.',
                    v_customer_name,
                    v_savings_balance,
                    p_savings_amount;
            END IF;
        END IF;
    END IF;

    -- 4. Hitung subtotal dan periksa ketersediaan stok
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

        SELECT name, stock_quantity, unit
        INTO v_prod_name, v_prod_stock, v_prod_unit
        FROM public.products
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

    -- 5. Clamping diskon
    v_discount := LEAST(v_calculated_total, COALESCE(p_discount_amount, 0));
    v_final_amount := GREATEST(0.00, v_calculated_total - v_discount);

    -- 6. Validasi split payment seimbang
    IF ABS((COALESCE(p_cash_amount, 0) + COALESCE(p_savings_amount, 0) + COALESCE(p_debt_amount, 0)) - v_final_amount) > 0.01 THEN
        RAISE EXCEPTION 'Pembayaran tidak seimbang! Total akhir: Rp %, Jumlah dibayar: Rp % (Tunai: Rp %, Tabungan: Rp %, Kasbon: Rp %).',
            v_final_amount,
            (COALESCE(p_cash_amount, 0) + COALESCE(p_savings_amount, 0) + COALESCE(p_debt_amount, 0)),
            COALESCE(p_cash_amount, 0),
            COALESCE(p_savings_amount, 0),
            COALESCE(p_debt_amount, 0);
    END IF;

    -- 7. Generate invoice & IDs
    v_date_str := to_char(v_now, 'YYYYMMDD');
    v_rand_seq := FLOOR(1000 + random() * 9000)::INT;
    v_invoice_number := 'INV-' || v_date_str || '-' || v_rand_seq::TEXT;
    v_transaction_id := gen_random_uuid();

    -- 8. Insert header transaksi dengan cashier_id
    INSERT INTO public.transactions (
        id,
        invoice_number,
        customer_id,
        cashier_id,
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
        v_cashier_id,
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

    -- 9. Insert item & potong stok
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_prod_id := (v_item->>'product_id')::UUID;
        v_item_qty := (v_item->>'quantity')::NUMERIC(12, 3);
        v_item_price := (v_item->>'unit_price')::NUMERIC(15, 2);
        v_item_price_type := COALESCE(v_item->>'price_type', 'retail');
        v_item_subtotal := v_item_qty * v_item_price;

        INSERT INTO public.transaction_items (
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

        UPDATE public.products
        SET stock_quantity = stock_quantity - v_item_qty,
            updated_at = v_now
        WHERE id = v_prod_id;
    END LOOP;

    -- 10. Update saldo pelanggan & catat Double-Entry Ledger dengan cashier_id
    IF p_customer_id IS NOT NULL THEN
        IF COALESCE(p_savings_amount, 0) > 0 THEN
            v_new_savings := v_savings_balance - p_savings_amount;
            UPDATE public.customers
            SET savings_balance = v_new_savings,
                updated_at = v_now
            WHERE id = p_customer_id;

            INSERT INTO public.savings_ledger (
                id,
                customer_id,
                cashier_id,
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
                v_cashier_id,
                'payment',
                p_savings_amount,
                v_savings_balance,
                v_new_savings,
                v_transaction_id,
                'Pembayaran transaksi kasir No. ' || v_invoice_number,
                v_now
            );
        END IF;

        IF COALESCE(p_debt_amount, 0) > 0 THEN
            v_new_debt := v_current_debt + p_debt_amount;
            UPDATE public.customers
            SET current_debt = v_new_debt,
                updated_at = v_now
            WHERE id = p_customer_id;

            INSERT INTO public.debt_ledger (
                id,
                customer_id,
                cashier_id,
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
                v_cashier_id,
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

    RETURN jsonb_build_object(
        'id', v_transaction_id,
        'invoice_number', v_invoice_number,
        'customer_id', p_customer_id,
        'cashier_id', v_cashier_id,
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

-- record_savings_mutation
CREATE OR REPLACE FUNCTION public.record_savings_mutation(
    p_customer_id UUID,
    p_mutation_type VARCHAR(20),
    p_amount NUMERIC(15, 2),
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_cashier_id UUID := auth.uid();
    v_balance_before NUMERIC(15, 2);
    v_balance_after NUMERIC(15, 2);
    v_mutation_id UUID := gen_random_uuid();
    v_now TIMESTAMPTZ := timezone('utc', now());
    v_cust_name VARCHAR(150);
BEGIN
    IF NOT public.is_active_user() AND current_setting('role', true) != 'service_role' THEN
        RAISE EXCEPTION 'Akses ditolak: Pengguna tidak aktif atau sesi login tidak valid.';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Nominal mutasi tabungan harus lebih besar dari 0.';
    END IF;

    IF p_mutation_type NOT IN ('deposit', 'withdrawal') THEN
        RAISE EXCEPTION 'Tipe mutasi manual harus berupa deposit atau withdrawal.';
    END IF;

    -- Strict Role Check: Withdrawal is ONLY permitted by OWNER
    IF p_mutation_type = 'withdrawal' AND NOT public.is_owner() AND current_setting('role', true) != 'service_role' THEN
        RAISE EXCEPTION 'Akses ditolak: Penarikan saldo tabungan hanya dapat dilakukan oleh Pemilik Toko (OWNER).';
    END IF;

    SELECT name, savings_balance INTO v_cust_name, v_balance_before
    FROM public.customers
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

    UPDATE public.customers
    SET savings_balance = v_balance_after,
        updated_at = v_now
    WHERE id = p_customer_id;

    INSERT INTO public.savings_ledger (
        id,
        customer_id,
        cashier_id,
        mutation_type,
        amount,
        balance_before,
        balance_after,
        notes,
        created_at
    ) VALUES (
        v_mutation_id,
        p_customer_id,
        v_cashier_id,
        p_mutation_type,
        p_amount,
        v_balance_before,
        v_balance_after,
        p_notes,
        v_now
    );

    -- Audit log for withdrawal
    IF p_mutation_type = 'withdrawal' THEN
        PERFORM public.record_audit_log(
            'SAVINGS_WITHDRAWAL',
            'savings',
            v_mutation_id::text,
            jsonb_build_object('balance_before', v_balance_before),
            jsonb_build_object('amount', p_amount, 'balance_after', v_balance_after, 'customer_id', p_customer_id, 'customer_name', v_cust_name)
        );
    END IF;

    RETURN jsonb_build_object(
        'id', v_mutation_id,
        'customer_id', p_customer_id,
        'cashier_id', v_cashier_id,
        'mutation_type', p_mutation_type,
        'amount', p_amount,
        'balance_before', v_balance_before,
        'balance_after', v_balance_after,
        'notes', p_notes,
        'created_at', v_now
    );
END;
$$ LANGUAGE plpgsql;

-- record_debt_payment
CREATE OR REPLACE FUNCTION public.record_debt_payment(
    p_customer_id UUID,
    p_payment_amount NUMERIC(15, 2),
    p_transaction_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_cashier_id UUID := auth.uid();
    v_debt_before NUMERIC(15, 2);
    v_debt_after NUMERIC(15, 2);
    v_payment_id UUID := gen_random_uuid();
    v_now TIMESTAMPTZ := timezone('utc', now());
    v_cust_name VARCHAR(150);
BEGIN
    IF NOT public.is_active_user() AND current_setting('role', true) != 'service_role' THEN
        RAISE EXCEPTION 'Akses ditolak: Pengguna tidak aktif atau sesi login tidak valid.';
    END IF;

    IF p_payment_amount <= 0 THEN
        RAISE EXCEPTION 'Nominal pembayaran cicilan harus lebih besar dari 0.';
    END IF;

    SELECT name, current_debt INTO v_cust_name, v_debt_before
    FROM public.customers
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

    UPDATE public.customers
    SET current_debt = v_debt_after,
        updated_at = v_now
    WHERE id = p_customer_id;

    INSERT INTO public.debt_ledger (
        id,
        customer_id,
        cashier_id,
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
        v_cashier_id,
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
        'cashier_id', v_cashier_id,
        'payment_amount', p_payment_amount,
        'debt_before', v_debt_before,
        'debt_after', v_debt_after,
        'notes', p_notes,
        'created_at', v_now
    );
END;
$$ LANGUAGE plpgsql;

-- get_store_financial_summary (OWNER Only)
CREATE OR REPLACE FUNCTION public.get_store_financial_summary()
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
    IF NOT public.is_owner() AND current_setting('role', true) != 'service_role' THEN
        RAISE EXCEPTION 'Akses ditolak: Ringkasan finansial toko hanya dapat diakses oleh Pemilik Toko (OWNER).';
    END IF;

    RETURN QUERY
    SELECT
        COALESCE((SELECT SUM(final_amount) FROM public.transactions WHERE status = 'completed' AND created_at >= date_trunc('day', timezone('utc', now()))), 0.00) AS today_sales,
        COALESCE((SELECT SUM(final_amount) FROM public.transactions WHERE status = 'completed' AND created_at >= date_trunc('month', timezone('utc', now()))), 0.00) AS month_sales,
        COALESCE((SELECT SUM(current_debt) FROM public.customers WHERE is_active = true), 0.00) AS total_active_debt,
        COALESCE((SELECT SUM(savings_balance) FROM public.customers WHERE is_active = true), 0.00) AS total_savings_deposits,
        COALESCE((SELECT COUNT(*) FROM public.customers WHERE current_debt > 0 AND is_active = true), 0) AS active_debtors_count,
        COALESCE((SELECT COUNT(*) FROM public.customers WHERE is_active = true), 0) AS total_customers,
        COALESCE((SELECT COUNT(*) FROM public.products WHERE stock_quantity <= min_stock_alert AND is_active = true), 0) AS total_low_stock_items;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 8. STRICT ROW-LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
-- Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Revoke default public/anon permissions
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, public;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, public;

-- Grant authenticated baseline
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Drop obsolete open policies
DROP POLICY IF EXISTS "Store staff access store_settings" ON public.store_settings;
DROP POLICY IF EXISTS "Store staff access customers" ON public.customers;
DROP POLICY IF EXISTS "Store staff access products" ON public.products;
DROP POLICY IF EXISTS "Store staff access transactions" ON public.transactions;
DROP POLICY IF EXISTS "Store staff access transaction_items" ON public.transaction_items;
DROP POLICY IF EXISTS "Store staff access savings_ledger" ON public.savings_ledger;
DROP POLICY IF EXISTS "Store staff access debt_ledger" ON public.debt_ledger;

-- --- PROFILES POLICIES ---
DROP POLICY IF EXISTS "profiles_select_active" ON public.profiles;
CREATE POLICY "profiles_select_active" ON public.profiles
    FOR SELECT TO authenticated
    USING (public.is_active_user());

DROP POLICY IF EXISTS "profiles_update_owner" ON public.profiles;
CREATE POLICY "profiles_update_owner" ON public.profiles
    FOR UPDATE TO authenticated
    USING (public.is_owner())
    WITH CHECK (public.is_owner());

-- --- AUDIT LOG POLICIES (Append-only, OWNER read-only) ---
DROP POLICY IF EXISTS "audit_log_select_owner" ON public.audit_log;
CREATE POLICY "audit_log_select_owner" ON public.audit_log
    FOR SELECT TO authenticated
    USING (public.is_owner());

DROP POLICY IF EXISTS "audit_log_insert_active" ON public.audit_log;
CREATE POLICY "audit_log_insert_active" ON public.audit_log
    FOR INSERT TO authenticated
    WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "audit_log_no_update" ON public.audit_log;
CREATE POLICY "audit_log_no_update" ON public.audit_log
    FOR UPDATE TO authenticated
    USING (false);

DROP POLICY IF EXISTS "audit_log_no_delete" ON public.audit_log;
CREATE POLICY "audit_log_no_delete" ON public.audit_log
    FOR DELETE TO authenticated
    USING (false);

-- --- CUSTOMERS POLICIES ---
DROP POLICY IF EXISTS "customers_select_active" ON public.customers;
CREATE POLICY "customers_select_active" ON public.customers
    FOR SELECT TO authenticated
    USING (public.is_active_user());

DROP POLICY IF EXISTS "customers_insert_active" ON public.customers;
CREATE POLICY "customers_insert_active" ON public.customers
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_active_user() AND
        (
            public.is_owner() OR
            (max_credit_limit = 0.00 AND customer_type = 'Eceran')
        )
    );

DROP POLICY IF EXISTS "customers_update_active" ON public.customers;
CREATE POLICY "customers_update_active" ON public.customers
    FOR UPDATE TO authenticated
    USING (public.is_active_user())
    WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "customers_no_delete" ON public.customers;
CREATE POLICY "customers_no_delete" ON public.customers
    FOR DELETE TO authenticated
    USING (false);

-- --- PRODUCTS POLICIES ---
DROP POLICY IF EXISTS "products_select_active" ON public.products;
CREATE POLICY "products_select_active" ON public.products
    FOR SELECT TO authenticated
    USING (public.is_active_user());

DROP POLICY IF EXISTS "products_insert_owner" ON public.products;
CREATE POLICY "products_insert_owner" ON public.products
    FOR INSERT TO authenticated
    WITH CHECK (public.is_owner());

DROP POLICY IF EXISTS "products_update_owner" ON public.products;
CREATE POLICY "products_update_owner" ON public.products
    FOR UPDATE TO authenticated
    USING (public.is_owner())
    WITH CHECK (public.is_owner());

DROP POLICY IF EXISTS "products_no_delete" ON public.products;
CREATE POLICY "products_no_delete" ON public.products
    FOR DELETE TO authenticated
    USING (false);

-- --- TRANSACTIONS & ITEMS POLICIES (Append-only by RPC/staff) ---
DROP POLICY IF EXISTS "transactions_select_active" ON public.transactions;
CREATE POLICY "transactions_select_active" ON public.transactions
    FOR SELECT TO authenticated
    USING (public.is_active_user());

DROP POLICY IF EXISTS "transactions_insert_active" ON public.transactions;
CREATE POLICY "transactions_insert_active" ON public.transactions
    FOR INSERT TO authenticated
    WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "transactions_no_update" ON public.transactions;
CREATE POLICY "transactions_no_update" ON public.transactions
    FOR UPDATE TO authenticated
    USING (false);

DROP POLICY IF EXISTS "transactions_no_delete" ON public.transactions;
CREATE POLICY "transactions_no_delete" ON public.transactions
    FOR DELETE TO authenticated
    USING (false);

DROP POLICY IF EXISTS "items_select_active" ON public.transaction_items;
CREATE POLICY "items_select_active" ON public.transaction_items
    FOR SELECT TO authenticated
    USING (public.is_active_user());

DROP POLICY IF EXISTS "items_insert_active" ON public.transaction_items;
CREATE POLICY "items_insert_active" ON public.transaction_items
    FOR INSERT TO authenticated
    WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "items_no_update" ON public.transaction_items;
CREATE POLICY "items_no_update" ON public.transaction_items
    FOR UPDATE TO authenticated
    USING (false);

DROP POLICY IF EXISTS "items_no_delete" ON public.transaction_items;
CREATE POLICY "items_no_delete" ON public.transaction_items
    FOR DELETE TO authenticated
    USING (false);

-- --- SAVINGS & DEBT LEDGERS POLICIES (Strictly Append-Only) ---
DROP POLICY IF EXISTS "savings_select_active" ON public.savings_ledger;
CREATE POLICY "savings_select_active" ON public.savings_ledger
    FOR SELECT TO authenticated
    USING (public.is_active_user());

DROP POLICY IF EXISTS "savings_insert_active" ON public.savings_ledger;
CREATE POLICY "savings_insert_active" ON public.savings_ledger
    FOR INSERT TO authenticated
    WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "savings_no_update" ON public.savings_ledger;
CREATE POLICY "savings_no_update" ON public.savings_ledger
    FOR UPDATE TO authenticated
    USING (false);

DROP POLICY IF EXISTS "savings_no_delete" ON public.savings_ledger;
CREATE POLICY "savings_no_delete" ON public.savings_ledger
    FOR DELETE TO authenticated
    USING (false);

DROP POLICY IF EXISTS "debt_select_active" ON public.debt_ledger;
CREATE POLICY "debt_select_active" ON public.debt_ledger
    FOR SELECT TO authenticated
    USING (public.is_active_user());

DROP POLICY IF EXISTS "debt_insert_active" ON public.debt_ledger;
CREATE POLICY "debt_insert_active" ON public.debt_ledger
    FOR INSERT TO authenticated
    WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS "debt_no_update" ON public.debt_ledger;
CREATE POLICY "debt_no_update" ON public.debt_ledger
    FOR UPDATE TO authenticated
    USING (false);

DROP POLICY IF EXISTS "debt_no_delete" ON public.debt_ledger;
CREATE POLICY "debt_no_delete" ON public.debt_ledger
    FOR DELETE TO authenticated
    USING (false);

-- --- STORE SETTINGS POLICIES ---
DROP POLICY IF EXISTS "settings_select_active" ON public.store_settings;
CREATE POLICY "settings_select_active" ON public.store_settings
    FOR SELECT TO authenticated
    USING (public.is_active_user());

DROP POLICY IF EXISTS "settings_update_owner" ON public.store_settings;
CREATE POLICY "settings_update_owner" ON public.store_settings
    FOR UPDATE TO authenticated
    USING (public.is_owner())
    WITH CHECK (public.is_owner());
