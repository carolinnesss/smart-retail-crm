# Review & Adversarial Stress-Test Report — Milestone 5 (R6)
**Agent**: `teamwork_preview_reviewer_m5_2` (Roles: reviewer, critic)  
**Date**: 2026-11-01  
**Target Milestone**: Milestone 5 Centralized CRM & Multi-Ledger Audit Trail Deliverables (R6)

---

## 1. Observation

Direct code inspections and static analysis of the Milestone 5 deliverables were conducted across:
- `src/app/crm/page.tsx` (Customer Directory & Financial Aggregation)
- `src/components/crm/CustomerModal.tsx` (Customer Add/Edit Modal & Tier Configuration)
- `src/app/crm/[id]/page.tsx` (Customer Profile & 3-Tab Multi-Ledger Audit Trail)
- `src/components/crm/SavingsModal.tsx` (Savings Top-up & Withdrawal Modal)
- `src/components/crm/DebtPaymentModal.tsx` (Debt Repayment Modal)
- `src/lib/repository/mock-repo.ts` and `src/lib/repository/supabase-repo.ts`
- `src/app/api/customers/route.ts`, `src/app/api/customers/[id]/route.ts`, `src/app/api/savings/route.ts`, `src/app/api/debt/route.ts`

### Verbatim Code Observations:

1. **Defective Real-Time Customer Search Filter in `src/app/crm/page.tsx` (lines 86-93)**:
```typescript
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesPhone = c.phone.replace(/\D/g, '').includes(q.replace(/\D/g, ''));
        const matchesAddress = c.address ? c.address.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesPhone && !matchesAddress) return false;
      }
```
When `searchQuery` is any text without digits (e.g., `"Siti"`, `"Warung"`, `"Budi"`, `"Pasar"`, or any typo like `"xyz"`), `q.replace(/\D/g, '')` evaluates to `""` (empty string). In JavaScript standard semantics, `c.phone.replace(/\D/g, '').includes("")` evaluates unconditionally to `true` for all strings. Consequently, `matchesPhone` is `true` for 100% of customers, causing `(!matchesName && !matchesPhone && !matchesAddress)` to evaluate to `false`, so zero customers are filtered out. Typing any name into the search box returns every customer in the database.

2. **Incomplete 3-Tab Multi-Ledger Audit Trail in `src/app/crm/[id]/page.tsx` (lines 528-573)**:
The dispatch assignment requires:
> "Tab 3: Riwayat Kasbon & Pembayaran Utang (accruals from kasbon tender, repayments via cash/savings/transfer, remaining debt)."
In `src/app/crm/[id]/page.tsx`:
```tsx
{/* TAB 3: Riwayat Pembayaran Kasbon */}
{activeTab === 'debt' && (
  <div>
    {debtPayments.length === 0 ? (
      ...
    ) : (
      <tbody className="divide-y divide-slate-100">
        {debtPayments.map((p) => (
          <tr key={p.id}>
            <td>{formatDate(p.payment_date || p.created_at)}</td>
            <td>Pelunasan Kasbon</td>
            <td>{formatIDR(p.payment_amount)}</td>
            <td>{p.notes || '-'}</td>
          </tr>
        ))}
      </tbody>
    )}
  </div>
)}
```
Tab 3 renders exclusively records from `debtPayments` (repayments). It does **not** include:
- Kasbon accruals from POS checkout transactions where `tx.debt_amount > 0`.
- The running balance of remaining customer debt following each accrual or repayment.
A storekeeper inspecting Tab 3 cannot see when debt was incurred or the historical evolution of the debt balance.

3. **Missing Product Name in Connected Supabase Transaction Query (`src/lib/repository/supabase-repo.ts` lines 303-326)**:
```typescript
  public async getTransactions(filter?: TransactionFilter): Promise<ITransaction[]> {
    let query = this.client
      .from('transactions')
      .select('*, customers(name), transaction_items(*)')
      .order('created_at', { ascending: false });
...
    return (data || []).map((t: any) => ({
      ...t,
      customer_name: t.customers?.name || (t.customer_id ? 'Pelanggan' : 'Pelanggan Umum (Walk-in)'),
      items: t.transaction_items || [],
    })) as ITransaction[];
  }
```
In `supabase/schema.sql`, `transaction_items` does not have a `product_name` column (it stores `product_id`). Querying `transaction_items(*)` without joining `products(name)` leaves `it.product_name` undefined. In connected Supabase mode, Tab 1 in `src/app/crm/[id]/page.tsx` (line 409: `• <strong>{it.product_name}</strong>`) displays empty product names (`• () (2x @Rp 69.000)`).

4. **Correct Implementation of Customer Tier Toggle & Credit Ceiling**:
In `src/components/crm/CustomerModal.tsx` (lines 168-238), user can toggle customer tier between `'Warung / Grosir'` and `'Eceran'`, and adjust `max_credit_limit`.
In `src/lib/repository/mock-repo.ts` (lines 147-154), credit ceiling reductions below current active debt are safely rejected:
```typescript
    if (
      data.max_credit_limit !== undefined &&
      data.max_credit_limit < current.current_debt
    ) {
      throw new Error(
        `Limit kredit baru (${formatIDR(data.max_credit_limit)}) tidak boleh lebih rendah dari utang aktif saat ini (${formatIDR(current.current_debt)}).`
      );
    }
```
In `supabase/schema.sql`, PostgreSQL constraint `chk_current_debt_within_limit CHECK (current_debt <= max_credit_limit)` provides database-level enforcement.

