# S06: Dashboard, Bildirimler & Raporlama — UAT

**Milestone:** M001
**Written:** 2026-03-18

## UAT Type

- UAT mode: mixed (artifact-driven for tests/build + live-runtime for browser verification)
- Why this mode is sufficient: Integration tests prove aggregation logic and access control; browser verification needed for visual layout, export file content, and end-to-end flow

## Preconditions

1. PostgreSQL running on port 5434 (Docker: `docker compose up -d`)
2. Backend running: `cd GurkanApi && dotnet run` (serves on localhost:5039)
3. Frontend running: `cd gurkan-ui && npm run dev` (serves on localhost:5173)
4. At least one superadmin user exists (register via POST /api/auth/register)
5. Test data: at least one group with properties, tenants with rent payments (some overdue), a short-term rental, expenses, bills (one with due date within 7 days), and a tenant with lease ending within 30 days
6. All 77 integration tests pass: `dotnet test GurkanApi.Tests/`

## Smoke Test

Login as superadmin → after login, browser redirects to /dashboard → page shows at least one summary card with income/expense/profit values → "Dashboard" is highlighted in sidebar.

## Test Cases

### 1. Dashboard loads with correct financial summary

1. Login as superadmin
2. Verify browser navigates to `/dashboard` (default route)
3. Observe summary cards section — one card per currency (e.g., TRY card)
4. Each card shows: Toplam Gelir, Toplam Gider, Kâr/Zarar values
5. Verify profit = income - expenses (mental math)
6. **Expected:** Summary cards display non-zero values matching actual property data; profit is green if positive, red if negative

### 2. Per-property breakdown table

1. On the Dashboard page, scroll to the property table below summary cards
2. Verify table has columns: Mülk, Tür, Gelir, Gider, Kâr/Zarar, Ödenmemiş Kira, Yaklaşan Fatura
3. Verify each property row shows financial data
4. **Expected:** All properties the user has access to appear in the table; values are consistent with individual property data

### 3. Dashboard notification banner

1. On Dashboard page, observe the notification banner at the top
2. Verify it shows counts of critical and/or warning notifications
3. Click the banner link
4. **Expected:** Navigates to `/notifications` page

### 4. Notifications — Late Rent alert

1. Navigate to `/notifications` (via sidebar "Bildirimler" or banner link)
2. Look for a notification card with type "Kira Gecikmesi" or similar
3. Verify card has red left border and "Kritik" severity badge
4. Verify message includes tenant name and property name
5. **Expected:** At least one LateRent notification with Critical severity for any tenant with overdue rent (DueDate + 5 days passed)

### 5. Notifications — Upcoming Bill alert

1. On Notifications page, look for a notification about an upcoming bill
2. Verify card has yellow left border and "Uyarı" severity badge
3. **Expected:** UpcomingBill notification present for any bill due within 7 days that isn't paid

### 6. Notifications — Lease Expiry alert

1. On Notifications page, look for a lease expiry notification
2. Verify severity matches the time remaining: ≤30 days = Kritik (red), ≤60 days = Uyarı (yellow), ≤90 days = Bilgi (blue)
3. Verify message mentions the tenant and property
4. **Expected:** LeaseExpiry notification present for any tenant whose lease ends within 90 days

### 7. Notifications — Property link

1. On any notification card, click the property name link
2. **Expected:** Navigates to `/properties/{propertyId}` detail page for the correct property

### 8. Excel export download

1. On Dashboard page, click the "Excel İndir" button
2. Wait for spinner to appear and then disappear
3. Verify a .xlsx file downloads
4. Open the downloaded file in Excel/LibreOffice
5. Verify it contains a "Portföy Raporu" worksheet with per-property rows
6. Verify columns include property name, income, expense, profit, ROI
7. **Expected:** Valid .xlsx file with correct per-property financial data matching dashboard values

### 9. PDF export download

1. On Dashboard page, click the "PDF İndir" button
2. Wait for spinner to appear and then disappear
3. Verify a .pdf file downloads
4. Open the PDF — verify it shows a formatted report with header, currency summaries, per-property breakdown
5. **Expected:** Valid PDF with readable layout, page numbers, and correct financial data

### 10. Group-based access control — Dashboard

