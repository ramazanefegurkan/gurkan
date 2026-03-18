# S05: Mobil App Full Features — UAT

**Milestone:** M003
**Written:** 2026-03-18

## UAT Type

- UAT mode: live-runtime
- Why this mode is sufficient: Mobile screens must be tested on a real device or emulator (Expo Go) to verify navigation, CRUD operations, API integration, file upload/download, and pull-to-refresh behavior. TypeScript compilation and Android bundle success are verified but don't prove runtime correctness.

## Preconditions

1. Production backend running at the configured API URL (or local backend at `localhost:5039` with Docker Compose up)
2. Expo Go app installed on physical device or Android emulator
3. `cd gurkan-mobile && npx expo start` running and device connected
4. At least one user account exists with login credentials
5. At least one property exists with a few tenants, expenses, bills, and documents already created (seed data or manual creation via web UI)

## Smoke Test

1. Open Expo Go, scan QR code
2. Login with valid credentials
3. Navigate to "Mülkler" tab → tap a property → scroll to "Yönetim" section
4. **Expected:** 5 navigation cards visible: Kiracılar, Kısa Dönem, Giderler, Faturalar, Dökümanlar

## Test Cases

### 1. Property Detail Sub-Page Navigation

1. Login → navigate to Mülkler tab
2. Tap any property card
3. Scroll down to "Yönetim" section
4. Tap each of the 5 navigation cards in order: Kiracılar, Kısa Dönem, Giderler, Faturalar, Dökümanlar
5. **Expected:** Each tap navigates to the corresponding screen with correct title in header. Back button returns to property detail.

### 2. Tenant List — Active/Past Sections

1. From property detail, tap "Kiracılar"
2. **Expected:** Screen loads with two sections: "Aktif Kiracılar" (green badges) and "Geçmiş Kiracılar" (red badges). Each card shows tenant name, monthly rent with currency, and lease dates. Pull-to-refresh works. If no tenants exist, empty state message appears.

### 3. Tenant Create Flow

1. On tenant list, tap "Yeni Kiracı" button
2. Fill in: Ad Soyad = "Test Kiracı", Telefon = "05551234567", E-posta = "test@test.com", Kira Başlangıç = "2026-01-01", Kira Bitiş = "2027-01-01", Aylık Kira = "5000", tap TRY chip
3. Tap "Kaydet"
4. **Expected:** Navigates back to tenant list. New tenant "Test Kiracı" appears in active section with "₺5.000" rent.

### 4. Tenant Detail — View Payments and Mark Paid

1. Tap the newly created tenant card
2. **Expected:** Tenant detail shows info section (name, phone, email, dates, rent). Kira Ödemeleri section lists auto-generated monthly payments with status badges.
3. Find a payment with "Bekleyen" (Pending) status → tap "Ödendi İşaretle"
4. **Expected:** Payment status changes to "Ödendi" (green badge). Button disappears for that payment.

### 5. Tenant Edit Flow

1. On tenant detail, tap "Düzenle" button
2. Change phone number to "05559876543"
3. Tap "Kaydet"
4. **Expected:** Returns to tenant detail. Phone number shows updated value.

### 6. Tenant Terminate

1. On tenant detail for an active tenant, tap "Sonlandır" button
2. **Expected:** Alert dialog appears asking for confirmation
3. Tap "Sonlandır" in dialog
4. **Expected:** Navigates back to tenant list. Tenant now appears in "Geçmiş Kiracılar" section with red badge.

### 7. Short-Term Rental List + Create

1. From property detail, tap "Kısa Dönem"
2. **Expected:** List loads (may be empty). Platform badges should show correct colors (Airbnb=red, Booking=blue, Direkt=grey).
3. Tap "Yeni Kayıt"
4. Fill in: Misafir Adı = "John Doe", Giriş = "2026-04-01", Çıkış = "2026-04-05", Gecelik Ücret = "100", Toplam = "400", Platform Ücreti = "40", Net Tutar = "360", tap Airbnb chip, tap USD chip
5. Tap "Kaydet"
6. **Expected:** Returns to list. New entry shows "John Doe" with Airbnb badge and "$360" net amount.

### 8. Short-Term Rental Delete

1. On the short-term rental list, long-press or tap delete icon on an entry
2. **Expected:** Alert dialog asks for confirmation
3. Confirm deletion
4. **Expected:** Entry removed from list.

### 9. Expense List + Create

1. From property detail, tap "Giderler"
2. **Expected:** List loads with category badges (color-coded). Recurring expenses show repeat icon.
3. Tap "Yeni Gider"
4. Fill in: tap "Bakım" category chip, Açıklama = "Boya", Tutar = "2000", tap TRY chip, Tarih = "2026-03-15"
5. Tap "Kaydet"
6. **Expected:** Returns to list. "Boya" expense shows with Bakım badge and "₺2.000" amount.

### 10. Expense Recurring Toggle

