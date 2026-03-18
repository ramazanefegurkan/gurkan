---
id: T01
parent: S03
milestone: M003
provides:
  - ImportController with POST /api/import/airbnb-csv and POST /api/import/rent-payments endpoints
  - AirbnbCsvParser with flexible column detection, Turkish locale, multi-format dates
  - RentPaymentCsvParser with property/tenant name resolution from DB
  - Import DTOs (ImportPreviewResponse, AirbnbImportRow, RentPaymentImportRow, ImportSummary)
  - Shared CsvParsingHelpers for date/decimal/CSV parsing utilities
key_files:
  - GurkanApi/Controllers/ImportController.cs
  - GurkanApi/Services/AirbnbCsvParser.cs
  - GurkanApi/Services/RentPaymentCsvParser.cs
  - GurkanApi/Services/CsvParsingHelpers.cs
  - GurkanApi/DTOs/Import/ImportPreviewResponse.cs
  - GurkanApi/DTOs/Import/ImportRowResult.cs
  - GurkanApi/DTOs/Import/ImportSummary.cs
key_decisions:
  - Used typed DTOs (AirbnbImportRow, RentPaymentImportRow) instead of Dictionary<string, object?> for parsed fields — provides compile-time safety and cleaner serialization
  - Generic ImportPreviewResponse<TRow> lets both endpoints return the same envelope shape with type-specific rows
  - Parsers are plain classes (not DI-registered services) — instantiated directly in controller since they have no shared state
patterns_established:
  - CSV import pattern: dryRun=true by default → parse → validate → return preview → dryRun=false creates records
  - CsvParsingHelpers static class shared across all CSV parsers (TryParseDate, TryParseDecimal, SplitCsvLine, NormalizeHeader)
  - Column alias mapping: normalized header → logical field name, first match wins
  - Import bypasses overlap checks — historical data may legitimately overlap
observability_surfaces:
  - Structured log: "Import completed: Type={ImportType}, PropertyId={PropertyId}, TotalRows={Total}, Imported={Imported}, Errors={Errors}, By={UserId}"
  - Response body: summary (totalRows/importedCount/errorCount/warningCount/duplicateCount) + rows[] with per-row status/errors
duration: 15m
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T01: Build ImportController with CSV parsers and DTOs

**Built complete CSV import backend: ImportController with two multipart endpoints, Airbnb/rent-payment parsers with Turkish locale handling, dryRun preview support, and row-level validation**

## What Happened

Created the full backend import infrastructure for S03. The implementation follows the existing DocumentsController pattern for multipart file upload and property access checks.

**ImportController** (api/import) provides two POST endpoints:
- `POST /api/import/airbnb-csv?propertyId={id}&dryRun=true` — parses Airbnb CSV, detects duplicates by CheckIn+GuestName+PropertyId, creates ShortTermRental records on commit
- `POST /api/import/rent-payments?dryRun=true` — parses rent payment CSV, resolves property/tenant by name from DB, creates RentPayment records on commit

**AirbnbCsvParser** handles flexible column detection with 20+ aliases (e.g., "Start Date"/"Check-in"/"CheckIn" all map to CheckIn), Turkish decimal format (period thousands, comma decimal), 8 date formats, row-type filtering (skips Adjustment/Resolution rows), and computed fields (CheckOut from CheckIn+NightCount, NightlyRate from TotalAmount/NightCount).

**RentPaymentCsvParser** resolves property names (exact match, case-insensitive within user's accessible properties) and tenant names (within resolved property), performs duplicate detection (same TenantId+DueDate already in DB), and parses enums for Currency, Status, and PaymentMethod.

**CsvParsingHelpers** provides shared utilities: multi-format UTC date parsing (K012 compliant), Turkish locale decimal parsing with currency symbol stripping, RFC-compliant CSV line splitting with quote handling, and header normalization.

All import endpoints use `[Authorize]`, `[Consumes("multipart/form-data")]`, and `[RequestSizeLimit(10MB)]`. dryRun defaults to `true` (safe by default). Import bypasses ShortTermRental overlap checks since historical records may legitimately overlap.

## Verification

- `dotnet build` — 0 errors, 0 warnings
- Reviewed ImportController has `[Authorize]`, `[Consumes("multipart/form-data")]`, `[RequestSizeLimit(10 * 1024 * 1024)]`
- Reviewed parsers handle 8 date formats and Turkish decimal separators
- Confirmed dryRun defaults to `true` in both endpoints
- Frontend build succeeds (no regressions)

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `dotnet build GurkanApi/GurkanApi.csproj` | 0 | ✅ pass | 3.0s |
| 2 | `dotnet test --filter "Category=S03"` | 0 | ✅ pass (13 pre-existing tests, import tests pending T02) | 8.8s |
| 3 | `cd gurkan-ui && npm run build` | 0 | ✅ pass | 4.2s |

## Diagnostics

- **Import response inspection:** Both endpoints return `ImportPreviewResponse<T>` with `summary` (totalRows, importedCount, errorCount, warningCount, duplicateCount) and `rows[]` with per-row `status`, `errorMessage`, `warningMessage`, and parsed fields.
- **Structured logging:** On successful commit (dryRun=false), logs `Import completed: Type={ImportType}, PropertyId={PropertyId}, TotalRows={Total}, Imported={Imported}, Errors={Errors}, By={UserId}`.
- **Error shapes:** Invalid file → 400 with `invalid_file`/`invalid_file_type`; unauthorized property → 403 with `forbidden`; row-level errors include field names and specific parse failure messages.

## Deviations

- Added `CsvParsingHelpers.cs` as a dedicated file (plan suggested it could be inline or separate — chose separate for clarity and reuse).
- Used generic `ImportPreviewResponse<TRow>` instead of non-generic class — keeps the same JSON shape while providing type safety per endpoint.
- RentPaymentCsvParser accepts `IGroupAccessService` as additional parameter (plan had it accepting only db/userId/role) — needed to resolve accessible properties via group membership.

## Known Issues

- Integration tests for import endpoints do not yet exist (T02 responsibility).
- Currency detection from CSV amount column symbols (e.g., $100 → USD) is handled at the parsing level (symbol stripping) but doesn't override the property's default currency — could be enhanced if needed.

## Files Created/Modified

- `GurkanApi/Controllers/ImportController.cs` — New controller with two POST import endpoints, dryRun support, property access checks
- `GurkanApi/Services/AirbnbCsvParser.cs` — Airbnb CSV parser with 20+ column aliases, Turkish locale, multi-format dates
- `GurkanApi/Services/RentPaymentCsvParser.cs` — Rent payment CSV parser with property/tenant name resolution, duplicate detection
- `GurkanApi/Services/CsvParsingHelpers.cs` — Shared CSV utilities (date, decimal, line splitting, header normalization)
- `GurkanApi/DTOs/Import/ImportPreviewResponse.cs` — Generic response DTO with summary + typed rows
- `GurkanApi/DTOs/Import/ImportRowResult.cs` — AirbnbImportRow and RentPaymentImportRow DTOs
- `GurkanApi/DTOs/Import/ImportSummary.cs` — Summary counts DTO (totalRows, importedCount, errorCount, warningCount, duplicateCount)
