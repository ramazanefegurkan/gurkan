---
id: T02
parent: S03
milestone: M003
provides:
  - 9 integration tests proving Airbnb CSV and rent payment CSV import endpoints work correctly
  - Bug fix in RentPaymentCsvParser for EF Core LINQ translation error
key_files:
  - GurkanApi.Tests/IntegrationTests/ImportTests.cs
  - GurkanApi/Services/RentPaymentCsvParser.cs
key_decisions:
  - Used before/after payment count pattern for rent payment DB verification — tenant creation auto-generates RentPayment records, so asserting exact count requires accounting for pre-existing data
patterns_established:
  - CSV multipart upload test helper: CreateCsvContent() builds MultipartFormDataContent from string content
  - Import test pattern: separate admin client setup with group/property/tenant creation in InitializeAsync, matching DocumentTests structure
observability_surfaces:
  - Test output: `dotnet test --filter "Category=S03"` reports 22 passing tests (13 pre-existing + 9 new import tests)
duration: 12m
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T02: Integration tests for both import endpoints

**Added 9 integration tests covering Airbnb and rent payment CSV import endpoints, plus fixed EF Core LINQ translation bug in RentPaymentCsvParser**

## What Happened

Created `ImportTests.cs` with 9 test methods covering all planned scenarios:

**Airbnb CSV Import (5 tests):**
- `AirbnbImport_DryRun_ReturnsPreviewWithoutDbWrites` — verifies dryRun returns preview with correct row count and importedCount=0, confirms no ShortTermRental records in DB
- `AirbnbImport_Commit_CreatesShortTermRentalRecords` — verifies dryRun=false creates records, checks GuestName/NightCount/TotalAmount/CheckIn via list endpoint
- `AirbnbImport_MalformedCsv_ReturnsRowErrors` — invalid date and missing required amount produce error rows with meaningful messages
- `AirbnbImport_DuplicateDetection_ReturnsWarning` — imports CSV, re-imports same CSV, confirms DuplicateCount > 0 and Warning status
- `AirbnbImport_InvalidFileExtension_Returns400` — .txt file returns 400

**Rent Payment CSV Import (3 tests):**
- `RentPaymentImport_Commit_CreatesPaymentRecords` — verifies import adds 2 new payments (checking "Imported from CSV" notes to distinguish from auto-generated)
- `RentPaymentImport_UnknownTenant_ReturnsError` — unknown tenant name produces error row with "not found" message
- `RentPaymentImport_DryRun_NoDbWrites` — dryRun=true doesn't change payment count

**Authorization (1 test):**
- `Import_CrossGroupAccess_Returns403` — user not in property's group gets 403 on Airbnb import

**Bug fix:** Found and fixed an EF Core LINQ translation error in `RentPaymentCsvParser.ParseAsync()`. The query `db.RentPayments.Where(rp => tenantsByProperty.Values.SelectMany(t => t).Select(t => t.Id).Contains(rp.TenantId))` couldn't be translated because `SelectMany(t => t)` on `Dictionary.Values` isn't SQL-translatable. Fixed by materializing tenant IDs into a local list first.

## Verification

- `dotnet test --filter "Category=S03"` — 22 tests pass (0 failures)
- `dotnet build GurkanApi/GurkanApi.csproj` — 0 errors, 0 warnings
- `cd gurkan-ui && npm run build` — succeeds
- No Thread.Sleep or hardcoded delays in tests
- All tests use `[Trait("Category", "S03")]`
- All tests clean up via `ResetDatabaseAsync()` in `InitializeAsync`

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `dotnet test --filter "Category=S03"` | 0 | ✅ pass (22 tests) | 7.2s |
| 2 | `dotnet build GurkanApi/GurkanApi.csproj` | 0 | ✅ pass | 0.8s |
| 3 | `cd gurkan-ui && npm run build` | 0 | ✅ pass | 4.0s |

## Diagnostics

- Run `dotnet test --filter "Category=S03"` to verify all import integration tests pass
- Import tests exercise the full HTTP pipeline: multipart upload → CSV parsing → DB writes → response verification
- Tests verify DB state via existing list endpoints (short-term-rentals and rent-payments), not direct DB queries

## Deviations

- Fixed EF Core LINQ translation bug in `RentPaymentCsvParser.cs` — this was a production code bug discovered by the integration tests, not a test issue. The `SelectMany` on dictionary values wasn't translatable to SQL.
- Used dates outside the tenant's lease period (2026-06-01, 2026-07-01) in rent payment test CSVs to avoid collisions with auto-generated rent payments from tenant creation.
- Added a 9th test (`AirbnbImport_InvalidFileExtension_Returns400`) beyond the planned 8 to cover file validation.

## Known Issues

- Browser verification of the /import page is deferred to T03 (frontend import page not yet built).

## Files Created/Modified

- `GurkanApi.Tests/IntegrationTests/ImportTests.cs` — New: 9 integration tests for import endpoints
- `GurkanApi/Services/RentPaymentCsvParser.cs` — Bug fix: materialized tenant IDs before EF Core query to avoid LINQ translation error
- `.gsd/milestones/M003/slices/S03/tasks/T02-PLAN.md` — Added missing Observability Impact section
