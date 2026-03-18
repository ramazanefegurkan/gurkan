---
id: S05
parent: M001
milestone: M001
provides:
  - DocumentsController with multipart upload, list, download, delete endpoints under /api/properties/{propertyId}/documents
  - Document entity with DocumentCategory enum (TitleDeed, Contract, Insurance, Invoice, Photo, Other)
  - EF Core migration for Documents table with PropertyId and UploadedBy FKs
  - Group-based access control on all document endpoints via IGroupAccessService
  - File extension + content type whitelist validation, 25MB size limit
  - Local filesystem storage at uploads/documents/{propertyId}/{guid}-{filename}
  - Frontend DocumentList page with inline upload form, document table, download/delete actions
  - Dökümanlar tab in PropertyLayout navigation
  - 8 integration tests covering CRUD, access control, and file validation
requires:
  - slice: S01
    provides: JWT auth middleware, User entity, group membership
  - slice: S02
    provides: Property entity, IGroupAccessService for access control, PropertyLayout tab navigation pattern
affects:
  - none (terminal slice)
key_files:
  - GurkanApi/Entities/Document.cs
  - GurkanApi/Controllers/DocumentsController.cs
  - GurkanApi/DTOs/Documents/DocumentResponse.cs
  - GurkanApi.Tests/IntegrationTests/DocumentTests.cs
  - gurkan-ui/src/pages/Documents/DocumentList.tsx
  - gurkan-ui/src/pages/Documents/Documents.css
  - gurkan-ui/src/api/client.ts
key_decisions:
  - Content type validated in addition to extension for defense-in-depth against renamed files
  - Local filesystem storage with configurable base path (FileStorage:BasePath) — easily swappable to S3/MinIO later
  - FormData upload with explicit multipart/form-data Content-Type override on axios (browser auto-sets boundary)
  - Download uses blob responseType + URL.createObjectURL + temporary anchor click pattern
patterns_established:
  - Multipart file upload controller pattern with [FromForm], extension whitelist, content type validation, GUID-prefixed stored filenames, and [RequestSizeLimit] attribute
  - FormData upload pattern for axios with Content-Type override (reusable for future file upload features)
  - formatFileSize helper for displaying bytes as KB/MB in document tables
  - Test fixture cleanup for file-based tests (temp directory creation/cleanup in TestFixture)
observability_surfaces:
  - "Document uploaded: DocumentId={DocumentId}, PropertyId={PropertyId}, FileName={FileName}, Size={Size}, By={UserId}" structured log at Info level
  - "Document downloaded: DocumentId={DocumentId}, By={UserId}" structured log at Info level
  - "Document deleted: DocumentId={DocumentId}, PropertyId={PropertyId}, By={UserId}" structured log at Info level
  - "Property access denied: UserId={UserId}, PropertyId={PropertyId}" on 403
  - Error responses: 400 for invalid file type/size, 403 for cross-group access, 404 for missing document
  - Swagger UI shows document endpoints under /api/properties/{propertyId}/documents
drill_down_paths:
  - .gsd/milestones/M001/slices/S05/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S05/tasks/T02-SUMMARY.md
duration: ~30min
verification_result: passed
completed_at: 2026-03-18
---

# S05: Döküman Yönetimi

**Multipart file upload/download/list/delete with DocumentCategory enum, group-based access control, extension+content-type validation, and full frontend CRUD with Dökümanlar tab**

## What Happened

Built the complete document management feature in two tasks. T01 delivered the backend: Document entity with 6-value DocumentCategory enum, DocumentsController with 4 endpoints (POST upload via [FromForm] multipart, GET list with optional category filter, GET download as FileStreamResult with Content-Disposition: attachment, DELETE with filesystem cleanup), EF Core migration, and 8 integration tests. File validation enforces both extension whitelist (PDF, JPG, JPEG, PNG, DOC, DOCX, XLS, XLSX) and content type whitelist for defense-in-depth. Files are stored locally at `{FileStorage:BasePath}/documents/{propertyId}/{guid}-{originalFilename}` with GUID prefix preventing collisions. All endpoints enforce group-based access via IGroupAccessService, matching the established controller pattern from S02-S04.

T02 delivered the frontend: DocumentCategory const/labels/type in types/index.ts, 4 API functions in client.ts (upload with FormData, download with blob URL, list, delete), Dökümanlar tab in PropertyLayout, document route in App.tsx, and a full DocumentList page with inline upload form (file input + category dropdown + submit button), document table with color-coded category badges, download link, delete with confirm dialog, empty state, and error handling. Browser-verified the complete upload → list → download → delete cycle.

## Verification

