# S03: Data Import — UAT

**Milestone:** M003
**Written:** 2026-03-18

## UAT Type

- UAT mode: mixed (artifact-driven for backend contract + live-runtime for frontend flow)
- Why this mode is sufficient: Integration tests prove backend CSV parsing and DB creation. Frontend build is clean. Live-runtime browser verification confirms the UI flow works end-to-end. Human verification needed for real Airbnb CSV format testing.

## Preconditions

- Backend API running (`dotnet run` in GurkanApi/ on port 5039)
- Frontend dev server running (`npm run dev` in gurkan-ui/)
- PostgreSQL running on port 5434 with test data (at least one group, one property, one tenant)
- User logged in as admin or a user with access to at least one property
- Prepare two test CSV files:
  - **airbnb-test.csv** with content:
    ```
    Start Date,End Date,Nights,Guest,Amount,Service Fee
    2025-01-15,2025-01-18,3,John Smith,1500.00,225.00
    2025-02-10,2025-02-14,4,Jane Doe,2000.00,300.00
    ```
  - **rent-payments-test.csv** with content (use real property and tenant names from your DB):
    ```
    PropertyName,TenantName,DueDate,Amount,Currency,Status,PaymentMethod,Notes
    [YourPropertyName],[YourTenantName],2026-06-01,10000,TRY,Paid,BankTransfer,Imported from CSV
    [YourPropertyName],[YourTenantName],2026-07-01,10000,TRY,Pending,,Imported from CSV
    ```

## Smoke Test

Navigate to `/import` in browser → page renders with "İçe Aktar" header and two tabs ("Airbnb CSV" and "Kira Ödemeleri"). Sidebar shows "İçe Aktar" nav link.

## Test Cases

### 1. Airbnb CSV — Preview (dryRun)

1. Navigate to `/import`
2. Click "Airbnb CSV" tab (should be selected by default)
3. Select a property from the dropdown
4. Click "Dosya Seç" / file input and select `airbnb-test.csv`
5. Click "Önizleme" (Preview) button
6. **Expected:** Preview table appears showing 2 rows. Summary card shows: Total=2, Success=2, Error=0, Warning=0. Each row shows guest name, check-in/check-out dates, nights, amount, service fee. No records should be created in the DB yet.

### 2. Airbnb CSV — Confirm Import

1. After preview from Test Case 1, click "İçe Aktar" (Import/Confirm) button
2. **Expected:** Success banner appears with message indicating 2 records imported. Navigate to the property's short-term rentals list (`/properties/{id}/short-term-rentals`)
3. **Expected:** The two imported reservations appear in the list with correct guest names ("John Smith", "Jane Doe"), dates, and amounts.

### 3. Airbnb CSV — Duplicate Detection

1. Go back to `/import`
2. Select the same property and upload the same `airbnb-test.csv` again
3. Click "Önizleme"
4. **Expected:** Preview shows 2 rows with "Warning" status and duplicate warning messages. Summary shows DuplicateCount=2 or WarningCount=2. The system detected that records with same CheckIn+GuestName+PropertyId already exist.

### 4. Rent Payment CSV — Preview and Import

1. Click "Kira Ödemeleri" tab
2. Select `rent-payments-test.csv` via file input
3. Click "Önizleme"
4. **Expected:** Preview shows 2 rows with property/tenant names resolved. Summary shows Total=2, Success=2.
5. Click "İçe Aktar" to confirm
6. **Expected:** Success banner. Navigate to the tenant's payment list. Two new payments appear with "Imported from CSV" notes, correct amounts, and dates.

### 5. Malformed CSV — Error Reporting

1. Prepare a `bad-airbnb.csv`:
   ```
   Start Date,Nights,Guest,Amount,Service Fee
   not-a-date,3,Bad Guest,1500.00,225.00
   2025-03-01,2,Good Guest,,150.00
   ```
2. Go to `/import`, select Airbnb CSV tab, select a property
3. Upload `bad-airbnb.csv` and click "Önizleme"
4. **Expected:** Preview table shows error rows highlighted in red. Row 1 has an error about invalid date. Row 2 has an error about missing amount. Summary shows ErrorCount=2 (or appropriate count). No "İçe Aktar" button should import these — confirm button should still be available but importing will create 0 records since all rows have errors.

### 6. Cross-Group Access Denied

1. Log in as a user who belongs to Group A but NOT Group B
2. Navigate to `/import`, select Airbnb CSV tab
3. The property dropdown should only show properties the user has access to
4. **Expected:** Only properties from Group A appear in the dropdown. No properties from Group B.

## Edge Cases

### Invalid File Type

1. Try uploading a `.txt` or `.pdf` file instead of `.csv`
2. **Expected:** Error message — backend returns 400 with "invalid_file_type" error. Error banner appears on the page.

### Empty CSV File

1. Upload a CSV with only headers and no data rows
2. **Expected:** Preview shows 0 rows. Summary shows TotalRows=0.

### Turkish Locale Numbers

1. Create a CSV with Turkish-style amounts: `1.500,00` (period as thousands separator, comma as decimal)
2. **Expected:** Parser correctly interprets as 1500.00.

### No Property Selected (Airbnb)

1. On Airbnb CSV tab, try to click Preview without selecting a property
2. **Expected:** Error message or validation prevents the upload — property selection is required for Airbnb import.

### Rent Payment with Unknown Tenant

1. Create a rent payment CSV with a tenant name that doesn't exist in the system
2. Click Preview
3. **Expected:** Row shows error status with message indicating tenant not found.

## Failure Signals

- `/import` route returns blank page or 404 → routing not wired in App.tsx
- Property dropdown is empty → getProperties() API call failing or CORS issue
- Preview button does nothing → API client function not connected or endpoint URL wrong
- All rows show errors even with valid CSV → date/decimal parser not handling the format
- "İçe Aktar" (confirm) creates no records → dryRun parameter not being set to false on confirm
- 403 on import for admin user → group access check too restrictive
- Network error on upload → multipart form data not constructed correctly or request size limit hit

## Requirements Proved By This UAT

- R016 — Airbnb CSV export file parsed into short-term rental records; historical rent payments bulk imported via CSV. Validation and error reporting working.

## Not Proven By This UAT

- Real Airbnb export CSV format compatibility — test CSVs use synthetic data with known column names. Actual Airbnb earnings exports may have different columns or formatting.
- Excel (.xlsx) import — only CSV is supported in this implementation.
- Performance with large CSV files (1000+ rows) — not tested.

## Notes for Tester

- The Airbnb CSV parser supports 20+ column name aliases (e.g., "Start Date", "Check-in", "CheckIn" all map to the same field). If your real Airbnb CSV has different column names, the parser may not recognize them — report this as a bug.
- Rent payment CSV requires exact property and tenant name match (case-insensitive). Small typos will cause "not found" errors.
- All imported dates are stored as UTC. If dates appear shifted, this is the K012 pattern — not a bug.
- The import page uses the same CSS variable theme as the rest of the app. Row highlighting uses red for errors, yellow for warnings.
- dryRun defaults to `true` on the backend. If preview works but confirm doesn't create records, check that the frontend sends `dryRun=false` on the confirm request (visible in Network tab).
