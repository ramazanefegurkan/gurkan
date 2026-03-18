---
estimated_steps: 6
estimated_files: 7
---

# T03: Build expense and bill frontend pages with browser verification

**Slice:** S04 — Gider & Fatura Takibi
**Milestone:** M001

## Description

Build the four user-facing React pages (ExpenseList, ExpenseForm, BillList, BillForm) with CSS, then browser-verify all CRUD flows. These follow the exact patterns from ShortTermRentalList and ShortTermRentalForm — table-based lists with action buttons, dual-mode create/edit forms with dropdowns. The bill list adds a "Ödendi" action button and status badges. Ensure App.tsx route imports are active (uncomment if T02 left them commented).

**Relevant skill:** Load `frontend-design` skill for UI patterns.

## Steps

1. **Ensure App.tsx routes are wired:**
   - If T02 left route imports commented or used placeholders, update `gurkan-ui/src/App.tsx` to import the real page components and uncomment the routes:
     ```
     import ExpenseList from './pages/Expenses/ExpenseList';
     import ExpenseForm from './pages/Expenses/ExpenseForm';
     import BillList from './pages/Bills/BillList';
     import BillForm from './pages/Bills/BillForm';
     ```
   - Ensure routes are active inside the PropertyLayout `<Route>` block.

2. **Create `gurkan-ui/src/pages/Expenses/Expenses.css`:**
   - Minimal styles — reuse `.data-table`, `.section-header`, `.status-badge` from existing Tenants.css/Properties.css
   - Add expense-specific category badge styles: `.category-badge` with color variants per category (e.g., Maintenance=blue, Tax=orange, Insurance=purple)

3. **Create `gurkan-ui/src/pages/Expenses/ExpenseList.tsx`:**
   - Follow ShortTermRentalList pattern exactly
   - `useParams<{ id: string }>()` to get propertyId
   - Fetch expenses via `getExpenses(id!)` in useEffect
   - Table columns: Tarih (date), Kategori (category badge with Turkish label), Açıklama (description), Tutar (amount + currency symbol), Tekrarlayan (recurring yes/no), İşlemler (edit/delete buttons)
   - Section header with title "Giderler" and "Yeni Gider" link button → `expenses/new`
   - Delete with window.confirm confirmation
   - `formatDate` helper (copy from ShortTermRentalList)
   - `formatCurrency` helper: show ₺ / $ / € prefix based on currency value
   - Import Expenses.css and reuse existing Properties.css and Tenants.css

4. **Create `gurkan-ui/src/pages/Expenses/ExpenseForm.tsx`:**
   - Follow ShortTermRentalForm pattern: dual-mode create/edit
   - `useParams<{ id: string; expenseId?: string }>()` — if expenseId exists, edit mode (fetch existing)
   - Form fields:
     - Category: `<select>` dropdown with ExpenseCategoryLabels
     - Description: `<input type="text">` (required)
     - Amount: `<input type="number" step="0.01">` (required)
     - Currency: `<select>` with Currency values (TRY/USD/EUR) — default to TRY
     - Date: `<input type="date">` (required)
     - IsRecurring: `<input type="checkbox">`
     - RecurrenceInterval: `<select>` (Monthly/Quarterly/Yearly) — shown only if IsRecurring is checked
     - Notes: `<textarea>` (optional)
   - On submit: call `createExpense` or `updateExpense`, then navigate to expense list
   - **CRITICAL:** Use `toUtcIso()` on the Date field before submission (K012). Copy the helper from TenantForm.tsx or ShortTermRentalForm.tsx.

5. **Create `gurkan-ui/src/pages/Bills/Bills.css` and `BillList.tsx`:**
   - Bills.css: minimal, reuse existing classes. Add status-specific badge styles if not already covered:
     - `.status-badge--pending` (yellow), `.status-badge--paid` (green), `.status-badge--overdue` (red) — check if these already exist in Tenants.css, reuse if so
   - BillList.tsx: Follow ShortTermRentalList pattern
   - Table columns: Tür (bill type with Turkish label), Tutar (amount + currency), Son Ödeme (due date), Ödeme Tarihi (paid date or "—"), Durum (status badge), İşlemler (edit/delete/pay buttons)
   - "Ödendi" button: visible only when status is Pending or Overdue. Calls `markBillPaid(propertyId, billId)`, then refreshes the list.
   - Section header: "Faturalar" title + "Yeni Fatura" link button → `bills/new`
   - Delete with confirmation