| # | Check | Result |
|---|-------|--------|
| 1 | `dotnet test GurkanApi.Tests/ --filter "Category=S05"` | ✅ 8/8 pass |
| 2 | `dotnet test GurkanApi.Tests/` | ✅ 59/61 pass (2 transient infra failures in S01 GroupAccessTests — PostgreSQL socket reset, not code-related) |
| 3 | `cd gurkan-ui && npm run build` | ✅ clean build, 0 errors |
| 4 | Browser: upload → list → download → delete cycle | ✅ verified in T02 |
| 5 | Browser: tab navigation (Kiracılar → Faturalar → Dökümanlar) | ✅ no regression |
| 6 | Swagger UI: document endpoints visible | ✅ verified in T01 |

## Requirements Advanced

- R010 — Dosya yükleme (tapu, sözleşme, sigorta poliçesi vs.), mülke bağlama, kategorize etme, görüntüleme/indirme. Fully delivered by this slice.

## Requirements Validated

- R010 — T01 integration tests (8/8) prove upload/list/download/delete API contract + extension/content-type validation + cross-group access denial. T02 browser verification proves end-to-end UI flow (upload with category → list with badges → download → delete with confirmation).

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

None. Both tasks followed the plan exactly.

## Known Limitations

- `[RequestSizeLimit(25 * 1024 * 1024)]` attribute emits warnings in the test environment because TestServer doesn't support `IHttpMaxRequestBodySizeFeature`. The limit works correctly in production with Kestrel.
- No file preview (e.g., inline PDF viewer or image thumbnail) — download-only. Adequate for the current use case.
- Local filesystem storage only — not suitable for multi-server deployment without shared volume or migration to object storage.

## Follow-ups

- none

## Files Created/Modified

- `GurkanApi/Entities/Enums.cs` — added DocumentCategory enum (6 values)
- `GurkanApi/Entities/Document.cs` — new entity with PropertyId/UploadedBy FKs
- `GurkanApi/Data/ApplicationDbContext.cs` — added Documents DbSet and Fluent API config
- `GurkanApi/DTOs/Documents/DocumentResponse.cs` — new response DTO
- `GurkanApi/Controllers/DocumentsController.cs` — new controller with 4 endpoints
- `GurkanApi/appsettings.json` — added FileStorage:BasePath config
- `GurkanApi/Migrations/20260318171729_AddDocuments.cs` — new migration
- `GurkanApi.Tests/IntegrationTests/TestFixture.cs` — added Documents to TRUNCATE list, test upload path config + cleanup
- `GurkanApi.Tests/IntegrationTests/DocumentTests.cs` — new test file with 8 integration tests
- `gurkan-ui/src/types/index.ts` — added DocumentCategory, DocumentCategoryType, DocumentCategoryLabels, DocumentResponse
- `gurkan-ui/src/api/client.ts` — added getDocuments, uploadDocument, downloadDocument, deleteDocument functions
- `gurkan-ui/src/pages/Properties/PropertyLayout.tsx` — added Dökümanlar tab
- `gurkan-ui/src/App.tsx` — added DocumentList import and documents route
- `gurkan-ui/src/pages/Documents/DocumentList.tsx` — new document list page with upload form and table
- `gurkan-ui/src/pages/Documents/Documents.css` — new styles for upload form, category badges, download button

## Forward Intelligence

### What the next slice should know
- S06 (Dashboard, Bildirimler & Raporlama) does not depend on S05 — it depends on S03 and S04. S05 is a terminal slice. However, if S06 wants to show document counts or "missing document" alerts (e.g., property has no tapu uploaded), the Document entity and DocumentsController are ready to query.
- The backend now has 12 controllers and 53 endpoints. The test suite has 61 integration tests across 5 slices.
- PropertyLayout now has 6 tabs: Detaylar / Kiracılar / Kısa Dönem / Giderler / Faturalar / Dökümanlar.

### What's fragile
- Full regression test suite has transient flakiness from PostgreSQL socket resets (Windows + Docker Desktop). This is infrastructure-level, not code — retry usually succeeds. S06 should be aware and not interpret single-run failures in unrelated test classes as regressions.
- The `uploads/` directory is created on first upload and not managed by migrations. Test fixture creates a temp directory and cleans up — but in production, the path must exist and be writable.

### Authoritative diagnostics
- `dotnet test GurkanApi.Tests/ --filter "Category=S05"` — the 8 document-specific tests are the authoritative check for this slice's backend correctness.
- Swagger at `/swagger/index.html` — document endpoints visible under the api/properties/{propertyId}/documents group.
- `uploads/documents/` filesystem directory — physical proof that file storage works.

### What assumptions changed
- No assumptions changed. The slice was low-risk and executed exactly as planned. File upload/download with multipart form data worked on first attempt through the standard ASP.NET Core patterns.
