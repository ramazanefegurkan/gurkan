---
id: T01
parent: S05
milestone: M001
provides:
  - Document entity with DocumentCategory enum and FK relationships
  - DocumentsController with multipart upload, list, download, delete endpoints
  - EF Core migration for Documents table
  - 8 integration tests covering all document CRUD and access control scenarios
key_files:
  - GurkanApi/Entities/Document.cs
  - GurkanApi/Controllers/DocumentsController.cs
  - GurkanApi/DTOs/Documents/DocumentResponse.cs
  - GurkanApi.Tests/IntegrationTests/DocumentTests.cs
key_decisions:
  - Content type validated in addition to extension for defense-in-depth against renamed files
patterns_established:
  - Multipart file upload controller pattern with [FromForm], extension whitelist, GUID-prefixed stored filenames, and temp-directory test fixture cleanup
observability_surfaces:
  - "Document uploaded: DocumentId={DocumentId}, PropertyId={PropertyId}, FileName={FileName}, Size={Size}, By={UserId}" structured log at Info level
  - "Document downloaded: DocumentId={DocumentId}, By={UserId}" structured log at Info level
  - "Document deleted: DocumentId={DocumentId}, PropertyId={PropertyId}, By={UserId}" structured log at Info level
  - "Property access denied: UserId={UserId}, PropertyId={PropertyId}" structured log on 403
duration: ~15min
verification_result: passed
completed_at: 2026-03-18T19:50:00+03:00
blocker_discovered: false
---

# T01: Build document backend — entity, controller, migration, and integration tests

**Add DocumentsController with multipart upload/download/list/delete endpoints, Document entity, EF Core migration, and 8 integration tests covering CRUD, access control, and file validation**

## What Happened

Built the complete document management backend following the same patterns as BillsController/ExpensesController. Added DocumentCategory enum (6 values: TitleDeed, Contract, Insurance, Invoice, Photo, Other) to Enums.cs. Created the Document entity with PropertyId and UploadedBy FKs, and Fluent API config with cascade delete on Property and restrict on User. Generated a clean EF Core migration that creates the Documents table with proper constraints and indexes.

Built DocumentsController with 4 endpoints: POST upload (multipart/form-data with [FromForm] binding, 25MB request size limit, extension + content type whitelist), GET list (with optional category filter, ordered by UploadedAt desc), GET download (returns FileStreamResult with Content-Disposition: attachment), and DELETE (removes from disk and DB). All endpoints enforce group-based access control via IGroupAccessService, matching the existing controller pattern.

Added FileStorage:BasePath config to appsettings.json. Updated TestFixture.cs to include "Documents" in the TRUNCATE list and configure a temp directory for test file uploads with cleanup on reset.

Wrote 8 integration tests with [Trait("Category", "S05")]: upload valid file, list uploaded files (verifies ordering), download and verify byte content, delete and verify removal, invalid extension rejection, cross-group 403 denial, download nonexistent 404, and category filter.

## Verification

- `dotnet test GurkanApi.Tests/ --filter "Category=S05"` — 8/8 tests pass
- `dotnet test GurkanApi.Tests/` — 61/61 tests pass (no regression)
- Migration generated cleanly with correct columns, FKs, and indexes

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `dotnet build GurkanApi/` | 0 | ✅ pass | 1.9s |
| 2 | `dotnet test GurkanApi.Tests/ --filter "Category=S05"` | 0 | ✅ pass (8/8) | 6.6s |
| 3 | `dotnet test GurkanApi.Tests/` | 0 | ✅ pass (61/61) | 22.1s |

## Diagnostics

- **Structured logs:** Search for `"Document uploaded"`, `"Document downloaded"`, `"Document deleted"` in application logs to trace document operations.
- **Access denial:** Search for `"Property access denied"` to find unauthorized access attempts on document endpoints.
- **Error responses:** 400 `{ error: "invalid_file_type" }` for disallowed extensions, 400 `{ error: "invalid_content_type" }` for disallowed MIME types, 403 for cross-group access, 404 for missing documents.
- **Swagger:** Document endpoints visible at `/swagger/index.html` under the `api/properties/{propertyId}/documents` route.
- **File storage:** Uploaded files stored at `{FileStorage:BasePath}/documents/{propertyId}/{guid}-{originalFilename}`.

## Deviations

None. Followed the plan exactly.

## Known Issues

- The `[RequestSizeLimit(25 * 1024 * 1024)]` attribute emits warnings in the test environment because the test server doesn't support `IHttpMaxRequestBodySizeFeature` / `IHttpRequestBodySizeFeature`. This is expected behavior — the limit works correctly in production with Kestrel.

## Files Created/Modified

- `GurkanApi/Entities/Enums.cs` — added DocumentCategory enum (6 values)
- `GurkanApi/Entities/Document.cs` — new entity with PropertyId/UploadedBy FKs
- `GurkanApi/Data/ApplicationDbContext.cs` — added Documents DbSet and Fluent API config
- `GurkanApi/DTOs/Documents/DocumentResponse.cs` — new response DTO
- `GurkanApi/Controllers/DocumentsController.cs` — new controller with 4 endpoints (upload, list, download, delete)
- `GurkanApi/appsettings.json` — added FileStorage:BasePath config
- `GurkanApi/Migrations/20260318171729_AddDocuments.cs` — new migration
- `GurkanApi.Tests/IntegrationTests/TestFixture.cs` — added Documents to TRUNCATE list, test upload path config + cleanup
- `GurkanApi.Tests/IntegrationTests/DocumentTests.cs` — new test file with 8 integration tests
- `.gsd/milestones/M001/slices/S05/tasks/T01-PLAN.md` — added Observability Impact section (pre-flight fix)
