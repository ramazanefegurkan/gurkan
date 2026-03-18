# S05: Döküman Yönetimi — Research

**Date:** 2026-03-18
**Depth:** Light — straightforward CRUD + file upload using established codebase patterns and built-in ASP.NET Core IFormFile.

## Summary

S05 adds document management to properties: upload files (tapu, sözleşme, sigorta, etc.), store them on local filesystem, categorize by type, list/download/delete. This is the only slice that deals with file I/O instead of pure JSON CRUD, but ASP.NET Core's `IFormFile` and local filesystem storage (D006) make it straightforward.

The backend follows the exact same controller pattern as ExpensesController and BillsController — nested route under `/api/properties/{propertyId}/documents`, group-based access check via `IGroupAccessService`, structured logging. The only novelty is `[FromForm]` multipart binding instead of `[FromBody]` JSON, and reading/writing files to a configured upload directory.

The frontend adds a "Dökümanlar" tab to PropertyLayout, a document list page with download links and delete, and an upload form with file input and category selector. These follow the established BillList/BillForm patterns exactly.

## Recommendation

Follow the established codebase patterns with minimal additions:

1. **Backend:** New `Document` entity, `DocumentCategory` enum, `DocumentsController` with upload (POST multipart), list (GET), download (GET by id), delete (DELETE). Store files at `uploads/documents/{propertyId}/{guid}-{filename}`. Configure max file size (25MB) via Kestrel settings in Program.cs. Add `FileStorage:BasePath` config key to appsettings.json.
2. **Frontend:** New "Dökümanlar" tab in PropertyLayout, `DocumentList` page with table + upload form inline (no separate form page needed — upload is a simple file+category picker, not a multi-field form).
3. **Tests:** Integration tests for upload, list, download, delete, access control. File upload tests use `MultipartFormDataContent`.
4. **Migration:** Single migration adding `Documents` table.

## Implementation Landscape

### Key Files

**Backend — existing (modify):**
- `GurkanApi/Entities/Enums.cs` — add `DocumentCategory` enum (TitleDeed, Contract, Insurance, Invoice, Photo, Other)
- `GurkanApi/Data/ApplicationDbContext.cs` — add `DbSet<Document>`, Fluent API config for Document entity
- `GurkanApi/Program.cs` — add `app.UseStaticFiles()` is NOT needed (files served via controller, not static middleware). Add Kestrel `MaxRequestBodySize` config for 25MB uploads. Add upload path config.
- `GurkanApi/appsettings.json` / `appsettings.Development.json` — add `FileStorage:BasePath` setting
- `GurkanApi.Tests/IntegrationTests/TestFixture.cs` — add `"Documents"` to TRUNCATE list

**Backend — create:**
- `GurkanApi/Entities/Document.cs` — entity: Id (Guid), PropertyId (Guid FK), FileName (string), OriginalFileName (string), Category (DocumentCategory), ContentType (string), FileSize (long), FilePath (string), UploadedBy (Guid FK to User), UploadedAt (DateTime)
- `GurkanApi/Controllers/DocumentsController.cs` — 4 endpoints: POST (upload), GET (list), GET/{docId}/download (download), DELETE/{docId}
- `GurkanApi/DTOs/Documents/DocumentResponse.cs` — response DTO
- `GurkanApi/DTOs/Documents/UploadDocumentRequest.cs` — optional if binding directly from form fields; may just use `[FromForm]` params
- `GurkanApi.Tests/IntegrationTests/DocumentTests.cs` — integration tests

**Frontend — modify:**
- `gurkan-ui/src/types/index.ts` — add `DocumentCategory` const, `DocumentResponse` interface
- `gurkan-ui/src/api/client.ts` — add document API functions (upload uses FormData, not JSON)
- `gurkan-ui/src/App.tsx` — add documents route under PropertyLayout
- `gurkan-ui/src/pages/Properties/PropertyLayout.tsx` — add "Dökümanlar" tab

**Frontend — create:**
- `gurkan-ui/src/pages/Documents/DocumentList.tsx` — list + inline upload form
- `gurkan-ui/src/pages/Documents/Documents.css` — styles

### Build Order

1. **T01: Backend entity + controller + migration** — Create Document entity, DocumentCategory enum, DocumentsController with all 4 endpoints, EF migration. This is the core work and proves file upload/download works. Configure upload path and max file size. Risk: file upload multipart handling is the one novel element.

2. **T02: Integration tests** — Write tests covering upload (multipart), list, download (verify file content), delete, access control (cross-group 403), file size/type validation. Uses `MultipartFormDataContent` with `StreamContent`. Tests need a temp directory for file storage.

3. **T03: Frontend** — Add DocumentCategory type + API functions, "Dökümanlar" tab in PropertyLayout, DocumentList page with upload form and table with download/delete actions. Standard pattern following BillList.

4. **T04: Browser verification** — Verify upload, list, download, delete through the browser. Confirm tab navigation works.

### Verification Approach

- `dotnet test GurkanApi.Tests/ --filter "Category=S05"` — all document integration tests pass
- `cd gurkan-ui && npm run build` — TypeScript compiles cleanly
- Browser: login → navigate to property → Documents tab → upload a file → see it in list → download → delete
- Regression: `dotnet test GurkanApi.Tests/` — all previous slice tests still pass

## Constraints

- **Max file size 25MB** — Kestrel default is 30MB for `MaxRequestBodySize`, but `[RequestSizeLimit]` attribute on the upload endpoint is more explicit. ASP.NET Core also has `MultipartBodyLengthLimit` in FormOptions that defaults to ~128MB, so Kestrel's limit is the binding one.
- **Allowed file types** — Whitelist: PDF, JPG/JPEG, PNG, DOC/DOCX, XLS/XLSX. Validate by extension and content type on upload. Don't rely on content type alone (user can spoof).
- **Local filesystem storage (D006)** — Files go to a configurable directory (default: `uploads/` relative to app root). Production uses Docker volume mount. Directory must be created on startup if missing.
- **No static file middleware** — Files are served through the controller's download endpoint (which checks property access), NOT via `UseStaticFiles()`. This ensures group-based access control on downloads.

## Common Pitfalls

- **Multipart form binding** — Upload endpoint must use `[FromForm]` not `[FromBody]`. The `IFormFile` parameter binds from multipart. Category and other metadata fields also come from form fields, not JSON body. Frontend must use `FormData` (not `JSON.stringify`).
- **Content-Disposition on download** — The download endpoint should return `FileStreamResult` with `Content-Disposition: attachment` header so browsers download instead of navigating. Use `File(stream, contentType, originalFileName)`.
- **Test file cleanup** — Integration tests that write files to disk need a temp directory, and should clean up in test teardown. Configure `FileStorage:BasePath` to a temp path in test WebApplicationFactory.
- **TRUNCATE ordering** — `Documents` table has FK to `Properties` and `Users`. It must be listed before `Properties` and `Users` in the TRUNCATE statement, or use CASCADE (which the fixture already does).
- **axios Content-Type for FormData** — When using `FormData`, axios must NOT set `Content-Type: application/json`. The API client has a default JSON content type header. Upload function should override with `{ headers: { 'Content-Type': 'multipart/form-data' } }` or simply delete the header and let axios/browser set the boundary automatically.

## Sources

- No external research needed — ASP.NET Core `IFormFile` and local file storage are built-in, well-documented patterns. All architectural decisions already made (D006).
