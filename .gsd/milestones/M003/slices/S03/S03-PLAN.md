# S03: Data Import

**Goal:** Airbnb CSV import ile kısa dönem kiralama kayıtları oluşuyor. Geçmiş uzun dönem kira ödemeleri toplu CSV import edilebiliyor. Validation ve hata raporlaması çalışıyor.
**Demo:** Upload an Airbnb CSV file → see parsed preview with row-level validation → confirm → ShortTermRental records created and visible on existing list page. Upload a rent payment CSV → preview → confirm → RentPayment records created and visible on tenant detail page. Upload a malformed CSV → see clear row-level errors highlighted in the preview.

## Must-Haves

- `POST /api/import/airbnb-csv?propertyId={id}&dryRun={bool}` — Airbnb CSV upload → parse → validate → create ShortTermRental records (or preview with dryRun=true)
- `POST /api/import/rent-payments?dryRun={bool}` — Rent payment CSV upload → parse → validate → create RentPayment records (or preview with dryRun=true)
- CSV parsers handle Turkish locale: comma decimal separator, UTF-8 BOM, multiple date formats
- Row-level validation errors with row number, field name, and error message
- Duplicate detection: warn on existing ShortTermRental with same CheckIn + GuestName + PropertyId
- Group-based authorization: import endpoints verify property access via IGroupAccessService
- All imported dates stored as UTC (K012)
- Frontend import page with file upload, property selector, preview table with error highlighting, confirm button, and result summary
- Route `/import` added to App.tsx

## Proof Level

- This slice proves: integration (backend CSV parsing + DB creation + frontend upload flow)
- Real runtime required: yes (PostgreSQL for integration tests, browser for frontend verification)
- Human/UAT required: yes (real Airbnb CSV testing is a UAT step — format may vary)

## Verification

- `dotnet test --filter "Category=S03"` — all integration tests pass (valid import, dryRun preview, validation errors, authorization, duplicate detection)
- Frontend build: `cd gurkan-ui && npm run build` succeeds without errors
- Browser verification: navigate to /import, upload a CSV, see preview, confirm, see success

## Observability / Diagnostics

- Runtime signals: structured log on import completion — `Import completed: Type={ImportType}, PropertyId={PropertyId}, TotalRows={Total}, Imported={Imported}, Errors={Errors}, By={UserId}`
- Inspection surfaces: import response body contains `summary` (totalRows, importedCount, errorCount, duplicateCount) + `rows[]` with per-row status/errors
- Failure visibility: row-level errors include rowNumber, field, errorMessage — frontend renders these inline in the preview table
- Redaction constraints: guest names and tenant names are visible in import responses (not PII-sensitive for this single-user app)

## Integration Closure

- Upstream surfaces consumed: `IGroupAccessService` for property access checks, `ApplicationDbContext` for ShortTermRentals/RentPayments/Tenants/Properties DbSets, `ClaimsPrincipalExtensions` for auth, `ShortTermRental` and `RentPayment` entities, frontend `api/client.ts` axios instance with auth interceptor
- New wiring introduced in this slice: `ImportController` registered via `[ApiController]` convention, two new API client functions in `client.ts`, `/import` route in `App.tsx`
- What remains before the milestone is truly usable end-to-end: S04-S06 (mobile app + push notifications)

## Tasks

- [x] **T01: Build ImportController with CSV parsers and DTOs** `est:1h30m`
  - Why: Core backend for both import flows — this is the riskiest part (CSV format handling, Turkish locale, validation). Must be proven before frontend work.
  - Files: `GurkanApi/Controllers/ImportController.cs`, `GurkanApi/Services/AirbnbCsvParser.cs`, `GurkanApi/Services/RentPaymentCsvParser.cs`, `GurkanApi/DTOs/Import/ImportPreviewResponse.cs`, `GurkanApi/DTOs/Import/ImportRowResult.cs`, `GurkanApi/DTOs/Import/ImportSummary.cs`
  - Do: Create ImportController with two POST endpoints (airbnb-csv, rent-payments) using `[Consumes("multipart/form-data")]` and `IFormFile`. Create AirbnbCsvParser that auto-detects column names (case-insensitive), handles Turkish decimal format, multiple date formats, and maps to ShortTermRental entity. Create RentPaymentCsvParser that resolves PropertyName→PropertyId and TenantName→TenantId from DB. Both parsers return row-level validation results. dryRun=true returns preview without DB writes. Skip overlap checking for imported ShortTermRentals (historical data). Detect duplicates (same CheckIn+GuestName+PropertyId) and include as warnings. All dates must be DateTime.SpecifyKind(parsed, DateTimeKind.Utc) per K012. Use StreamReader with UTF-8 encoding detection for BOM handling.
  - Verify: `dotnet build` succeeds. Manual curl test with sample CSV against running API returns expected preview/import response.
  - Done when: Both import endpoints accept CSV files, parse them correctly, return row-level validation, and create records on dryRun=false.

