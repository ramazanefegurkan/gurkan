# S05: Döküman Yönetimi

**Goal:** Mülklere dosya yükleme (tapu, sözleşme, sigorta vb.), kategorize etme, listeleme, indirme ve silme çalışır. Dosyalar grup bazlı erişim kontrolü ile korunur.
**Demo:** Login → mülk detay → "Dökümanlar" sekmesi → dosya yükle (PDF/JPG) + kategori seç → listede görüntüle → indir → sil → silinen dosya listeden kaybolur.

## Must-Haves

- `Document` entity with FK to Property and User, `DocumentCategory` enum (TitleDeed, Contract, Insurance, Invoice, Photo, Other)
- `DocumentsController` with 4 endpoints: POST upload (multipart), GET list, GET download, DELETE — all under `/api/properties/{propertyId}/documents`
- Group-based access control on all document endpoints (same pattern as BillsController)
- File stored on local filesystem at `uploads/documents/{propertyId}/{guid}-{filename}`
- Max file size 25MB, allowed extensions whitelist (PDF, JPG, JPEG, PNG, DOC, DOCX, XLS, XLSX)
- Content-Disposition: attachment on download endpoint
- EF Core migration adding Documents table
- Integration tests covering upload, list, download, delete, cross-group access denial, file type/size validation
- Frontend: "Dökümanlar" tab in PropertyLayout, DocumentList page with inline upload form, file table with download/delete actions
- Frontend upload uses FormData (not JSON)

## Proof Level

- This slice proves: integration (file upload/download through API + frontend)
- Real runtime required: yes
- Human/UAT required: no

## Verification

- `dotnet test GurkanApi.Tests/ --filter "Category=S05"` — all document integration tests pass
- `dotnet test GurkanApi.Tests/` — all previous slice tests still pass (regression)
- `cd gurkan-ui && npm run build` — TypeScript compiles cleanly
- Browser: login → property → Dökümanlar tab → upload file → see in list → download → delete

## Observability / Diagnostics

- Runtime signals: `"Document {action}: DocumentId={DocumentId}, PropertyId={PropertyId}, By={UserId}"` structured logs on upload/download/delete
- Inspection surfaces: Swagger UI at `/swagger/index.html` shows document endpoints; `uploads/documents/` directory on filesystem
- Failure visibility: 400 responses with `{ error, message }` for invalid file type/size; 403 for cross-group access; 404 for missing document
- Redaction constraints: none (documents may contain sensitive data but filenames are not PII)

## Integration Closure

- Upstream surfaces consumed: `Property` entity + `IGroupAccessService` from S02, JWT auth middleware from S01
- New wiring introduced: `DocumentsController` registered via controller discovery, `Documents` DbSet in `ApplicationDbContext`, "Dökümanlar" tab in PropertyLayout, document routes in App.tsx
- What remains before the milestone is truly usable end-to-end: S06 (Dashboard, Bildirimler & Raporlama)

## Tasks

- [ ] **T01: Build document backend — entity, controller, migration, and integration tests** `est:45m`
  - Why: This is the core backend work and the only novel element (multipart file upload). Proves file upload/download works with access control.
  - Files: `GurkanApi/Entities/Document.cs`, `GurkanApi/Entities/Enums.cs`, `GurkanApi/Data/ApplicationDbContext.cs`, `GurkanApi/Controllers/DocumentsController.cs`, `GurkanApi/DTOs/Documents/DocumentResponse.cs`, `GurkanApi/Program.cs`, `GurkanApi/appsettings.json`, `GurkanApi.Tests/IntegrationTests/DocumentTests.cs`, `GurkanApi.Tests/IntegrationTests/TestFixture.cs`
  - Do: (1) Add `DocumentCategory` enum to Enums.cs. (2) Create `Document` entity with Id, PropertyId, FileName (stored name), OriginalFileName, Category, ContentType, FileSize, FilePath, UploadedBy, UploadedAt. (3) Add `DbSet<Document>` and Fluent API config in ApplicationDbContext. (4) Generate EF migration. (5) Build `DocumentsController` with 4 endpoints using `[FromForm]` for upload, `FileStreamResult` for download. Enforce property access via `IGroupAccessService`. Validate file extension and size. Create upload directory if missing. (6) Add `FileStorage:BasePath` to appsettings.json (default `uploads`). (7) Configure Kestrel `MaxRequestBodySize` 25MB via `[RequestSizeLimit]` on upload endpoint. (8) Add `"Documents"` to TRUNCATE list in TestFixture.cs. (9) Write integration tests: upload multipart file, list documents, download and verify content, delete, cross-group 403, invalid file type 400.
  - Verify: `dotnet test GurkanApi.Tests/ --filter "Category=S05"` passes; `dotnet test GurkanApi.Tests/` passes (regression)
  - Done when: All document integration tests pass, migration applies cleanly, upload/download/list/delete endpoints work correctly with group access control

- [ ] **T02: Build document frontend and verify end-to-end in browser** `est:40m`
  - Why: Completes the user-facing feature — upload form, document list, download/delete actions, tab navigation. Proves the full integration path works.
  - Files: `gurkan-ui/src/types/index.ts`, `gurkan-ui/src/api/client.ts`, `gurkan-ui/src/App.tsx`, `gurkan-ui/src/pages/Properties/PropertyLayout.tsx`, `gurkan-ui/src/pages/Documents/DocumentList.tsx`, `gurkan-ui/src/pages/Documents/Documents.css`
  - Do: (1) Add `DocumentCategory` const + labels + `DocumentResponse` interface to types/index.ts. (2) Add document API functions to client.ts — upload uses `FormData` and must NOT set Content-Type header (let browser set multipart boundary), list, download (returns blob), delete. (3) Add "Dökümanlar" tab to PropertyLayout. (4) Add document route in App.tsx under PropertyLayout. (5) Create DocumentList page: inline upload form (file input + category dropdown + submit button), document table with filename, category, size, date, download link, delete button. Follow BillList patterns. (6) Add Documents.css for upload form and document table styles. (7) Browser verify: start backend + frontend, login, navigate to property, click Dökümanlar tab, upload a file, see in list, download, delete.
  - Verify: `cd gurkan-ui && npm run build` compiles cleanly; browser verification of upload → list → download → delete flow
  - Done when: Upload form works, documents appear in table with correct metadata, download returns the file, delete removes from list, tab navigation works

## Files Likely Touched

- `GurkanApi/Entities/Document.cs` (new)
- `GurkanApi/Entities/Enums.cs` (add DocumentCategory)
- `GurkanApi/Data/ApplicationDbContext.cs` (add DbSet + config)
- `GurkanApi/Controllers/DocumentsController.cs` (new)
- `GurkanApi/DTOs/Documents/DocumentResponse.cs` (new)
- `GurkanApi/Program.cs` (upload path config)
- `GurkanApi/appsettings.json` (FileStorage:BasePath)
- `GurkanApi/Migrations/` (new migration)
- `GurkanApi.Tests/IntegrationTests/DocumentTests.cs` (new)
- `GurkanApi.Tests/IntegrationTests/TestFixture.cs` (TRUNCATE list)
- `gurkan-ui/src/types/index.ts` (DocumentCategory + DocumentResponse)
- `gurkan-ui/src/api/client.ts` (document API functions)
- `gurkan-ui/src/App.tsx` (document route)
- `gurkan-ui/src/pages/Properties/PropertyLayout.tsx` (Dökümanlar tab)
- `gurkan-ui/src/pages/Documents/DocumentList.tsx` (new)
- `gurkan-ui/src/pages/Documents/Documents.css` (new)