6. **Create `gurkan-ui/src/pages/Bills/BillForm.tsx`:**
   - Dual-mode create/edit following ExpenseForm pattern
   - Form fields:
     - Type: `<select>` dropdown with BillTypeLabels
     - Amount: `<input type="number" step="0.01">`
     - Currency: `<select>` (TRY/USD/EUR)
     - DueDate: `<input type="date">` — use `toUtcIso()` (K012)
     - Notes: `<textarea>` (optional)
   - Note: Status and PaidDate are NOT editable in the form — Status starts as "Pending" on create, PaidDate is set via the "Ödendi" action in the list
   - On submit: call `createBill` or `updateBill`, navigate to bill list

7. **Browser verification:**
   - Start backend: `cd GurkanApi && dotnet run` (or use existing)
   - Start frontend: `cd gurkan-ui && npm run dev`
   - Login as admin → navigate to a property → verify "Giderler" and "Faturalar" tabs appear
   - Giderler tab: click "Yeni Gider" → fill form (category=Bakım, amount=500, currency=TRY, date, description) → submit → verify appears in list → click edit → change amount → save → verify updated → delete → verify removed
   - Faturalar tab: click "Yeni Fatura" → fill form (type=Elektrik, amount=200, currency=TRY, due date) → submit → verify appears with "Bekliyor" status → click "Ödendi" → verify status changes to "Ödendi" and paid date appears → add another bill → edit → delete
   - Final: `npm run build` to confirm TypeScript still compiles

## Must-Haves

- [ ] ExpenseList with table, category badges, Turkish labels, delete confirmation
- [ ] ExpenseForm with create/edit modes, all fields, toUtcIso() on dates, recurring toggle
- [ ] BillList with table, status badges, "Ödendi" action button, Turkish labels
- [ ] BillForm with create/edit modes, type dropdown, toUtcIso() on dates
- [ ] All CRUD flows work in browser (add, edit, delete expense; add, edit, delete, pay bill)
- [ ] `npm run build` passes with zero errors

## Verification

- Browser: full CRUD cycle for expenses (add → edit → delete)
- Browser: full CRUD cycle for bills (add → mark paid → edit → delete)
- Browser: status badge colors correct (Bekliyor=yellow, Ödendi=green, Gecikmiş=red)
- `cd gurkan-ui && npm run build` — TypeScript compiles clean

## Inputs

- `gurkan-ui/src/types/index.ts` — T02 added expense/bill types and label objects
- `gurkan-ui/src/api/client.ts` — T02 added API functions
- `gurkan-ui/src/App.tsx` — T02 added routes (may need uncommenting)
- `gurkan-ui/src/pages/Properties/PropertyLayout.tsx` — T02 added tabs
- `gurkan-ui/src/pages/ShortTermRentals/ShortTermRentalList.tsx` — pattern to follow for list pages
- `gurkan-ui/src/pages/ShortTermRentals/ShortTermRentalForm.tsx` — pattern to follow for form pages (includes `toUtcIso()` helper)
- `gurkan-ui/src/pages/Tenants/Tenants.css` — reusable CSS classes (.data-table, .status-badge, .section-header)

## Expected Output

- `gurkan-ui/src/pages/Expenses/ExpenseList.tsx` — table-based expense list with category badges
- `gurkan-ui/src/pages/Expenses/ExpenseForm.tsx` — create/edit form with recurring toggle
- `gurkan-ui/src/pages/Expenses/Expenses.css` — minimal expense-specific styles
- `gurkan-ui/src/pages/Bills/BillList.tsx` — table-based bill list with status badges and pay action
- `gurkan-ui/src/pages/Bills/BillForm.tsx` — create/edit form
- `gurkan-ui/src/pages/Bills/Bills.css` — minimal bill-specific styles
- `gurkan-ui/src/App.tsx` — route imports active (if T02 left placeholders)