5. **Correct Implementation of Savings and Debt Action Modals**:
`SavingsModal.tsx` and `DebtPaymentModal.tsx` enforce input positivity, display current balances, compute live estimates, calculate deficits, and offer quick preset buttons. `SavingsModal` strictly prevents overdrafts where `withdrawal > currentBalance`. `DebtPaymentModal` strictly prevents overpayments where `payment_amount > currentDebt`.

---

## 2. Logic Chain

1. **Customer Search Regression**:
   - `searchQuery` is converted to `q = searchQuery.toLowerCase().trim()`.
   - `q.replace(/\D/g, '')` extracts only numeric digits.
   - If the user types a customer name (e.g. `"Siti"`), `q.replace(/\D/g, '')` is `""`.
   - In ECMAScript String.prototype.includes specification, `str.includes("")` returns `true` for any string `str`.
   - Therefore, `c.phone.replace(/\D/g, '').includes("")` is `true`.
   - `matchesPhone` evaluates to `true`.
   - The filtering predicate `if (!matchesName && !matchesPhone && !matchesAddress) return false;` is bypassed because `!matchesPhone` is `false`.
   - Thus, searching for any name or address fails to filter the list. This renders the search box non-functional for alphabetical queries.

2. **Audit Trail Completeness (R6)**:
   - R6 and DISPATCH.md mandate a comprehensive multi-ledger audit trail.
   - For Tab 3, the explicit requirement was: "(accruals from kasbon tender, repayments via cash/savings/transfer, remaining debt)."
   - Tab 3 currently queries only `/api/debt?customer_id=...` which queries the `debt_payments` table.
   - POS transactions that incur debt (`debt_amount > 0`) do not write to `debt_payments`; they increment `customer.current_debt` directly.
   - Because Tab 3 only maps `debtPayments`, all kasbon debt creation events are absent from Tab 3.
   - There is also no running debt balance column in Tab 3.
   - Therefore, Tab 3 is an incomplete ledger.

3. **Integrity Assessment**:
   - Source code, mock repositories, and test suites were scanned for hardcoded shortcuts, facade implementations, or fake test assertions.
   - None were found. The domain logic and repository implementations are genuine and comprehensive.
   - However, the search defect and the Tab 3 audit trail omissions are genuine defects that must be resolved.

---

## 3. Caveats

1. Direct execution of `npm test` was restricted in this turn by system sandbox permissions. Verification was executed via static source analysis, regex pattern inspection, mathematical proofs, and AST trace.
2. In Mock Repository mode, `transaction_items` in memory includes `product_name`, masking Observation 3 during local demo mock evaluation. It manifests only when switching to PostgreSQL Supabase connected mode.
3. Repayment of debt directly from customer savings wallet without first withdrawing cash is not currently supported in `DebtPaymentModal` (it assumes cash/external transfer payment).

---

## 4. Conclusion & Verdict

**Verdict**: **`REQUEST_CHANGES`**

### Findings Summary:

| Finding | Severity | Description | File & Line |
|---|---|---|---|
| Finding 1 | **Critical / Major** | Name & address search in CRM directory is completely broken due to empty string phone matching (`"".includes("") === true`). | `src/app/crm/page.tsx`:89 |
| Finding 2 | **Major** | Tab 3 Multi-Ledger Audit Trail only lists repayments, omitting POS kasbon accruals and running debt balance. | `src/app/crm/[id]/page.tsx`:528-573 |
| Finding 3 | **Minor** | Supabase query for transactions does not join `products(name)`, causing undefined product names in Tab 1 when connected to PostgreSQL. | `src/lib/repository/supabase-repo.ts`:306 |
| Finding 4 | **Minor** | `DebtPaymentModal` lacks option to settle debt directly via customer savings wallet deduction. | `src/components/crm/DebtPaymentModal.tsx`:60 |

### Required Changes Before Approval:
1. **Fix Customer Directory Search Filter in `src/app/crm/page.tsx`**:
   Change line 89 from:
   ```typescript
   const matchesPhone = c.phone.replace(/\D/g, '').includes(q.replace(/\D/g, ''));
   ```
   to:
   ```typescript
   const qDigits = q.replace(/\D/g, '');
   const matchesPhone = qDigits.length > 0 && c.phone.replace(/\D/g, '').includes(qDigits);
   ```
   (And similarly in `src/components/pos/CustomerSelector.tsx` line 53).

2. **Enhance Tab 3 in `src/app/crm/[id]/page.tsx`**:
   Combine debt accruals from transactions (`tx.debt_amount > 0`) with debt repayments (`debtPayments`), or at minimum display both accruals and repayments chronologically with running debt balance.

---

## 5. Verification Method

1. **Verify Search Fix**:
   - Open `/crm`.
   - Type `"Bu Siti"` in the search box -> Only `"Warung Bu Siti"` should remain visible.
   - Type `"Zzzz"` -> Should display `"Tidak ada pelanggan ditemukan"`.
   - Type `"0812"` -> Should match customers with `"0812"` in their phone number.

2. **Verify Tab 3 Multi-Ledger Audit Trail**:
   - Perform a transaction with kasbon tender (e.g., Rp 50.000).
   - Perform a debt repayment (e.g., Rp 25.000).
   - Navigate to `/crm/[id]` Tab 3:
     - Verify both the Kasbon Baru (Rp 50.000) accrual and Pelunasan (Rp 25.000) repayment are clearly audited.
