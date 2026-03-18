# S03 (Data Import) — Research

**Date:** 2026-03-18
**Depth:** Targeted — known technology (ASP.NET Core file upload, CSV parsing), moderate complexity (two import flows, validation, frontend UI), no novel architecture.

## Summary

S03 delivers two import flows: (1) Airbnb CSV earnings import → ShortTermRental records, and (2) bulk past rent payment CSV import → RentPayment records. Both follow the same pattern: multipart file upload → server-side parse → validate → preview response → confirm → bulk insert. The backend already has the `IFormFile` upload pattern (DocumentsController), the entity models (ShortTermRental, RentPayment), and ClosedXML for Excel support. The frontend has the `uploadDocument` pattern with FormData. No new NuGet packages are needed — .NET's built-in `StreamReader` + manual CSV parsing is sufficient for the well-defined column sets, and ClosedXML (already installed) handles Excel if needed.

The primary risk is **Airbnb CSV column format uncertainty**. Airbnb's earnings CSV export has configurable fields and varies by region. The approach should be flexible: accept a CSV with headers, auto-detect known column names (Date, Type, Confirmation Code, Start Date, Nights, Guest, Listing, Amount, Host Fee, Gross Earnings, etc.), and map them to ShortTermRental fields. Validation + row-level error reporting lets users see what parsed correctly and fix issues before confirming.

The rent payment import is simpler — it's a user-created CSV/Excel with known columns (PropertyName or PropertyId, TenantName or TenantId, Amount, Currency, DueDate, PaidDate, Status, PaymentMethod). The backend resolves property/tenant by name or ID, validates, and creates RentPayment records linked to existing tenants.

## Recommendation

**Two-phase import pattern (parse → preview → confirm):**

1. User uploads CSV file to a parse endpoint → backend returns parsed rows with validation results (no DB writes yet)
2. User reviews preview, sees errors/warnings per row → confirms import
3. Frontend sends confirmed rows to a create endpoint → backend bulk-inserts

This avoids a single endpoint that both parses and writes, giving the user control. However, for simplicity, a single-endpoint approach with a `dryRun` query parameter achieves the same: `POST /api/import/airbnb-csv?propertyId={id}&dryRun=true` returns preview, `dryRun=false` (or omitted) commits.

**Use the `dryRun` parameter approach** — it's simpler (one endpoint per import type), stateless (no server-side session for parsed data), and the frontend can store the preview locally.

**Don't use a dedicated CSV library.** The Airbnb CSV and rent payment CSV are simple formats (no nested quotes, no multi-line fields in practice). A lightweight manual parser using `StreamReader.ReadLineAsync()` + `string.Split(',')` with basic quote handling is sufficient and avoids adding a NuGet dependency. If edge cases arise, `CsvHelper` can be added later.

## Implementation Landscape

### Key Files

**Backend — existing (read, extend):**
- `GurkanApi/Controllers/DocumentsController.cs` — `IFormFile` upload pattern with `[Consumes("multipart/form-data")]`, `[RequestSizeLimit]`, property access check. Copy this pattern for import controller.
- `GurkanApi/Controllers/ShortTermRentalsController.cs` — Create logic for ShortTermRental entity. Import will reuse the same entity creation but skip overlap checking (import rows may intentionally fill historical data).
- `GurkanApi/Controllers/RentPaymentsController.cs` — Nested under `/api/properties/{propertyId}/tenants/{tenantId}/rent-payments`. Import needs to resolve tenant by name, so the import endpoint should be at a higher level.
- `GurkanApi/Entities/ShortTermRental.cs` — Target entity for Airbnb CSV import. Fields: GuestName, CheckIn, CheckOut, NightCount, NightlyRate, TotalAmount, PlatformFee, NetAmount, Platform, Currency.
- `GurkanApi/Entities/RentPayment.cs` — Target entity for rent payment import. Fields: TenantId, Amount, Currency, DueDate, PaidDate, Status, PaymentMethod.
- `GurkanApi/Entities/Enums.cs` — `RentalPlatform.Airbnb`, `Currency`, `RentPaymentStatus`, `PaymentMethod` enums.
- `GurkanApi/Data/ApplicationDbContext.cs` — DbSets for ShortTermRentals, RentPayments, Tenants, Properties.
- `GurkanApi/Extensions/ClaimsPrincipalExtensions.cs` — `GetUserId()`, `GetRole()` for auth.
- `GurkanApi/Services/IGroupAccessService.cs` — `CanAccessPropertyAsync()` for authorization.