- [x] **T02: Integration tests for both import endpoints** `est:45m`
  - Why: Proves the backend contract works correctly — valid imports create records, dryRun doesn't write, validation catches errors, authorization blocks cross-group access.
  - Files: `GurkanApi.Tests/IntegrationTests/ImportTests.cs`
  - Do: Follow DocumentTests pattern for multipart upload. Create sample CSV content as byte arrays in test helpers. Test cases: (1) valid Airbnb CSV → dryRun returns preview with correct row count, (2) valid Airbnb CSV → commit creates ShortTermRental records with correct field values, (3) malformed Airbnb CSV → row-level errors returned, (4) valid rent payment CSV → resolves property/tenant by name → creates RentPayment records, (5) rent payment CSV with unknown tenant → error row, (6) dryRun=true → no records in DB, (7) cross-group access → 403, (8) duplicate Airbnb reservation → warning in response. Use `[Trait("Category", "S03")]` on test class. Add "Notifications" to TRUNCATE list in TestFixture if needed.
  - Verify: `dotnet test --filter "Category=S03"` — all tests pass.
  - Done when: All 8+ test cases pass, proving both import flows work correctly with validation, authorization, and duplicate detection.

- [x] **T03: Frontend import page with upload, preview, and confirmation** `est:1h`
  - Why: Completes the user-facing import flow — users need a UI to upload CSV files, review parsed data, and confirm import.
  - Files: `gurkan-ui/src/pages/Import/ImportPage.tsx`, `gurkan-ui/src/pages/Import/Import.css`, `gurkan-ui/src/api/client.ts`, `gurkan-ui/src/types/index.ts`, `gurkan-ui/src/App.tsx`
  - Do: Add `importAirbnbCsv(propertyId, file, dryRun)` and `importRentPayments(file, dryRun)` to client.ts using FormData (same pattern as uploadDocument). Add import response types to types/index.ts. Create ImportPage with two sections (tabs or cards): Airbnb CSV Import (requires property selector) and Rent Payment Import. Each section: file input, upload button → calls endpoint with dryRun=true → shows preview table with row status (success/error/warning) → confirm button calls endpoint with dryRun=false → shows result summary. Error rows highlighted in red, warnings in yellow. Add `/import` route to App.tsx under protected routes. Add navigation link in Layout sidebar/nav. Follow shared.css classes for buttons, tables, forms, feedback states.
  - Verify: `cd gurkan-ui && npm run build` succeeds. Browser: navigate to /import, see two import sections with file upload, upload a test CSV, see preview table.
  - Done when: Import page renders, file upload triggers dryRun preview, confirmation creates records, error/warning rows are visually distinct.

## Files Likely Touched

- `GurkanApi/Controllers/ImportController.cs` (new)
- `GurkanApi/Services/AirbnbCsvParser.cs` (new)
- `GurkanApi/Services/RentPaymentCsvParser.cs` (new)
- `GurkanApi/DTOs/Import/ImportPreviewResponse.cs` (new)
- `GurkanApi/DTOs/Import/ImportRowResult.cs` (new)
- `GurkanApi/DTOs/Import/ImportSummary.cs` (new)
- `GurkanApi.Tests/IntegrationTests/ImportTests.cs` (new)
- `gurkan-ui/src/pages/Import/ImportPage.tsx` (new)
- `gurkan-ui/src/pages/Import/Import.css` (new)
- `gurkan-ui/src/api/client.ts` (modify — add import functions)
- `gurkan-ui/src/types/index.ts` (modify — add import types)
- `gurkan-ui/src/App.tsx` (modify — add /import route)
- `gurkan-ui/src/components/Layout.tsx` (modify — add import nav link)
