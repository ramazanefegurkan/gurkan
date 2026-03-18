# S05: Döküman Yönetimi — UAT

**Milestone:** M001
**Written:** 2026-03-18

## UAT Type

- UAT mode: mixed (artifact-driven integration tests + live-runtime browser verification)
- Why this mode is sufficient: File upload/download is inherently a runtime operation that requires multipart form handling, filesystem I/O, and binary content verification — both API tests and browser tests are needed.

## Preconditions

- PostgreSQL running on localhost:5434 (Docker container `infra-postgres-1`)
- Backend started: `cd GurkanApi && dotnet run` (serves on localhost:5039)
- Frontend started: `cd gurkan-ui && npm run dev` (serves on localhost:5173)
- At least one user registered (admin@gurkan.com / Test123!)
- At least one group created with a property assigned

## Smoke Test

Login → navigate to any property → click "Dökümanlar" tab → verify tab is active and page loads with upload form visible.

## Test Cases

### 1. Upload a PDF document with category

1. Login as admin@gurkan.com
2. Navigate to a property detail page
3. Click "Dökümanlar" tab
4. Click "Dosya Seç" and select a PDF file (< 25MB)
5. Select category "Sözleşme" from dropdown
6. Click "Yükle" button
7. **Expected:** Document appears in the table with filename, "Sözleşme" category badge (blue), file size in KB/MB, upload date, and İndir/Sil action buttons. Upload form resets.

### 2. Upload an image document (JPG)

1. On the same Dökümanlar page, click "Dosya Seç" and select a JPG image
2. Select category "Fotoğraf" from dropdown
3. Click "Yükle"
4. **Expected:** Image document appears in the table with "Fotoğraf" category badge (purple). Table now shows 2 documents, ordered by most recent first.

### 3. Download a document

1. Click "İndir" button on any document in the table
2. **Expected:** Browser triggers a file download. Downloaded file is identical to the original upload (same content, same filename).

### 4. Delete a document

1. Click "Sil" button on a document in the table
2. **Expected:** Confirmation dialog appears: "Bu dökümanı silmek istediğinize emin misiniz?"
3. Click "Tamam" (OK/confirm)
4. **Expected:** Document is removed from the table. If it was the last document, empty state message "Henüz döküman yüklenmemiş." appears.

### 5. Category filter on document list

1. Upload 3 documents with different categories (e.g., Tapu, Sözleşme, Sigorta)
2. Verify all 3 appear in the list
3. **Expected:** Documents are listed in reverse chronological order (newest first). Each has the correct color-coded category badge.

### 6. Tab navigation does not break other tabs

1. From the Dökümanlar tab, click "Kiracılar" tab
2. **Expected:** Kiracılar page loads correctly
3. Click "Faturalar" tab
4. **Expected:** Faturalar page loads correctly
5. Click "Dökümanlar" tab again
6. **Expected:** Document list reloads with previously uploaded documents

## Edge Cases

### Invalid file type rejection

1. On Dökümanlar page, select a file with disallowed extension (e.g., .exe, .bat, .zip)
2. Select any category and click "Yükle"
3. **Expected:** Error message appears above the upload form (inline). Document is NOT added to the list. Server returns 400 status.

### File size limit (25MB)

1. Attempt to upload a file larger than 25MB
2. **Expected:** Upload fails with an error. Document is NOT added to the list.

### Cross-group access denial

1. Login as a user who is NOT a member of the property's group
2. Attempt to access /api/properties/{otherGroupPropertyId}/documents via API
3. **Expected:** 403 Forbidden response. No documents returned.

### Empty state

1. Navigate to a property that has no documents
2. **Expected:** Page shows "Henüz döküman yüklenmemiş." message instead of empty table. Upload form is still visible and functional.

### Download nonexistent document

1. Via API, attempt GET /api/properties/{id}/documents/{nonexistentId}/download
2. **Expected:** 404 Not Found response.

## Failure Signals

- Upload button does nothing → check browser console for JS errors, check network tab for failed POST request
- "Network Error" on upload → backend not running or CORS misconfigured
- Category badges show raw enum values instead of Turkish labels → check DocumentCategoryLabels mapping in types/index.ts
- Download returns HTML instead of file → check Content-Disposition header, verify FileStreamResult usage
- Tab shows but page is blank → check route configuration in App.tsx
- 403 on own property's documents → IGroupAccessService not recognizing membership, check GroupMembers table

## Requirements Proved By This UAT

- R010 — Dosya yükleme (tapu, sözleşme, sigorta poliçesi vs.), mülke bağlama, kategorize etme, görüntüleme/indirme. Test cases 1-5 prove upload with categorization, listing, download, and delete. Edge cases prove validation and access control.

## Not Proven By This UAT

- Very large file handling (close to 25MB boundary) — integration tests use small test files
- Concurrent uploads from multiple users — not tested
- File storage cleanup when property is deleted (cascade behavior) — DB record cascades, but filesystem orphans may remain
- Production Kestrel behavior with [RequestSizeLimit] — test server doesn't fully enforce it

## Notes for Tester

- Category badges are color-coded: green (Tapu), blue (Sözleşme), orange (Sigorta), red (Fatura), purple (Fotoğraf), gray (Diğer)
- Upload form does NOT pre-fill category — user must select one. If no category is selected, the default may vary
- The download uses a temporary anchor + blob URL pattern, so the browser's download behavior applies (may show save dialog or auto-save depending on settings)
- File storage path is `uploads/documents/{propertyId}/{guid}-{originalFilename}` — you can verify files exist on disk after upload
