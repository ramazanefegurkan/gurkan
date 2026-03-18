# S04: Gider & Fatura Takibi — UAT

**Milestone:** M001
**Written:** 2026-03-18

## UAT Type

- UAT mode: live-runtime
- Why this mode is sufficient: Expense and bill CRUD are data-entry workflows that require real API calls and database writes. Integration tests cover the contract, but the UI flows (form submission, badge display, mark-paid status transitions) must be verified in a running browser against the real backend.

## Preconditions

- PostgreSQL running on port 5434 (Docker container)
- Backend running: `cd GurkanApi && dotnet run` (serves on localhost:5039)
- Frontend running: `cd gurkan-ui && npm run dev` (serves on localhost:5173)
- A user account exists and is logged in
- At least one property exists and is accessible to the logged-in user's group

## Smoke Test

Navigate to an existing property → click "Giderler" tab → page loads with either expense list or "Henüz gider kaydı yok" empty state. If this works, backend API, auth, group access, and frontend routing are all functional.

## Test Cases

### 1. Expense CRUD — Create

1. Navigate to a property detail page
2. Click "Giderler" tab
3. Click "+ Yeni Gider" button
4. Fill: Kategori = "Bakım", Açıklama = "Boya badana", Tutar = 5000, Para Birimi = TRY, Tarih = today
5. Leave "Tekrarlayan Gider" unchecked
6. Click "Kaydet"
7. **Expected:** Redirected to expense list. New expense appears in table with: blue "Bakım" category badge, "Boya badana" description, "₺5.000" amount, today's date, "Hayır" in recurring column. Summary card shows TOPLAM GİDER = ₺5.000 and KAYIT = 1.

### 2. Expense CRUD — Edit

1. From the expense list (after test 1), click the edit icon on the "Boya badana" expense
2. Change Tutar to 7500
3. Change Kategori to "Tamir"
4. Click "Kaydet"
5. **Expected:** Redirected to list. Expense now shows orange "Tamir" badge and "₺7.500" amount. Summary card updated.

### 3. Expense CRUD — Delete

1. From the expense list, click the delete icon on the edited expense
2. Confirm the deletion dialog
3. **Expected:** Expense removed from table. Empty state message "Henüz gider kaydı yok" appears if it was the only expense. Summary card resets to 0.

### 4. Recurring Expense

1. Click "+ Yeni Gider"
2. Fill: Kategori = "Yönetim", Açıklama = "Yönetim ücreti", Tutar = 1000, Para Birimi = TRY, Tarih = today
3. Check "Tekrarlayan Gider" checkbox
4. **Expected:** Recurrence interval dropdown appears
5. Select "Aylık" from the interval dropdown
6. Click "Kaydet"
7. **Expected:** Expense appears in list with "Evet" in recurring column and green "Yönetim" category badge.

### 5. Bill CRUD — Create

1. Click "Faturalar" tab
2. Click "+ Yeni Fatura" button
3. Fill: Tür = "Elektrik", Tutar = 350, Para Birimi = TRY, Son Ödeme Tarihi = a future date (e.g., 2026-04-15)
4. Click "Kaydet"
5. **Expected:** Redirected to bill list. New bill appears with: electric bill type badge, "₺350" amount, future due date, "Bekliyor" status badge (yellow), and an "Ödendi" action button visible.

### 6. Bill — Mark as Paid

1. From the bill list (after test 5), click the "Ödendi" button on the electric bill
2. **Expected:** Status badge changes from "Bekliyor" (yellow) to "Ödendi" (green). Paid date column shows today's date (2026-03-18). "Ödendi" button disappears for this bill. Summary card BEKLEYEN count decrements by 1.

### 7. Bill CRUD — Edit

1. Click the edit icon on the paid electric bill
2. Change Tutar to 400
3. Click "Kaydet"
4. **Expected:** Bill amount updated to "₺400" in the list. Status remains "Ödendi".

### 8. Bill CRUD — Delete

1. Click the delete icon on the bill
2. Confirm the deletion dialog
3. **Expected:** Bill removed from table. Empty state or updated list shown.

### 9. Multi-currency Expense

1. Click "Giderler" tab → "+ Yeni Gider"
2. Fill: Kategori = "Sigorta", Açıklama = "Deprem sigortası", Tutar = 500, Para Birimi = USD, Tarih = today
3. Click "Kaydet"
4. **Expected:** Expense shows "$500" (or equivalent USD format) in the amount column, purple "Sigorta" badge.

### 10. Multi-currency Bill

1. Click "Faturalar" tab → "+ Yeni Fatura"
2. Fill: Tür = "Internet", Tutar = 50, Para Birimi = EUR, Son Ödeme Tarihi = future date
3. Click "Kaydet"
4. **Expected:** Bill shows "€50" (or equivalent EUR format) in the amount column, internet bill type badge.

## Edge Cases

### Cross-group Access Denial

1. Log in as a user who is NOT in the property's group
2. Attempt to navigate to that property's expenses URL directly (e.g., /properties/{otherId}/expenses)
3. **Expected:** API returns 403 forbidden. Page shows error or redirects — no expense data from the other group is visible.

### Empty State Display

1. Navigate to a property that has zero expenses and zero bills
2. Click "Giderler" tab
3. **Expected:** "Henüz gider kaydı yok" message displayed, summary card shows 0 totals
4. Click "Faturalar" tab
5. **Expected:** "Henüz fatura kaydı yok" message displayed, summary card shows 0 totals

### Bill with Past Due Date

1. Create a bill with a due date in the past (e.g., 2026-01-01)
2. Do NOT mark it as paid
3. **Expected:** Bill appears with "Gecikmiş" (red) status badge if the backend/frontend handles overdue detection, or "Bekliyor" if overdue detection is purely manual.

## Failure Signals

- 403 or 401 errors in browser console when accessing expense/bill endpoints → auth or group access broken
- Expense/bill list shows empty when records exist → API client URL or port mismatch
- Category/type/status badges show raw enum values instead of Turkish labels → type mapping broken (check K011)
- Date validation errors (500) when saving → toUtcIso() helper not applied (check K012)
- "Ödendi" button doesn't change status → markBillPaid API function or PATCH endpoint broken
- Summary card totals don't update after CRUD → list refetch not triggered after mutation

## Requirements Proved By This UAT

- R008 — Expense CRUD with categories, recurring support, multi-currency (tests 1-4, 9)
- R009 — Bill CRUD with types, due date tracking, payment status, mark-as-paid (tests 5-8, 10)
- R014 — Multi-currency support on expenses and bills (tests 9, 10)

## Not Proven By This UAT

- Overdue auto-detection (no background job transitions Pending → Overdue)
- Recurring expense auto-generation (IsRecurring is informational only)
- Dashboard integration of expense/bill totals (S06 scope)
- Notification generation for approaching due dates (S06 scope)
- Pagination under large datasets

## Notes for Tester

- The backend serves on port **5039** (not 5000) — if nothing loads, check the port.
- Currency symbols (₺, $, €) display depends on locale formatting in the frontend — verify the amount column shows a reasonable format for each currency.
- The "Ödendi" button should only appear on bills with Pending or Overdue status — once paid, it disappears.
- PropertyLayout now has 5 tabs: Detaylar, Kiracılar, Kısa Dönem, Giderler, Faturalar. All should be visible and navigable.
- If you see "NaN" in amount fields, the API may be returning amounts as strings — this would indicate a DTO mapping issue.