**Backend — new:**
- `GurkanApi/Controllers/ImportController.cs` — New controller with two endpoints:
  - `POST /api/import/airbnb-csv?propertyId={id}&dryRun={bool}` — Airbnb CSV → ShortTermRental records
  - `POST /api/import/rent-payments?dryRun={bool}` — CSV → RentPayment records
- `GurkanApi/Services/AirbnbCsvParser.cs` — Parse Airbnb CSV format, map columns to ShortTermRental fields, return parsed rows with row-level validation errors.
- `GurkanApi/Services/RentPaymentCsvParser.cs` — Parse rent payment CSV, resolve property/tenant references, return parsed rows with validation.
- `GurkanApi/DTOs/Import/` — Request/response DTOs: `ImportPreviewResponse`, `ImportRowResult`, `ImportSummary`.

**Frontend — existing (read, follow patterns):**
- `gurkan-ui/src/api/client.ts` — Add `importAirbnbCsv()` and `importRentPayments()` functions using FormData (same pattern as `uploadDocument`).
- `gurkan-ui/src/types/index.ts` — Add import response types.
- `gurkan-ui/src/App.tsx` — Add route for import page.
- `gurkan-ui/src/pages/Documents/DocumentList.tsx` — Reference for file upload UI pattern (useRef for file input, uploading state, error handling).
- `gurkan-ui/src/styles/shared.css` — Shared CSS classes (buttons, forms, tables, page headers, feedback states).

**Frontend — new:**
- `gurkan-ui/src/pages/Import/ImportPage.tsx` — Main import page with two tabs/sections: Airbnb CSV Import and Rent Payment Import.
- `gurkan-ui/src/pages/Import/Import.css` — Import-specific styles (preview table, error rows, progress).

**Tests — new:**
- `GurkanApi.Tests/IntegrationTests/ImportTests.cs` — Integration tests for both import endpoints. Follow DocumentTests pattern for multipart upload.

### Airbnb CSV Format

Airbnb's earnings CSV export (from Transaction History → Gross Earnings) typically contains these columns (header names vary by locale/configuration):
- `Date` — payout/transaction date
- `Type` — "Payout" or "Reservation"  
- `Confirmation Code` — Airbnb reservation code
- `Start Date` — check-in date
- `Nights` — number of nights
- `Guest` — guest name
- `Listing` — listing/property name
- `Amount` — net payout amount
- `Host Fee` — Airbnb service fee
- `Cleaning Fee` — cleaning fee (if charged)
- `Gross Earnings` — total before fees

**Mapping to ShortTermRental:**
- `Guest` → GuestName
- `Start Date` → CheckIn
- `Start Date + Nights` → CheckOut (computed)
- `Nights` → NightCount
- `Gross Earnings / Nights` → NightlyRate (computed)
- `Gross Earnings` → TotalAmount
- `Host Fee` → PlatformFee
- `Amount` → NetAmount
- Platform → hardcoded `Airbnb`
- Currency → from property or detected from CSV

**Key parsing decisions:**
- Filter rows where `Type` = "Reservation" or "Payout" (skip adjustments, resolutions)
- Handle missing columns gracefully — required: at least Start Date + Amount/Gross Earnings
- Date parsing: try multiple formats (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD) since Airbnb locale varies
- Decimal parsing: handle both `.` and `,` as decimal separators (Turkish locale uses `,`)
- Column matching: case-insensitive, trim whitespace, support common aliases

### Rent Payment CSV Template

User-created CSV with required columns:
- `PropertyName` (or `PropertyId`) — to resolve the property
- `TenantName` (or `TenantId`) — to resolve the tenant
- `Amount` — payment amount
- `Currency` — TRY/USD/EUR
- `DueDate` — when rent was due
- `PaidDate` (optional) — when it was paid
- `Status` — Pending/Paid/Late/Cancelled
- `PaymentMethod` (optional) — Cash/BankTransfer/Check

