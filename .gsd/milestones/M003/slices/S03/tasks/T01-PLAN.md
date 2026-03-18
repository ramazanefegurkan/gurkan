---
estimated_steps: 8
estimated_files: 7
---

# T01: Build ImportController with CSV parsers and DTOs

**Slice:** S03 — Data Import
**Milestone:** M003

## Description

Create the backend import infrastructure: ImportController with two endpoints (Airbnb CSV, rent payment CSV), two CSV parser services, and import DTOs. This is the riskiest task in the slice — Airbnb CSV format handling, Turkish locale decimal/date parsing, and row-level validation must all work correctly. The `dryRun` query parameter pattern lets the same endpoint serve both preview and commit modes.

**Relevant skills:** `test` (for understanding existing test patterns — but this task doesn't write tests, T02 does)

## Steps

1. **Create import DTOs** in `GurkanApi/DTOs/Import/`:
   - `ImportRowResult.cs` — represents one parsed row: `int RowNumber`, `string Status` ("Success"/"Error"/"Warning"), `string? ErrorMessage`, `string? WarningMessage`, plus the parsed data as a dictionary or typed fields. For Airbnb: `string? GuestName`, `DateTime? CheckIn`, `DateTime? CheckOut`, `int? NightCount`, `decimal? TotalAmount`, `decimal? PlatformFee`, `decimal? NetAmount`. For rent payments: `string? PropertyName`, `string? TenantName`, `decimal? Amount`, `string? Currency`, `DateTime? DueDate`, `DateTime? PaidDate`, `string? Status`, `string? PaymentMethod`.
   - `ImportSummary.cs` — `int TotalRows`, `int ImportedCount`, `int ErrorCount`, `int WarningCount`, `int DuplicateCount`.
   - `ImportPreviewResponse.cs` — `ImportSummary Summary`, `List<ImportRowResult> Rows`.
   - Use a single `ImportRowResult` class with nullable fields for both import types, discriminated by which endpoint returns it. Alternatively, use separate `AirbnbImportRow` and `RentPaymentImportRow` DTOs — choose whichever is cleaner. A common approach: generic row with `Dictionary<string, object?> Data` for the parsed fields, plus typed DTOs for each flow.

2. **Create `AirbnbCsvParser.cs`** in `GurkanApi/Services/`:
   - Method: `Task<List<AirbnbImportRow>> ParseAsync(Stream csvStream, Guid propertyId)` (or similar)
   - Read CSV using `StreamReader` with `new UTF8Encoding(encoderShouldEmitUTF8Identifier: false)` but let the BOM be consumed automatically (StreamReader detects BOM by default)
   - First line = headers. Match column names case-insensitively, trimmed. Support aliases: "Start Date"/"Check-in"/"CheckIn" → CheckIn, "Guest"/"Guest Name" → GuestName, "Nights"/"Night Count" → NightCount, "Amount"/"Net Amount"/"Payout" → NetAmount, "Gross Earnings"/"Total"/"Total Amount" → TotalAmount, "Host Fee"/"Service Fee"/"Platform Fee" → PlatformFee, "Listing"/"Property" → ignored (we use propertyId param)
   - For each data row, split by comma with basic quote handling (if a field starts with `"`, read until closing `"`). Use a helper method.
   - Date parsing: try `DateTime.TryParseExact` with formats: "yyyy-MM-dd", "MM/dd/yyyy", "dd/MM/yyyy", "dd.MM.yyyy", "M/d/yyyy". Apply `DateTime.SpecifyKind(parsed, DateTimeKind.Utc)`.
   - Decimal parsing: try `decimal.TryParse` with `CultureInfo.InvariantCulture` first. If fails, strip periods (thousands separator in Turkish), replace comma with period, try again. Handle currency symbols ($, €, ₺) by stripping them.
   - Compute CheckOut = CheckIn + NightCount days (if NightCount is present and CheckOut is not)
   - Compute NightlyRate = TotalAmount / NightCount (if NightCount > 0)
   - Filter: skip rows where Type column = "Adjustment", "Resolution", or empty. Include "Reservation", "Payout", or when no Type column exists.
   - Validation per row: required fields are CheckIn (or Start Date) and at least one of Amount/TotalAmount. If missing, mark row as Error. If date parsing fails, mark as Error with field name.
   - Return list of `AirbnbImportRow` with RowNumber, Status, parsed fields, and error/warning messages.

3. **Create `RentPaymentCsvParser.cs`** in `GurkanApi/Services/`:
   - Method: `Task<List<RentPaymentImportRow>> ParseAsync(Stream csvStream, ApplicationDbContext db, Guid userId, string userRole)` — needs DB access to resolve property/tenant names
   - Column mapping (case-insensitive): "PropertyName"/"Property Name"/"Property" → property lookup, "PropertyId" → direct GUID, "TenantName"/"Tenant Name"/"Tenant" → tenant lookup, "TenantId" → direct GUID, "Amount" → decimal, "Currency" → enum parse, "DueDate"/"Due Date" → DateTime, "PaidDate"/"Paid Date" → DateTime (optional), "Status" → enum parse, "PaymentMethod"/"Payment Method" → enum parse (optional)
   - Property resolution: find by name (exact match, case-insensitive) within user's accessible properties. Use `IGroupAccessService.CanAccessPropertyAsync()` or query properties by group membership. If ambiguous (multiple matches), mark as Error.
   - Tenant resolution: find by FullName (exact match, case-insensitive) within the resolved property. If not found, mark as Error.
   - Duplicate detection: check if RentPayment with same DueDate + TenantId already exists → mark as Warning.
   - Date and decimal parsing: same helper methods as AirbnbCsvParser (share a `CsvParsingHelpers` static class or similar).

4. **Create shared CSV parsing helpers:**
   - Either a static `CsvParsingHelpers` class or make the parsers share utility methods.
   - `TryParseDate(string input, out DateTime result)` — multi-format, returns UTC
   - `TryParseDecimal(string input, out decimal result)` — invariant + Turkish locale fallback
   - `SplitCsvLine(string line)` — split by comma respecting quoted fields
   - `NormalizeHeader(string header)` — lowercase, trim, remove extra spaces

5. **Create `ImportController.cs`** in `GurkanApi/Controllers/`:
   - `[ApiController]`, `[Route("api/import")]`, `[Authorize]`
   - Constructor injects: `ApplicationDbContext`, `IGroupAccessService`, `ILogger<ImportController>`
   - `[HttpPost("airbnb-csv")]` `[Consumes("multipart/form-data")]` `[RequestSizeLimit(10 * 1024 * 1024)]`
     - Parameters: `IFormFile file`, `[FromQuery] Guid propertyId`, `[FromQuery] bool dryRun = true`
     - Check property access via `IGroupAccessService.CanAccessPropertyAsync()`
     - Validate file is not null/empty, has .csv extension
     - Call `AirbnbCsvParser.ParseAsync(file.OpenReadStream(), propertyId)`
     - If `!dryRun` and no Error rows: create ShortTermRental entities for each Success/Warning row, `SaveChangesAsync()`. Set Platform = Airbnb, Currency from property or default TRY.
     - For duplicate detection: before creating, check `_db.ShortTermRentals.AnyAsync(s => s.PropertyId == propertyId && s.CheckIn == row.CheckIn && s.GuestName == row.GuestName)`. Mark as Warning if duplicate found, still create if user confirms (dryRun=false).
     - Log import completion.
     - Return `ImportPreviewResponse` with summary + row details.
   - `[HttpPost("rent-payments")]` `[Consumes("multipart/form-data")]` `[RequestSizeLimit(10 * 1024 * 1024)]`
     - Parameters: `IFormFile file`, `[FromQuery] bool dryRun = true`
     - Call `RentPaymentCsvParser.ParseAsync(file.OpenReadStream(), _db, userId, role)`
     - If `!dryRun` and no Error rows: create RentPayment entities for Success/Warning rows, `SaveChangesAsync()`.
     - Return `ImportPreviewResponse`.

6. **Handle the "no overlap check for imports" constraint:**
   - The existing `ShortTermRentalsController.Create` checks for date overlap. ImportController should NOT check overlap — import creates historical records that may legitimately overlap.
   - ImportController creates ShortTermRental entities directly, bypassing the controller's overlap logic.

7. **Ensure Currency resolution for Airbnb import:**
   - Load the target property to get its default currency: `var property = await _db.Properties.FindAsync(propertyId)` → use `property.Currency` as default for imported records.
   - If the CSV contains a currency column or currency symbols in amounts, detect and use that instead.

8. **Verify the build compiles:**
   - `dotnet build` must succeed with no errors.

## Must-Haves

- [ ] ImportController with `POST /api/import/airbnb-csv` and `POST /api/import/rent-payments` endpoints
- [ ] AirbnbCsvParser handles flexible column names, Turkish decimal format, multiple date formats
- [ ] RentPaymentCsvParser resolves property/tenant by name within accessible properties
- [ ] dryRun=true returns preview without DB writes; dryRun=false creates records
- [ ] Row-level validation with RowNumber, Status (Success/Error/Warning), error messages
- [ ] Duplicate detection for Airbnb import (same CheckIn + GuestName + PropertyId)
- [ ] All dates stored as UTC (DateTime.SpecifyKind with DateTimeKind.Utc)
- [ ] Group-based authorization on both endpoints

## Verification

- `dotnet build` compiles without errors
- Review that ImportController has `[Authorize]`, `[Consumes("multipart/form-data")]`, and `[RequestSizeLimit]`
- Review that parsers handle at least 3 date formats and Turkish decimal separators
- Review that dryRun parameter defaults to `true` (safe by default)

## Observability Impact

- Signals added: structured log `Import completed: Type={ImportType}, PropertyId={PropertyId}, TotalRows={Total}, Imported={Imported}, Errors={Errors}, By={UserId}`
- How a future agent inspects this: check API response body — `summary` object has totalRows/importedCount/errorCount; `rows[]` has per-row status and errors
- Failure state exposed: row-level error messages with rowNumber and field name, HTTP 400 for invalid files, HTTP 403 for unauthorized property access

## Inputs

- `GurkanApi/Controllers/DocumentsController.cs` — IFormFile upload pattern with `[Consumes("multipart/form-data")]`, property access check pattern
- `GurkanApi/Controllers/ShortTermRentalsController.cs` — ShortTermRental entity creation logic (field mapping, NightCount computation)
- `GurkanApi/Controllers/RentPaymentsController.cs` — RentPayment entity structure, nested route pattern (import endpoint will be at a higher level)
- `GurkanApi/Entities/ShortTermRental.cs` — Target entity fields: GuestName, CheckIn, CheckOut, NightCount, NightlyRate, TotalAmount, PlatformFee, NetAmount, Platform, Currency
- `GurkanApi/Entities/RentPayment.cs` — Target entity fields: TenantId, Amount, Currency, DueDate, PaidDate, Status, PaymentMethod
- `GurkanApi/Entities/Enums.cs` — RentalPlatform (Airbnb, Booking, Direct), Currency (TRY, USD, EUR), RentPaymentStatus, PaymentMethod
- `GurkanApi/Entities/Tenant.cs` — FullName field used for tenant resolution by name
- `GurkanApi/Services/IGroupAccessService.cs` — CanAccessPropertyAsync() for authorization
- `GurkanApi/Extensions/ClaimsPrincipalExtensions.cs` — GetUserId(), GetRole()
- `GurkanApi/Data/ApplicationDbContext.cs` — DbSets for ShortTermRentals, RentPayments, Tenants, Properties
- K012: All dates → `DateTime.SpecifyKind(parsed, DateTimeKind.Utc)` before saving to PostgreSQL
- K011: Backend uses `JsonStringEnumConverter` — enum values serialize as strings

## Expected Output

- `GurkanApi/Controllers/ImportController.cs` — Two POST endpoints with dryRun support, multipart file upload, property access checks
- `GurkanApi/Services/AirbnbCsvParser.cs` — Flexible Airbnb CSV parser with column auto-detection, Turkish locale handling
- `GurkanApi/Services/RentPaymentCsvParser.cs` — Rent payment CSV parser with property/tenant name resolution
- `GurkanApi/DTOs/Import/ImportPreviewResponse.cs` — Response DTO with summary + rows
- `GurkanApi/DTOs/Import/ImportRowResult.cs` — Per-row result with status, errors, parsed data (may be split into AirbnbImportRow + RentPaymentImportRow)
- `GurkanApi/DTOs/Import/ImportSummary.cs` — Summary counts DTO