1. Tap "Yeni Gider" again
2. Toggle "Tekrarlayan" switch ON
3. **Expected:** "Tekrar Sıklığı" field appears below the toggle
4. Fill category, description, amount, date, and recurrence interval
5. Tap "Kaydet"
6. **Expected:** Returns to list. New expense shows recurring indicator icon.

### 11. Bill List + Create + Mark Paid

1. From property detail, tap "Faturalar"
2. **Expected:** List loads with type badges (Su=blue, Elektrik=yellow, Doğalgaz=orange, İnternet=purple, Aidat=teal) and status badges (Ödendi=green, Bekleyen=amber, Gecikmiş=red).
3. Tap "Yeni Fatura"
4. Fill in: tap "Elektrik" type chip, Tutar = "350", tap TRY chip, Son Ödeme = "2026-04-01"
5. Tap "Kaydet"
6. **Expected:** Returns to list. New bill shows with Elektrik badge and Bekleyen status.
7. Tap "Ödendi" button on the Bekleyen bill
8. **Expected:** Status changes to "Ödendi" (green badge). "Ödendi" button disappears.

### 12. Bill Delete

1. Tap delete icon on a bill entry
2. **Expected:** Alert confirmation dialog
3. Confirm
4. **Expected:** Bill removed from list.

### 13. Document Upload

1. From property detail, tap "Dökümanlar"
2. **Expected:** Document list loads (may be empty). Upload section visible at top with category chips.
3. Select a category chip (e.g., "Sözleşme")
4. Tap "Dosya Seç ve Yükle"
5. **Expected:** Device file picker opens
6. Select any file (PDF, image, etc.)
7. **Expected:** Upload progress shown. After upload, document appears in list with filename, category badge, file size, and upload date.

### 14. Document Download/Share

1. Tap the download button on a document in the list
2. **Expected:** File downloads to cache. Share sheet opens allowing the user to save/share the file via any installed app.

### 15. Document Delete

1. Tap delete icon on a document
2. **Expected:** Alert confirmation dialog
3. Confirm
4. **Expected:** Document removed from list.

## Edge Cases

### Empty State Display

1. Navigate to any sub-page for a property with no data (e.g., no tenants, no expenses)
2. **Expected:** Friendly empty state message in Turkish (not a blank screen, not an error).

### Network Error Handling

1. Turn off Wi-Fi/mobile data
2. Navigate to any sub-page
3. **Expected:** Error message displayed in Turkish with a "Tekrar Dene" (Retry) button
4. Turn data back on → tap Retry
5. **Expected:** Data loads successfully.

### Invalid Date Entry in Forms

1. Open any create form (e.g., tenant)
2. Enter invalid date like "abc" in a date field
3. Tap "Kaydet"
4. **Expected:** API returns validation error. User sees Turkish error message. Form remains open with entered data preserved.

### Pull-to-Refresh on All Lists

1. On each list screen (tenants, short-term rentals, expenses, bills, documents), pull down
2. **Expected:** Refresh indicator appears, data reloads. No duplicate entries, no crash.

### Large File Upload

1. On documents screen, try uploading a file >5MB
2. **Expected:** Either uploads successfully (if backend allows) or shows a clear error message about file size limit.

## Failure Signals

- Blank white screen on any sub-page navigation → route registration missing or import error
- "Network Error" without retry button → API client URL misconfigured or CORS issue
- TypeScript types don't match API response → client.ts types out of sync with backend DTOs
- "undefined is not an object" errors → missing null checks on API response data
- Mark-paid button doesn't change status → API endpoint path mismatch
- Document upload fails silently → FormData pattern incorrect (check { uri, name, type } format)
- Share sheet doesn't open after download → expo-sharing not installed or not configured in app.json

## Requirements Proved By This UAT

- R017 (partial) — Proves all mobile sub-pages (tenants, short-term rentals, expenses, bills, documents) work with CRUD operations. Combined with S04 UAT (login, dashboard, properties, notifications), this covers the full R017 scope except push notifications (S06).

## Not Proven By This UAT

- Push notification delivery (S06 scope)
- EAS Build for production iOS/Android binaries
- Performance under large data sets (100+ tenants, 1000+ payments)
- Offline behavior or slow network resilience
- Multi-user concurrent editing

## Notes for Tester

- **Date format**: All date fields expect YYYY-MM-DD format (displayed as YYYY-AA-GG placeholder in Turkish). Don't use DD/MM/YYYY.
- **Currency**: Default currency may vary per property. Make sure to tap the correct currency chip in forms.
- **Backend data**: Tests work best with pre-seeded data. Create a few tenants, expenses, and bills via the web UI first so list screens have content to display.
- **Expo Go limitations**: Some features (like file system access) may behave slightly differently in Expo Go vs a production EAS build. Document download/share should work but may show different share sheet options.
- **Console logging**: Connect to Expo Go dev tools (shake device → "Debug Remote JS" or use the terminal output) to see console.debug lifecycle logs for debugging.
