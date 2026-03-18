---
estimated_steps: 5
estimated_files: 2
---

# T02: Integration tests for both import endpoints

**Slice:** S03 — Data Import
**Milestone:** M003

## Description

Write integration tests proving both import endpoints work correctly: valid imports create records, dryRun returns preview without DB writes, validation catches malformed data with row-level errors, authorization blocks cross-group access, and duplicate detection works. Follow the existing DocumentTests pattern for multipart file upload and the HttpClientExtensions for auth helpers.

**Relevant skills:** `test`

## Steps

1. **Create `ImportTests.cs`** in `GurkanApi.Tests/IntegrationTests/`:
   - Add `[Trait("Category", "S03")]` on the class
   - Implement `IClassFixture<CustomWebApplicationFactory>` and `IAsyncLifetime`
   - In `InitializeAsync`: reset DB, login as admin, create a group, add a user, create a property with a tenant (needed for rent payment import tests). Store property ID, tenant name, group ID, etc.

2. **Add helper to create multipart CSV content:**
   ```csharp
   private static MultipartFormDataContent CreateCsvContent(string csvContent, string fileName = "test.csv")
   {
       var multipart = new MultipartFormDataContent();
       var fileContent = new ByteArrayContent(System.Text.Encoding.UTF8.GetBytes(csvContent));
       fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("text/csv");
       multipart.Add(fileContent, "file", fileName);
       return multipart;
   }
   ```

3. **Airbnb CSV import tests:**
   - `AirbnbImport_DryRun_ReturnsPreviewWithoutDbWrites` — upload valid CSV with `dryRun=true`, assert response has correct row count and importedCount=0 (since dryRun), then query `/api/properties/{id}/short-term-rentals` and confirm no new records.
   - `AirbnbImport_Commit_CreatesShortTermRentalRecords` — upload valid CSV with `dryRun=false`, assert response has importedCount matching row count, then query short-term rentals list and verify records exist with correct GuestName, CheckIn, NightCount, TotalAmount values.
   - `AirbnbImport_MalformedCsv_ReturnsRowErrors` — upload CSV with invalid dates or missing required fields, assert response has errorCount > 0 and rows with Status="Error" contain meaningful errorMessage.
   - `AirbnbImport_DuplicateDetection_ReturnsWarning` — first import a CSV (dryRun=false), then import same CSV again with dryRun=true, assert duplicate rows have Status="Warning".
   
   **Sample valid Airbnb CSV content:**
   ```
   Start Date,Guest,Nights,Gross Earnings,Host Fee,Amount
   2025-06-01,John Doe,3,450.00,67.50,382.50
   2025-06-10,Jane Smith,5,750.00,112.50,637.50
   ```

4. **Rent payment CSV import tests:**
   - `RentPaymentImport_Commit_CreatesPaymentRecords` — upload valid CSV with known PropertyName and TenantName (created in InitializeAsync), assert records created with correct Amount, DueDate, Status.
   - `RentPaymentImport_UnknownTenant_ReturnsError` — upload CSV with a tenant name that doesn't exist, assert row has Status="Error" with message about tenant not found.
   - `RentPaymentImport_DryRun_NoDbWrites` — upload valid CSV with dryRun=true, assert no new RentPayment records in DB.
   
   **Sample valid rent payment CSV content:**
   ```
   PropertyName,TenantName,Amount,Currency,DueDate,Status
   Test Property,Test Tenant,5000,TRY,2025-01-01,Paid
   Test Property,Test Tenant,5000,TRY,2025-02-01,Pending
   ```

5. **Authorization test:**
   - `Import_CrossGroupAccess_Returns403` — login as user who is NOT in the property's group, attempt Airbnb CSV import, assert 403 Forbidden.

## Must-Haves

- [ ] All tests use `[Trait("Category", "S03")]` so they can be filtered with `dotnet test --filter "Category=S03"`
- [ ] At least 8 test methods covering: dryRun preview, commit, validation errors, duplicate detection, tenant resolution, unknown tenant, authorization
- [ ] Tests create real CSV content as strings (not external files) for reproducibility
- [ ] Tests verify DB state after import (query the list endpoints to confirm records exist or don't exist)
- [ ] Multipart upload pattern matches DocumentTests (ByteArrayContent + MediaTypeHeaderValue + MultipartFormDataContent)

## Verification

- `dotnet test --filter "Category=S03"` — all tests pass (0 failures)
- No test uses `Thread.Sleep` or hardcoded delays
- All tests clean up via `ResetDatabaseAsync()` in `InitializeAsync`

## Inputs

- `GurkanApi/Controllers/ImportController.cs` — the endpoints to test (from T01)
- `GurkanApi.Tests/IntegrationTests/DocumentTests.cs` — pattern for multipart file upload in integration tests: `MultipartFormDataContent`, `ByteArrayContent`, `MediaTypeHeaderValue`
- `GurkanApi.Tests/IntegrationTests/TestFixture.cs` — `CustomWebApplicationFactory`, `ResetDatabaseAsync()`. Check if the TRUNCATE statement includes all necessary tables (ShortTermRentals and RentPayments should already be there).
- `GurkanApi.Tests/IntegrationTests/HttpClientExtensions.cs` — `LoginAsAsync()`, `RegisterUserAsync()`, `ReadAsApiJsonAsync<T>()`, `ApiJsonOptions`
- The import response DTO shapes from T01: `ImportPreviewResponse` with `Summary` (TotalRows, ImportedCount, ErrorCount, WarningCount, DuplicateCount) and `Rows` (list of row results with RowNumber, Status, ErrorMessage, etc.)
- K006: Use `ApiJsonOptions` (with `JsonStringEnumConverter`) for all deserialization
- K007: Tests are run with parallelization disabled (already configured in AssemblyInfo.cs)

## Observability Impact

- **Test output signals:** `dotnet test --filter "Category=S03"` reports pass/fail for each import scenario — a future agent can run this to verify import behavior hasn't regressed.
- **Failure visibility:** Test assertions cover row-level error messages and HTTP status codes, making import failures visible through test output rather than requiring manual CSV upload.
- **Inspection:** No runtime observability changes — this task adds test coverage only. The import endpoints' existing structured logs and response shapes (from T01) remain the runtime inspection surface.

## Expected Output

- `GurkanApi.Tests/IntegrationTests/ImportTests.cs` — 8+ test methods proving both import flows, validation, authorization, and duplicate detection all work correctly
