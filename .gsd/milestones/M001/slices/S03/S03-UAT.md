# S03: Kira & Kiracı Takibi — UAT

**Milestone:** M001
**Written:** 2026-03-18

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: All business logic is proven by 13 integration tests and browser-verified CRUD flows. No external integrations or operational concerns — pure CRUD with computed business rules.

## Preconditions

- PostgreSQL running on port 5434 (Docker: `docker-compose up -d`)
- Backend running: `cd GurkanApi && dotnet run` (listens on http://localhost:5039)
- Frontend running: `cd gurkan-ui && npm run dev` (listens on http://localhost:5173)
- At least one user registered (superadmin), one group created, one property assigned to group
- User logged in with valid JWT token

## Smoke Test

Login → navigate to any property → verify three tabs appear (Detaylar / Kiracılar / Kısa Dönem) → click "Kiracılar" → see empty state message or tenant list.

## Test Cases

### 1. Kiracı Oluşturma ve Otomatik Ödeme Oluşturma

1. Navigate to a property's "Kiracılar" tab
2. Click "Yeni Kiracı Ekle"
3. Fill form: Ad Soyad "Ahmet Yılmaz", Telefon "05321234567", Email "ahmet@test.com", TC Kimlik "12345678901", Sözleşme Başlangıç "2026-01-01", Sözleşme Bitiş "2026-06-30", Aylık Kira "5000", Depozito "10000", Para Birimi "TRY"
4. Submit form
5. **Expected:** Redirect to tenant detail page. Tenant info card shows all entered data. Rent payment table shows 6 monthly payment rows (Jan–Jun 2026), each with ₺5,000 amount, "Bekliyor" (Pending) status in yellow badge, and correct due dates on the 1st of each month.

### 2. Ödeme "Ödendi" İşaretleme

1. Open the tenant detail page from Test 1
2. Find a payment row with "Bekliyor" status
3. Click "Ödendi İşaretle" button on that row
4. In the modal, select payment method (e.g., "Banka Transferi") and optionally add notes
5. Confirm payment
6. **Expected:** Payment row status changes to green "Ödendi" badge. PaidDate and PaymentMethod appear in the row. Payment is no longer editable.

### 3. Gecikmiş Ödeme Otomatik Algılama

1. Create a tenant with LeaseStart in the past (e.g., 3 months ago) and LeaseEnd in the future
2. Navigate to tenant detail page
3. Look at payment rows for past months
4. **Expected:** Payments with DueDate more than 5 days in the past that haven't been paid show red "Gecikmiş" (Late) badge. Payments within 5-day tolerance still show yellow "Bekliyor".

### 4. Aktif Kiracı Çakışma Kontrolü

1. Navigate to a property that already has an active tenant
2. Click "Yeni Kiracı Ekle"
3. Fill form with valid data and submit
4. **Expected:** 409 Conflict error message displayed — "Bu mülkte zaten aktif bir kiracı var" or similar. Second tenant is NOT created.

### 5. Sözleşme Sonlandırma

1. Open detail of a tenant with future pending payments
2. Click "Sözleşmeyi Sonlandır" button
3. Confirm in the dialog
4. **Expected:** Tenant marked as inactive. Future Pending payments show gray "İptal" (Cancelled) badge. Past paid payments remain unchanged. Tenant moves to "Geçmiş Kiracılar" section in tenant list.

### 6. Kira Artışı Uygulama

1. Open tenant detail page for an active tenant
2. Navigate to rent increase section
3. Enter new monthly rent amount (e.g., ₺6,000) and effective date (e.g., 2026-04-01)
4. Submit
5. **Expected:** Rent increase record appears in history showing previous amount (₺5,000), new amount (₺6,000), computed increase rate (20%). All future Pending payments from effective date onward show ₺6,000 amount. Past and already-paid payments unchanged.

### 7. Kısa Dönem Kiralama Oluşturma

1. Navigate to property's "Kısa Dönem" tab
2. Click "Yeni Rezervasyon Ekle"
3. Fill form: Misafir Adı "John Smith", Giriş "2026-07-01", Çıkış "2026-07-05", Gecelik Ücret "500", Platform "Airbnb", Platform Komisyonu "300"
4. Submit
5. **Expected:** Rental appears in list. Shows 4 nights, ₺2,000 total, ₺300 commission, ₺1,700 net amount. Platform badge shows "Airbnb".

### 8. Kısa Dönem Tarih Çakışma Kontrolü

1. Create a short-term rental for 2026-07-01 to 2026-07-05 (if not already exists)
2. Try to create another rental for overlapping dates (e.g., 2026-07-03 to 2026-07-07)
3. **Expected:** 409 Conflict error — date overlap rejected. Second rental not created.

### 9. Çapraz Grup Erişim Engeli

1. Login as a user in Group A
2. Try to access (via URL manipulation) a property belonging to Group B
3. Try API calls to `/api/properties/{groupB-property-id}/tenants`
4. **Expected:** 403 Forbidden response. No tenant data visible for properties outside user's groups.

### 10. Geçmiş Kiracılar Arşivi

1. Navigate to tenant list for a property that has both active and terminated tenants
2. **Expected:** Active tenant appears in "Aktif Kiracı" section at top. Terminated tenants appear in "Geçmiş Kiracılar" section below, clearly separated. Both sections show relevant tenant info.

### 11. Multi-Currency Kiracı

1. Create a property with USD currency
2. Add a tenant with MonthlyRent 1000, Currency USD
3. **Expected:** Payments generated in USD ($1,000). Currency symbol shows "$" not "₺". Rent increase also preserves USD currency.

### 12. Tab Navigation Persistence

1. Navigate to a property
2. Click "Kiracılar" tab → verify content loads
3. Click on a tenant detail → verify still inside property context (back link works)
4. Click "Kısa Dönem" tab → verify content loads
5. Click "Detaylar" tab → verify property detail loads
6. **Expected:** Tab navigation is persistent — active tab is highlighted, switching tabs preserves the property context. No full page reloads.

## Edge Cases

### Sözleşme Başlangıç = Bitiş (Sıfır Süreli)

1. Try creating a tenant with LeaseEnd equal to or before LeaseStart
2. **Expected:** 400 validation error — lease end must be after lease start.

### Zaten Ödenmiş Ödemeyi Tekrar Ödeme

1. Mark a payment as paid
2. Try to mark the same payment as paid again
3. **Expected:** 400 error — payment already paid or cancelled.

### Uzun Süreli Sözleşme

1. Create a tenant with a 2-year lease (24 months)
2. **Expected:** 24 monthly payment records generated correctly with incrementing due dates via AddMonths.

## Failure Signals

- Tab navigation breaks or shows blank content after route changes
- Payment status badges show wrong colors or labels
- Payment count doesn't match expected months between LeaseStart and LeaseEnd
- 500 errors on any API call (check browser DevTools Network tab)
- Console JavaScript errors during navigation or form submission
- Date fields causing "DateTimeKind.Unspecified" PostgreSQL errors
- Rent increase not updating future payment amounts
- Terminated tenant's future payments still showing as Pending

## Requirements Proved By This UAT

- R006 — Test cases 1, 2, 3, 5 prove kira ödeme takibi (create, paid, late, cancel)
- R007 — Test cases 7, 8 prove kısa dönem kiralama CRUD and overlap validation
- R014 — Test case 11 proves multi-currency tenant and payment handling
- R015 — Test cases 1, 4, 9, 10 prove kiracı CRUD, active enforcement, access control, archive
- R024 — Test case 6 proves kira artış kaydı and future payment propagation

## Not Proven By This UAT

- R022 — Sözleşme bitiş hatırlatması notification (deferred to S06, only data foundation exists in S03)
- Dashboard aggregation of rental income (S06)
- Bulk payment operations
- Late detection tolerance configurability (hardcoded 5 days)

## Notes for Tester

- Late detection threshold is fixed at 5 days. To test it, create a tenant with a lease starting at least 6 days in the past — the oldest payment should show as "Gecikmiş".
- `toUtcIso()` helper appends `T00:00:00Z` to dates. If date picker returns locale dates, the UTC conversion might shift dates by ±1 day depending on timezone. This is a known pattern — test with Istanbul timezone (UTC+3).
- The PropertyLayout tab pattern is new — pay attention to route transitions between tabs, especially back navigation from nested routes (tenant detail → tenant list → property tabs).