1. Login as a regular user who is NOT a superadmin
2. Navigate to /dashboard
3. Verify only properties from the user's group(s) appear
4. Login as superadmin
5. Verify ALL properties appear
6. **Expected:** Non-superadmin sees only their group's properties; superadmin sees everything

### 11. Group-based access control — Notifications

1. Login as a regular user
2. Navigate to /notifications
3. Verify only notifications related to properties in user's group(s) appear
4. **Expected:** No notifications from properties the user doesn't have access to

### 12. Sidebar navigation

1. Verify sidebar shows "Dashboard" link with grid icon (first item)
2. Verify sidebar shows "Bildirimler" link with bell icon
3. Click "Dashboard" — verify navigates to /dashboard
4. Click "Bildirimler" — verify navigates to /notifications
5. Click "Mülkler" — verify navigates to /properties
6. **Expected:** All three sidebar items work, active item is highlighted

### 13. Report year filtering

1. Open Swagger UI (/swagger/index.html)
2. Call GET /api/reports/profit-loss?year=2025
3. Verify response only includes financial data from 2025
4. Call GET /api/reports/profit-loss (no year param)
5. Verify response defaults to current year (2026)
6. **Expected:** Year parameter filters data correctly; default is current year

## Edge Cases

### Empty portfolio

1. Login as a user who belongs to a group with no properties
2. Navigate to /dashboard
3. **Expected:** Dashboard shows empty state — summary cards with zero values, empty property table, no errors

### No notifications

1. Login as a user whose properties have no overdue rent, no upcoming bills, no expiring leases
2. Navigate to /notifications
3. **Expected:** Notifications page shows empty state message, no errors

### Export with no data

1. Login as a user with no properties
2. Click Excel/PDF export buttons on Dashboard
3. **Expected:** Downloads a valid but empty (or header-only) file — no 500 error

### Multiple currencies

1. Ensure at least two properties exist with different currencies (e.g., one TRY, one USD)
2. Navigate to /dashboard
3. **Expected:** Two separate summary cards — one for TRY, one for USD. Values are never mixed across currencies.

## Failure Signals

- Dashboard page shows error banner "Dashboard verileri yüklenirken bir hata oluştu" — API call failed
- Notifications page shows error message — API call failed
- Export button stays in spinner state indefinitely — download failed
- Browser alert on export failure — API returned error
- 401 error in DevTools Network tab — auth token expired or missing
- 403 error — access control misconfigured
- Summary card shows NaN, undefined, or mixed currency values — aggregation bug
- Property table is empty when it shouldn't be — group access filtering issue

## Requirements Proved By This UAT

- R011 — Dashboard shows per-property kâr/zarar, toplam gelir/gider, ödenmemiş kira, yaklaşan fatura (tests 1, 2, 10)
- R012 — In-app bildirimler: kira gecikme, fatura yaklaşma, sözleşme bitiş (tests 4, 5, 6, 11)
- R013 — Excel/PDF export with per-property ROI (tests 8, 9, 13)
- R022 — Lease expiry notification with 30/60/90 day tiers (test 6)
- R024 — Rent increase notification (check notifications page for RentIncreaseApproaching if test data includes an upcoming increase)

## Not Proven By This UAT

- R019 — Email/push notifications (deferred, in-app only)
- R016 — Data import from Excel/Google Sheets (deferred)
- Actual PDF content layout quality (requires human visual inspection of downloaded file)
- QuestPDF rendering on different OS/architectures (tested only on development machine)
- Performance under large datasets (hundreds of properties, thousands of payments)

## Notes for Tester

- **Test data setup is critical.** The dashboard and notifications are only meaningful with realistic data: multiple properties, tenants with overdue payments, bills about to be due, leases about to expire. Without this data, most tests will show empty states.
- **QuestPDF may fail on some systems.** If PDF export returns 500, check the backend console for "QuestPDF native library could not be loaded" — this is the Skia DLL issue (K015). Excel export should always work.
- **Backend must be running on port 5039.** Frontend API client is hardcoded to localhost:5039.
- **Currency display:** Values are shown with the currency code but no symbol. TRY amounts won't show ₺, just "TRY". This is by design per D007.
- **Default route changed:** After login, the app now goes to /dashboard instead of /properties. This is intentional (T04).
