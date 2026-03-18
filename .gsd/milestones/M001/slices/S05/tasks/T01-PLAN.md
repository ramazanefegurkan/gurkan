---
estimated_steps: 9
estimated_files: 9
---

# T01: Build document backend — entity, controller, migration, and integration tests

**Slice:** S05 — Döküman Yönetimi
**Milestone:** M001

## Description

Create the complete backend for document management: entity, enum, controller with 4 endpoints (multipart upload, list, download, delete), EF Core migration, and integration tests. This is the core work and the only novel element in S05 — multipart file upload/download instead of JSON CRUD. The controller follows the exact same pattern as `BillsController`/`ExpensesController` (nested route under `/api/properties/{propertyId}/documents`, group access check via `IGroupAccessService`, structured logging), with the difference being `[FromForm]` multipart binding instead of `[FromBody]` JSON and reading/writing files to a configured upload directory.

**Relevant skills:** `test` (for integration test patterns)

## Steps

1. **Add `DocumentCategory` enum to `GurkanApi/Entities/Enums.cs`:**
   - Values: `TitleDeed`, `Contract`, `Insurance`, `Invoice`, `Photo`, `Other`
   - Add after the existing `BillPaymentStatus` enum at the end of the file

2. **Create `GurkanApi/Entities/Document.cs` entity:**
   - Properties: `Id` (Guid), `PropertyId` (Guid, FK to Property), `FileName` (string — stored name with GUID prefix), `OriginalFileName` (string — user's original filename), `Category` (DocumentCategory), `ContentType` (string), `FileSize` (long), `FilePath` (string — relative path from base upload dir), `UploadedBy` (Guid, FK to User), `UploadedAt` (DateTime)
   - Navigation properties: `Property` (Property), `Uploader` (User)

3. **Update `GurkanApi/Data/ApplicationDbContext.cs`:**
   - Add `public DbSet<Document> Documents { get; set; }`
   - Add Fluent API config in `OnModelCreating`: table name `"Documents"`, PropertyId FK with cascade delete, UploadedBy FK with restrict delete, required fields (FileName, OriginalFileName, ContentType, FilePath), max length constraints (FileName 500, OriginalFileName 255, ContentType 100, FilePath 1000)

4. **Generate EF Core migration:**
   - Run: `dotnet ef migrations add AddDocuments --project GurkanApi/`
   - Verify it creates the Documents table with correct columns and FKs

5. **Add `FileStorage:BasePath` config to `GurkanApi/appsettings.json`:**
   - Add `"FileStorage": { "BasePath": "uploads" }` to the root config object
   - Also add to `appsettings.Development.json` if it exists

6. **Create `GurkanApi/DTOs/Documents/DocumentResponse.cs`:**
   - Properties: `Id` (Guid), `PropertyId` (Guid), `OriginalFileName` (string), `Category` (DocumentCategory), `ContentType` (string), `FileSize` (long), `UploadedBy` (Guid), `UploadedAt` (DateTime)
   - Note: Don't expose internal `FileName` or `FilePath` — those are implementation details

7. **Create `GurkanApi/Controllers/DocumentsController.cs`:**
   - Route: `[Route("api/properties/{propertyId:guid}/documents")]`
   - Constructor DI: `ApplicationDbContext`, `IGroupAccessService`, `ILogger<DocumentsController>`, `IConfiguration` (for FileStorage:BasePath)
   - **Private helper** `CheckPropertyAccess(Guid propertyId)` — same pattern as BillsController
   - **Private helper** `GetUploadBasePath()` — reads `FileStorage:BasePath` from config, defaults to `"uploads"`
   - **Allowed extensions constant:** `.pdf`, `.jpg`, `.jpeg`, `.png`, `.doc`, `.docx`, `.xls`, `.xlsx`
   - **POST (upload):**
     - `[HttpPost]`, `[RequestSizeLimit(25 * 1024 * 1024)]` (25MB)
     - Parameters: `Guid propertyId`, `[FromForm] IFormFile file`, `[FromForm] DocumentCategory category`
     - Validate: file not null/empty, extension in whitelist (check both extension and content type), file size > 0
     - Generate stored filename: `{Guid.NewGuid()}-{originalFileName}`
     - File path: `documents/{propertyId}/{storedFileName}`
     - Full path: `Path.Combine(basePath, filePath)`
     - Create directory if not exists: `Directory.CreateDirectory(Path.GetDirectoryName(fullPath))`
     - Write file: `using var stream = new FileStream(fullPath, FileMode.Create); await file.CopyToAsync(stream);`
     - Create Document entity, save to DB
     - Return 201 with DocumentResponse
     - Structured log: `"Document uploaded: DocumentId={DocumentId}, PropertyId={PropertyId}, FileName={FileName}, Size={Size}, By={UserId}"`
   - **GET (list):**
     - `[HttpGet]`
     - Optional query param: `[FromQuery] DocumentCategory? category`
     - Return all documents for property, ordered by UploadedAt descending
     - Return 200 with `List<DocumentResponse>`
   - **GET (download):**
     - `[HttpGet("{documentId:guid}/download")]`
     - Load document, verify it belongs to the property
     - Read file from disk: `var stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read)`
     - Return `File(stream, document.ContentType, document.OriginalFileName)` — this sets Content-Disposition: attachment
     - If file not found on disk, return 404
     - Structured log: `"Document downloaded: DocumentId={DocumentId}, By={UserId}"`
   - **DELETE:**
     - `[HttpDelete("{documentId:guid}")]`
     - Load document, verify it belongs to the property
     - Delete file from disk (if exists — don't fail if file already gone)
     - Remove from DB, save
     - Return 204 NoContent
     - Structured log: `"Document deleted: DocumentId={DocumentId}, PropertyId={PropertyId}, By={UserId}"`

8. **Update `GurkanApi.Tests/IntegrationTests/TestFixture.cs`:**
   - Add `"Documents"` to the TRUNCATE list — must come before `"Properties"` and `"Users"` in the statement
   - Current TRUNCATE order: `"RentIncreases", "RentPayments", "ShortTermRentals", "Expenses", "Bills", "Tenants", "PropertyNotes", "RefreshTokens", "GroupMembers", "Properties", "Groups", "Users"`
   - Insert `"Documents"` after `"Bills"` (or anywhere before `"Properties"`)
   - Configure `FileStorage:BasePath` in test WebApplicationFactory to point to a temp directory — override in `ConfigureWebHost` via `builder.UseSetting("FileStorage:BasePath", Path.Combine(Path.GetTempPath(), "gurkan-test-uploads"))`. Clean up temp dir in `ResetDatabaseAsync`.

9. **Create `GurkanApi.Tests/IntegrationTests/DocumentTests.cs`:**
   - Test class with `[Trait("Category", "S05")]`
   - Use the same `IClassFixture<CustomWebApplicationFactory>` pattern as other test files
   - **Helper method** `CreateMultipartContent(string fileName, string contentType, byte[] content, DocumentCategory category)` — builds `MultipartFormDataContent` with `StreamContent` for file and `StringContent` for category
   - **Tests to write:**
     1. `UploadDocument_ValidFile_Returns201` — upload a small test PDF (can just use byte array with "fake PDF content"), verify 201 response with correct metadata
     2. `ListDocuments_ReturnsUploadedFiles` — upload 2 files, GET list, verify count and order (newest first)
     3. `DownloadDocument_ReturnsFileContent` — upload file with known content, download, verify byte content matches
     4. `DeleteDocument_Removes_Returns204` — upload, delete, verify 204, then GET list returns empty
     5. `UploadDocument_InvalidExtension_Returns400` — try uploading a `.exe` file, expect 400
     6. `CrossGroupAccess_Returns403` — create property in one group, try to upload/list/download from another user's group, expect 403
     7. `DownloadDocument_NotFound_Returns404` — try downloading a non-existent document ID
     8. `ListDocuments_FilterByCategory_ReturnsFiltered` — upload files with different categories, filter by one category, verify only matching returned
   - Follow the auth helper pattern from existing tests (register user, login, use JWT token in requests)

## Must-Haves

- [ ] `DocumentCategory` enum with 6 values added to Enums.cs
- [ ] `Document` entity with all required fields and FK relationships
- [ ] `ApplicationDbContext` updated with Documents DbSet and Fluent API config
- [ ] EF Core migration generated and applies cleanly
- [ ] `DocumentsController` with upload (POST multipart), list (GET), download (GET), delete (DELETE) endpoints
- [ ] Group-based access control on all endpoints via `IGroupAccessService`
- [ ] File extension whitelist validation (PDF, JPG, JPEG, PNG, DOC, DOCX, XLS, XLSX)
- [ ] 25MB file size limit via `[RequestSizeLimit]`
- [ ] Download returns file with Content-Disposition: attachment
- [ ] Structured logging on upload, download, delete operations
- [ ] Integration tests covering all 8 scenarios with `[Trait("Category", "S05")]`
- [ ] All existing tests still pass (regression)

## Verification

- `dotnet test GurkanApi.Tests/ --filter "Category=S05"` — all 8 document tests pass
- `dotnet test GurkanApi.Tests/` — all tests pass (no regression)
- `dotnet ef database update --project GurkanApi/` — migration applies cleanly

## Inputs

- `GurkanApi/Controllers/BillsController.cs` — reference pattern for controller structure, access check, logging
- `GurkanApi/Entities/Enums.cs` — add DocumentCategory enum here
- `GurkanApi/Data/ApplicationDbContext.cs` — add Documents DbSet, follow existing Fluent API patterns
- `GurkanApi/appsettings.json` — add FileStorage:BasePath config
- `GurkanApi.Tests/IntegrationTests/TestFixture.cs` — add Documents to TRUNCATE, configure test upload path
- `GurkanApi.Tests/IntegrationTests/ExpenseAndBillTests.cs` — reference pattern for test structure and auth helpers

## Expected Output

- `GurkanApi/Entities/Document.cs` — new entity file
- `GurkanApi/Entities/Enums.cs` — modified with DocumentCategory enum
- `GurkanApi/Data/ApplicationDbContext.cs` — modified with Documents DbSet + config
- `GurkanApi/Controllers/DocumentsController.cs` — new controller with 4 endpoints
- `GurkanApi/DTOs/Documents/DocumentResponse.cs` — new response DTO
- `GurkanApi/appsettings.json` — modified with FileStorage config
- `GurkanApi/Migrations/*_AddDocuments.cs` — new migration
- `GurkanApi.Tests/IntegrationTests/DocumentTests.cs` — new test file with 8 tests
- `GurkanApi.Tests/IntegrationTests/TestFixture.cs` — modified TRUNCATE list + test upload path config