Backend resolves PropertyName → PropertyId and TenantName → TenantId by exact match within the user's accessible properties. Ambiguous matches are reported as errors.

### Build Order

1. **Backend parsers + ImportController (T01)** — Core logic: CSV parsing services, ImportController with dryRun support, DTOs. This is the riskiest part (Airbnb CSV format handling) and should be proven first. Verify with integration tests using sample CSV data.

2. **Integration tests (T02)** — Tests for both import endpoints: successful import, validation errors, dryRun preview, authorization checks, malformed CSV handling. Use DocumentTests multipart pattern.

3. **Frontend import page (T03)** — Import UI: file upload, property/tenant selection, preview table with row-level error highlighting, confirm button, result summary. Add route and API client functions.

### Verification Approach

**Backend verification:**
- `dotnet test --filter "Category=S03"` — integration tests pass
- Test cases: valid Airbnb CSV → correct ShortTermRental records created, valid rent payment CSV → correct RentPayment records created, dryRun returns preview without DB writes, malformed CSV returns row-level errors, unauthorized property returns 403, date/decimal parsing handles Turkish locale

**Frontend verification:**
- Browser test: navigate to /import, upload a sample CSV, see preview table, confirm import, see success summary
- Error case: upload malformed CSV, see row-level errors highlighted in red

**End-to-end:**
- Create a sample Airbnb CSV with 5-10 rows → import → verify ShortTermRental records via existing list page
- Create a sample rent payment CSV → import → verify RentPayment records via existing tenant detail page

## Constraints

- **No new NuGet packages needed.** .NET StreamReader handles CSV parsing. ClosedXML (already installed) can handle Excel format if needed for rent payments, but CSV-only is sufficient for MVP.
- **K012 (DateTime UTC):** All dates from CSV must be converted to UTC DateTime before saving to PostgreSQL (Npgsql rejects `DateTime.Kind = Unspecified`). Use `DateTime.SpecifyKind(parsed, DateTimeKind.Utc)`.
- **K011 (String enums):** Backend uses `JsonStringEnumConverter` — all enum values in import responses will be strings ("Airbnb", "Paid", "TRY"), matching frontend const objects.
- **Group-based access:** Import endpoints must verify user has access to the target property via `IGroupAccessService.CanAccessPropertyAsync()`. The Airbnb CSV import takes a `propertyId` parameter; the rent payment import resolves properties by name within accessible properties only.
- **Existing RentPayments are auto-generated by tenant creation** (monthly payments from LeaseStart to LeaseEnd). Bulk import should create additional payment records, potentially for dates before the tenant's current lease or for historical tenants. The import should NOT conflict with auto-generated payments — check for duplicate DueDate+TenantId and skip/warn.

## Common Pitfalls

- **Airbnb CSV encoding** — Airbnb exports may use UTF-8 with BOM or Windows-1252, especially for Turkish characters (ğ, ş, ı, ö, ü). Use `StreamReader` with encoding detection or default to UTF-8.
- **Decimal separator locale mismatch** — Turkish CSV exports use `,` as decimal separator (e.g., "1.250,00" for 1250.00). Parse with `CultureInfo.InvariantCulture` first, fall back to Turkish culture. Or strip thousands separators and normalize.
- **Duplicate import** — User might accidentally upload the same CSV twice. Detect duplicates by checking for existing ShortTermRental with same CheckIn + GuestName + PropertyId, and warn (not block) on dryRun.
- **Date overlap validation** — ShortTermRentalsController.Create checks for date overlap. Import should skip this check for bulk historical data (import creates records that may legitimately overlap with different properties or already-existing manual entries). Or make it a warning, not a blocker.

## Open Risks

- **Airbnb CSV format may have changed** — The column structure is based on community reports and documentation. The actual CSV from the user's Airbnb account may differ. Mitigation: flexible column detection + clear error reporting when expected columns are missing. The user can also provide a sample file for testing.
- **Large file performance** — If the user has years of Airbnb data, the CSV could have thousands of rows. For MVP, loading the entire CSV into memory is acceptable (a 10,000-row CSV is ~2MB). No streaming needed.
