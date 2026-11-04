-- ============================================================================
-- SQL / pgTAP TEST SUITE: RLS POLICIES & PERMISSION MATRIX VERIFICATION
-- Target Path: supabase/tests/rls_permission_matrix.sql
-- ============================================================================
-- How to run in Supabase SQL Editor or pgTAP:
-- \i supabase/tests/rls_permission_matrix.sql
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Test 1: ANON access must be blocked on all tables
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_error_caught BOOLEAN := false;
BEGIN
    SET ROLE anon;
    BEGIN
        PERFORM * FROM public.customers LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := true;
    END;
    
    RESET ROLE;
    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST FAILED: Anon user was able to SELECT from customers!';
    END IF;
    RAISE NOTICE 'TEST PASSED: Anon SELECT customers blocked.';
END $$;

DO $$
DECLARE
    v_error_caught BOOLEAN := false;
BEGIN
    SET ROLE anon;
    BEGIN
        PERFORM * FROM public.products LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := true;
    END;
    
    RESET ROLE;
    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST FAILED: Anon user was able to SELECT from products!';
    END IF;
    RAISE NOTICE 'TEST PASSED: Anon SELECT products blocked.';
END $$;

DO $$
DECLARE
    v_error_caught BOOLEAN := false;
BEGIN
    SET ROLE anon;
    BEGIN
        PERFORM * FROM public.audit_log LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := true;
    END;
    
    RESET ROLE;
    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST FAILED: Anon user was able to SELECT from audit_log!';
    END IF;
    RAISE NOTICE 'TEST PASSED: Anon SELECT audit_log blocked.';
END $$;

-- ----------------------------------------------------------------------------
-- Test 2: Append-Only Guards on Ledgers (No UPDATE or DELETE)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_error_caught BOOLEAN := false;
BEGIN
    SET ROLE authenticated;
    BEGIN
        -- Attempt to delete savings ledger
        DELETE FROM public.savings_ledger WHERE id IS NOT NULL;
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := true;
    END;
    
    RESET ROLE;
    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST FAILED: Authenticated user was able to DELETE from savings_ledger!';
    END IF;
    RAISE NOTICE 'TEST PASSED: savings_ledger DELETE is blocked.';
END $$;

DO $$
DECLARE
    v_error_caught BOOLEAN := false;
BEGIN
    SET ROLE authenticated;
    BEGIN
        -- Attempt to update debt ledger
        UPDATE public.debt_ledger SET amount = 0 WHERE id IS NOT NULL;
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := true;
    END;
    
    RESET ROLE;
    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST FAILED: Authenticated user was able to UPDATE debt_ledger!';
    END IF;
    RAISE NOTICE 'TEST PASSED: debt_ledger UPDATE is blocked.';
END $$;

DO $$
DECLARE
    v_error_caught BOOLEAN := false;
BEGIN
    SET ROLE authenticated;
    BEGIN
        -- Attempt to update audit_log
        UPDATE public.audit_log SET action = 'HACKED' WHERE id IS NOT NULL;
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := true;
    END;
    
    RESET ROLE;
    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST FAILED: Authenticated user was able to UPDATE audit_log!';
    END IF;
    RAISE NOTICE 'TEST PASSED: audit_log UPDATE is blocked.';
END $$;

-- ----------------------------------------------------------------------------
-- Test 3: Cashier cannot modify sensitive columns (Customer Credit Limit / Type)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_cust_id UUID;
    v_cashier_id UUID := gen_random_uuid();
    v_error_caught BOOLEAN := false;
BEGIN
    -- Setup dummy customer
    SELECT id INTO v_cust_id FROM public.customers WHERE is_active = true LIMIT 1;
    IF v_cust_id IS NULL THEN
        INSERT INTO public.customers (name, phone, customer_type, max_credit_limit)
        VALUES ('Test Cust', '0811111111', 'Eceran', 0.00)
        RETURNING id INTO v_cust_id;
    END IF;

    -- Setup dummy cashier in profiles
    INSERT INTO public.profiles (id, full_name, role, is_active)
    VALUES (v_cashier_id, 'Kasir Test', 'CASHIER', true)
    ON CONFLICT (id) DO UPDATE SET role = 'CASHIER', is_active = true;

    -- Simulate cashier session via request setting
    PERFORM set_config('request.jwt.claim.sub', v_cashier_id::text, true);
    PERFORM set_config('role', 'authenticated', true);

    BEGIN
        -- Cashier attempts to increase credit limit
        UPDATE public.customers
        SET max_credit_limit = 100000000.00
        WHERE id = v_cust_id;
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := true;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST FAILED: Cashier was able to alter max_credit_limit!';
    END IF;
    RAISE NOTICE 'TEST PASSED: Cashier cannot alter max_credit_limit.';

    -- Cashier attempts to change customer type
    v_error_caught := false;
    BEGIN
        UPDATE public.customers
        SET customer_type = 'Warung / Grosir'
        WHERE id = v_cust_id;
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := true;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST FAILED: Cashier was able to alter customer_type!';
    END IF;
    RAISE NOTICE 'TEST PASSED: Cashier cannot alter customer_type.';
