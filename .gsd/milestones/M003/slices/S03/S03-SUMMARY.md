---
id: S03
parent: M003
milestone: M003
provides:
  - ImportController with POST /api/import/airbnb-csv and POST /api/import/rent-payments endpoints (multipart CSV upload, dryRun preview, row-level validation, DB record creation)
  - AirbnbCsvParser with 20+ column aliases, Turkish locale decimal/date handling, duplicate detection (CheckIn+GuestName+PropertyId)
  - RentPaymentCsvParser with property/tenant name resolution from DB, duplicate detection, enum parsing
  - CsvParsingHelpers shared utilities (multi-format date parsing, Turkish decimal, CSV line splitting, header normalization)
  - Import DTOs (generic ImportPreviewResponse<TRow>, AirbnbImportRow, RentPaymentImportRow, ImportSummary)
  - Frontend /import page with two-tab layout, file upload, dryRun preview table, confirm flow, row-level error/warning highlighting
  - 9 integration tests proving both import flows end-to-end
requires:
  - slice: S01
    provides: Production-accessible backend for testing import against real data
affects:
  - none (import is a standalone feature — no downstream slice depends on it)
key_files:
  - GurkanApi/Controllers/ImportController.cs
  - GurkanApi/Services/AirbnbCsvParser.cs
  - GurkanApi/Services/RentPaymentCsvParser.cs
  - GurkanApi/Services/CsvParsingHelpers.cs
  - GurkanApi/DTOs/Import/ImportPreviewResponse.cs
  - GurkanApi/DTOs/Import/ImportRowResult.cs
  - GurkanApi/DTOs/Import/ImportSummary.cs
  - GurkanApi.Tests/IntegrationTests/ImportTests.cs
  - gurkan-ui/src/pages/Import/ImportPage.tsx
  - gurkan-ui/src/pages/Import/Import.css
  - gurkan-ui/src/api/client.ts
  - gurkan-ui/src/types/index.ts
  - gurkan-ui/src/App.tsx
  - gurkan-ui/src/components/Layout.tsx
key_decisions:
  - dryRun=true by default — all import endpoints preview without writing to DB unless explicitly confirmed (D021)
  - CSV parsers are plain classes, not DI-registered — instantiated directly in controller since they have no shared state (D022)
  - Generic ImportPreviewResponse<TRow> with typed row DTOs instead of untyped dictionaries — compile-time safety, clean JSON serialization
  - Import bypasses ShortTermRental overlap checks — historical data may legitimately overlap
  - Tab-style switcher on frontend between Airbnb and Rent sections rather than showing both simultaneously
patterns_established:
  - CSV import pattern: file upload → dryRun=true preview → review table with summary stats → dryRun=false commit → success summary. Reusable for any future import type (expenses, bills).
  - CsvParsingHelpers static class for shared parsing utilities across all CSV parsers
  - Column alias mapping: normalized header → logical field name, first match wins — handles diverse CSV column naming
  - Row-level validation with status (Success/Error/Warning), field-specific error messages, and colored table rows in frontend
  - Before/after count pattern in integration tests for entities with auto-generated related records (K023)
observability_surfaces:
  - Structured log on commit: "Import completed: Type={ImportType}, PropertyId={PropertyId}, TotalRows={Total}, Imported={Imported}, Errors={Errors}, By={UserId}"
  - Response body: summary (totalRows/importedCount/errorCount/warningCount/duplicateCount) + rows[] with per-row status/errors
  - Frontend error-banner div surfaces API failures; console.warn logs import errors
  - Row-level error/warning messages render inline in preview table with colored backgrounds
drill_down_paths:
  - .gsd/milestones/M003/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M003/slices/S03/tasks/T02-SUMMARY.md
  - .gsd/milestones/M003/slices/S03/tasks/T03-SUMMARY.md
duration: 52m
verification_result: passed
completed_at: 2026-03-18
---

# S03: Data Import

**CSV import backend + frontend for Airbnb short-term rental earnings and historical rent payment bulk upload, with dryRun preview, row-level validation, duplicate detection, and Turkish locale handling**

## What Happened

Built the complete data import feature in three tasks:

**T01 — ImportController + CSV Parsers:** Created the backend infrastructure with two multipart POST endpoints on ImportController. AirbnbCsvParser handles flexible column detection (20+ aliases like "Start Date"/"Check-in"/"CheckIn"), Turkish decimal format (comma separator), 8 date formats, row-type filtering (skips Adjustment/Resolution rows), and computes derived fields (CheckOut from CheckIn+NightCount, NightlyRate from TotalAmount/NightCount). RentPaymentCsvParser resolves property and tenant names from DB (case-insensitive matching within user's accessible properties), detects duplicates (same TenantId+DueDate), and parses Currency/Status/PaymentMethod enums. CsvParsingHelpers provides shared utilities. Both endpoints default to dryRun=true (safe preview) and use `[Authorize]` + group-based access checks. All dates stored as UTC per K012.

**T02 — Integration Tests:** Added 9 integration tests covering both import flows end-to-end: dryRun preview without DB writes, commit creates correct records, malformed CSV produces row-level errors, duplicate detection returns warnings, invalid file extension rejection, rent payment name resolution, unknown tenant errors, and cross-group access denial (403). Also fixed an EF Core LINQ translation bug — `Dictionary.Values.SelectMany()` inside a `Where()` clause isn't SQL-translatable; materialized tenant IDs into a local list first (K022).

**T03 — Frontend Import Page:** Created ImportPage with tab-style switching between Airbnb CSV and Rent Payment sections. Airbnb tab includes a property selector dropdown. Both sections follow the same flow: file select → Preview button (dryRun=true) → preview table with summary stats and row-level status highlighting (red for errors, yellow for warnings) → Confirm button (dryRun=false) → success banner with link to verify records. Added `importAirbnbCsv()` and `importRentPayments()` API client functions. Wired `/import` route and "İçe Aktar" sidebar nav link.

## Verification

- `dotnet test --filter "Category=S03"` — **22/22 tests pass** (13 pre-existing tenant tests + 9 new import tests)
- `dotnet build GurkanApi/GurkanApi.csproj` — 0 errors
- `cd gurkan-ui && npm run build` — 0 errors, 108 modules compiled (42.52 KB CSS, 394.49 KB JS)
- `/import` route wired in App.tsx, "İçe Aktar" nav link in Layout.tsx confirmed
- Import response DTOs match between backend (generic ImportPreviewResponse<TRow>) and frontend TypeScript interfaces

## Requirements Advanced

- R016 — Fully implemented: Airbnb CSV import creates ShortTermRental records, rent payment CSV import creates RentPayment records, both with validation and error reporting

## Requirements Validated

- R016 — 9 integration tests prove: Airbnb CSV parse + preview + commit, rent payment CSV resolve + preview + commit, row-level validation errors, duplicate detection, cross-group 403, invalid file rejection. Frontend import page with two-tab UI built and build-verified.

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

- Added `CsvParsingHelpers.cs` as a dedicated shared file (not in the original plan's file list but mentioned as possible).
- Used generic `ImportPreviewResponse<TRow>` with typed `AirbnbImportRow` and `RentPaymentImportRow` instead of a non-generic response with `Record<string, unknown>` data fields — provides better type safety both on backend and frontend.
- Added `NightlyRate` field to `AirbnbImportRow` — backend computes it but plan didn't explicitly list it in the frontend DTO.
- RentPaymentCsvParser accepts `IGroupAccessService` as additional constructor parameter — needed to resolve accessible properties via group membership, not anticipated in the plan.
- 9 tests instead of planned 8 — added invalid file extension test for extra coverage.

## Known Limitations

- Excel (.xlsx) upload is not supported — only CSV files. Plan mentioned "CSV/Excel" but implementation is CSV-only, which matches the primary use case (Airbnb exports CSV, manual rent history can be prepared as CSV).
- Currency detection from CSV amount symbols (e.g., $100 → USD) strips symbols but doesn't override the property's default currency.
- Airbnb CSV format hasn't been tested with a real Airbnb earnings export — column alias mapping covers known formats but may need adjustment when real data is tested (UAT step).

## Follow-ups

- UAT with real Airbnb CSV file to validate column detection works correctly with actual export format.
- Consider adding Excel (.xlsx) import support if users find CSV preparation inconvenient.

## Files Created/Modified

- `GurkanApi/Controllers/ImportController.cs` — New: Two POST import endpoints with dryRun, multipart upload, group-based auth
- `GurkanApi/Services/AirbnbCsvParser.cs` — New: Airbnb CSV parser with 20+ column aliases, Turkish locale, multi-format dates
- `GurkanApi/Services/RentPaymentCsvParser.cs` — New: Rent payment parser with property/tenant name resolution, duplicate detection
- `GurkanApi/Services/CsvParsingHelpers.cs` — New: Shared CSV utilities (date, decimal, line splitting, header normalization)
- `GurkanApi/DTOs/Import/ImportPreviewResponse.cs` — New: Generic response DTO with summary + typed rows
- `GurkanApi/DTOs/Import/ImportRowResult.cs` — New: AirbnbImportRow and RentPaymentImportRow DTOs
- `GurkanApi/DTOs/Import/ImportSummary.cs` — New: Summary counts DTO
- `GurkanApi.Tests/IntegrationTests/ImportTests.cs` — New: 9 integration tests for both import flows
- `gurkan-ui/src/pages/Import/ImportPage.tsx` — New: Import page with two-tab layout, preview/confirm flows
- `gurkan-ui/src/pages/Import/Import.css` — New: Import-specific styles (tabs, row highlighting, summary cards)
- `gurkan-ui/src/api/client.ts` — Modified: Added importAirbnbCsv() and importRentPayments() functions
- `gurkan-ui/src/types/index.ts` — Modified: Added import response TypeScript interfaces
- `gurkan-ui/src/App.tsx` — Modified: Added /import route
- `gurkan-ui/src/components/Layout.tsx` — Modified: Added "İçe Aktar" nav link

## Forward Intelligence

### What the next slice should know
- Import endpoints exist at `/api/import/airbnb-csv` and `/api/import/rent-payments`. They don't affect any other slice's data model or API surface. Mobile app (S04-S05) doesn't need import — it's a web-only feature.
- The CSV import pattern (dryRun preview → confirm) is reusable if expense/bill import is ever needed.

### What's fragile
- Airbnb CSV column alias mapping — covers 20+ known aliases but real Airbnb exports may have different column names or format variations. The first real CSV test will reveal if adjustments are needed.
- RentPaymentCsvParser property/tenant name resolution uses case-insensitive exact match — typos or slight name variations in CSV won't match.

### Authoritative diagnostics
- `dotnet test --filter "Category=S03"` — 22 tests passing is the definitive proof that both import flows work correctly with validation, authorization, and duplicate detection.
- Import response body `summary` field — totalRows/importedCount/errorCount/warningCount/duplicateCount provides complete import outcome at a glance.

### What assumptions changed
- Original plan mentioned "CSV/Excel" for rent payment import — implemented CSV-only, which is sufficient for the use case. Excel support can be added if needed.
- RentPaymentCsvParser needed IGroupAccessService (not just DbContext + userId) to resolve accessible properties — the access model is more complex than simple user→property lookup.
