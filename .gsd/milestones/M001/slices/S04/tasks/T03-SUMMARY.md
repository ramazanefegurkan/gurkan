---
id: T03
parent: S04
milestone: M001
provides:
  - Full expense management UI (list with category badges, summary card, create/edit form with recurring toggle)
  - Full bill management UI (list with status badges, "Ödendi" action button, create/edit form)
  - Category badge CSS classes (.category-badge--maintenance, --repair, --tax, --insurance, --management, --other)
  - Bill type badge CSS classes (.bill-type-badge--water, --electric, --gas, --internet, --dues)
  - Bill status badge --overdue CSS class
key_files:
  - gurkan-ui/src/pages/Expenses/ExpenseList.tsx
  - gurkan-ui/src/pages/Expenses/ExpenseForm.tsx
  - gurkan-ui/src/pages/Expenses/Expenses.css
  - gurkan-ui/src/pages/Bills/BillList.tsx
  - gurkan-ui/src/pages/Bills/BillForm.tsx
  - gurkan-ui/src/pages/Bills/Bills.css
key_decisions:
  - Fixed API client baseURL from port 5000 to 5039 to match actual backend launchSettings.json
patterns_established:
  - Expense/bill list pages follow ShortTermRentalList pattern exactly (summary card, data-table, empty state, delete confirmation)
  - Expense/bill form pages follow ShortTermRentalForm pattern (dual-mode create/edit, toUtcIso on dates, back-link navigation)
  - Category and bill-type badges use separate CSS class families (.category-badge--, .bill-type-badge--) alongside existing .status-badge-- for payment status
observability_surfaces:
  - Browser DevTools Network tab shows XHR requests to /api/properties/{id}/expenses and /api/properties/{id}/bills
  - Summary cards display TOPLAM GİDER/FATURA totals and BEKLEYEN count
  - Status badges (.status-badge--pending, --paid, --overdue) indicate bill payment state visually
  - Empty states show "Henüz gider/fatura kaydı yok" confirming zero records
duration: 18m
verification_result: passed
completed_at: 2026-03-18T19:55:00+03:00
blocker_discovered: false
---

# T03: Build expense and bill frontend pages with browser verification

**Built 4 React pages (ExpenseList, ExpenseForm, BillList, BillForm) with 2 CSS files, all CRUD flows verified in browser including mark-bill-paid status transition**

## What Happened

Replaced four T02 placeholder components with full implementations following the ShortTermRentalList/Form pattern. Created Expenses.css with category badge styles (6 color variants: maintenance=blue, repair=orange, tax=amber, insurance=purple, management=green, other=grey) and Bills.css with bill type badges (5 variants) plus a `.btn-pay` button style and `.status-badge--overdue` override.

ExpenseList renders a data table with columns: Tarih, Kategori (badge), Açıklama, Tutar (₺/$/€), Tekrarlayan (Evet/Hayır), İşlemler (edit/delete). Includes summary card showing total expense and record count. ExpenseForm supports create/edit dual mode with category dropdown, date (toUtcIso), amount, currency, recurring checkbox that conditionally reveals recurrence interval selector.

BillList renders a data table with columns: Tür (type badge), Tutar, Son Ödeme, Ödeme Tarihi, Durum (status badge), İşlemler (pay/edit/delete). The "Ödendi" button appears only for Pending/Overdue bills, calls `markBillPaid`, and refreshes the row in-place. BillForm is a simpler create/edit form with type dropdown, amount, currency, due date, and notes.

Fixed a pre-existing API client port mismatch: `client.ts` pointed to `localhost:5000` but the backend serves on `localhost:5039` per launchSettings.json.

App.tsx routes were already fully wired by T02 — no changes needed.

## Verification

- **Browser Expense CRUD**: Created expense (Bakım, ₺500, 15 Mar 2026) → verified in table with category badge → edited amount to ₺750 → verified update → deleted with confirmation dialog → verified empty state
- **Browser Bill CRUD**: Created bill (Elektrik, ₺200, due 15 Nis 2026) → verified "Bekliyor" status badge → clicked "Ödendi" → verified status changed to "Ödendi" (green) with paid date "18 Mar 2026" and Ödendi button disappeared → edited amount to ₺250 → deleted with confirmation → verified empty state
- **Status badge assertions**: `.status-badge--paid` selector visible after mark-paid, "Ödendi" text confirmed, paid date "18 Mar 2026" confirmed
- **TypeScript build**: `npm run build` passes cleanly (0 errors, 99 modules)
- **S04 tests**: `dotnet test --filter "Category=S04"` → 8/8 pass
- **Full regression**: `dotnet test GurkanApi.Tests/` → 53/53 pass

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd gurkan-ui && npm run build` | 0 | ✅ pass | 3s |
| 2 | `dotnet test GurkanApi.Tests/ --filter "Category=S04"` | 0 | ✅ pass | 4s |
| 3 | `dotnet test GurkanApi.Tests/` | 0 | ✅ pass | 15s |
| 4 | Browser: Expense add → edit → delete | — | ✅ pass | manual |
| 5 | Browser: Bill add → mark paid → edit → delete | — | ✅ pass | manual |
| 6 | Browser: Status badge assertions (paid, pending) | — | ✅ pass | browser_assert |

## Diagnostics

- **Tab presence:** Navigate to any `/properties/:id` route — 5 tabs render in `<nav class="property-tabs">` (Detaylar, Kiracılar, Kısa Dönem, Giderler, Faturalar)
- **Expense list:** Navigate to `/properties/:id/expenses` — shows data table or "Henüz gider kaydı yok" empty state. Summary card shows TOPLAM GİDER and KAYIT counts.
- **Bill list:** Navigate to `/properties/:id/bills` — shows data table with status badges (Bekliyor=yellow, Ödendi=green, Gecikmiş=red) and "Ödendi" action button for unpaid bills. Summary card shows TOPLAM FATURA, BEKLEYEN, KAYIT.
- **API wiring:** DevTools → Network tab — CRUD operations issue XHR to `/api/properties/{id}/expenses` and `/api/properties/{id}/bills`. Mark-paid issues PATCH to `.../bills/{id}/pay`.
- **Type correctness:** `npm run build` fails if frontend types diverge from backend DTO shapes.

## Deviations

- Fixed API client `baseURL` port from 5000 to 5039 — prior tasks had this wrong but may have tested differently. The `launchSettings.json` clearly specifies port 5039.

## Known Issues

None.

## Files Created/Modified

- `gurkan-ui/src/pages/Expenses/Expenses.css` — category badge styles, recurring indicator, expense summary, form checkbox row
- `gurkan-ui/src/pages/Expenses/ExpenseList.tsx` — table-based expense list with category badges, summary card, delete confirmation
- `gurkan-ui/src/pages/Expenses/ExpenseForm.tsx` — create/edit form with category, date, amount, currency, recurring toggle, notes
- `gurkan-ui/src/pages/Bills/Bills.css` — bill type badges, status badge overdue, pay button, bill summary
- `gurkan-ui/src/pages/Bills/BillList.tsx` — table-based bill list with status badges, "Ödendi" action, delete confirmation
- `gurkan-ui/src/pages/Bills/BillForm.tsx` — create/edit form with bill type, due date, amount, currency, notes
- `gurkan-ui/src/api/client.ts` — fixed baseURL port from 5000 to 5039
- `.gsd/milestones/M001/slices/S04/tasks/T03-PLAN.md` — added Observability Impact section