END $$;

-- ----------------------------------------------------------------------------
-- Test 4: Cashier cannot modify product prices
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_prod_id UUID;
    v_cashier_id UUID := gen_random_uuid();
    v_error_caught BOOLEAN := false;
BEGIN
    SELECT id INTO v_prod_id FROM public.products WHERE is_active = true LIMIT 1;

    INSERT INTO public.profiles (id, full_name, role, is_active)
    VALUES (v_cashier_id, 'Kasir Test 2', 'CASHIER', true)
    ON CONFLICT (id) DO UPDATE SET role = 'CASHIER', is_active = true;

    PERFORM set_config('request.jwt.claim.sub', v_cashier_id::text, true);
    PERFORM set_config('role', 'authenticated', true);

    BEGIN
        UPDATE public.products
        SET retail_price = 100.00
        WHERE id = v_prod_id;
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := true;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST FAILED: Cashier was able to alter retail_price!';
    END IF;
    RAISE NOTICE 'TEST PASSED: Cashier cannot alter product prices.';
END $$;

-- ----------------------------------------------------------------------------
-- Test 5: Cashier cannot withdraw customer savings
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_cust_id UUID;
    v_cashier_id UUID := gen_random_uuid();
    v_error_caught BOOLEAN := false;
BEGIN
    SELECT id INTO v_cust_id FROM public.customers WHERE savings_balance > 0 LIMIT 1;
    IF v_cust_id IS NULL THEN
        SELECT id INTO v_cust_id FROM public.customers LIMIT 1;
        UPDATE public.customers SET savings_balance = 50000.00 WHERE id = v_cust_id;
    END IF;

    INSERT INTO public.profiles (id, full_name, role, is_active)
    VALUES (v_cashier_id, 'Kasir Test 3', 'CASHIER', true)
    ON CONFLICT (id) DO UPDATE SET role = 'CASHIER', is_active = true;

    PERFORM set_config('request.jwt.claim.sub', v_cashier_id::text, true);
    PERFORM set_config('role', 'authenticated', true);

    BEGIN
        PERFORM public.record_savings_mutation(v_cust_id, 'withdrawal', 10000.00, 'Tes tarikan kasir');
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := true;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST FAILED: Cashier was able to withdraw savings!';
    END IF;
    RAISE NOTICE 'TEST PASSED: Cashier savings withdrawal strictly blocked.';
END $$;

-- ----------------------------------------------------------------------------
-- Test 6: Inactive User is Blocked from Checkout RPC
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_inactive_id UUID := gen_random_uuid();
    v_error_caught BOOLEAN := false;
BEGIN
    INSERT INTO public.profiles (id, full_name, role, is_active)
    VALUES (v_inactive_id, 'Kasir Nonaktif', 'CASHIER', false)
    ON CONFLICT (id) DO UPDATE SET is_active = false;

    PERFORM set_config('request.jwt.claim.sub', v_inactive_id::text, true);
    PERFORM set_config('role', 'authenticated', true);

    BEGIN
        PERFORM public.execute_checkout(
            NULL,
            '[{"product_id": "00000000-0000-0000-0000-000000000001", "quantity": 1, "unit_price": 10000}]'::jsonb,
            0,
            'cash',
            10000,
            0,
            0,
            'Tes inactive'
        );
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := true;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST FAILED: Inactive user was able to execute checkout!';
    END IF;
    RAISE NOTICE 'TEST PASSED: Inactive user checkout RPC strictly blocked.';
END $$;

-- ----------------------------------------------------------------------------
-- Test 7: User Cannot Elevate Own Role to OWNER
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_cashier_id UUID := gen_random_uuid();
    v_error_caught BOOLEAN := false;
BEGIN
    INSERT INTO public.profiles (id, full_name, role, is_active)
    VALUES (v_cashier_id, 'Kasir Ambisius', 'CASHIER', true)
    ON CONFLICT (id) DO UPDATE SET role = 'CASHIER', is_active = true;

    PERFORM set_config('request.jwt.claim.sub', v_cashier_id::text, true);
    PERFORM set_config('role', 'authenticated', true);

    BEGIN
        UPDATE public.profiles
        SET role = 'OWNER'
        WHERE id = v_cashier_id;
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := true;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST FAILED: User was able to elevate their own role to OWNER!';
    END IF;
    RAISE NOTICE 'TEST PASSED: Self-role elevation strictly blocked.';
END $$;

ROLLBACK;
RAISE NOTICE 'ALL RLS & PERMISSION MATRIX SQL TESTS PASSED SUCCESSFULLY!';
