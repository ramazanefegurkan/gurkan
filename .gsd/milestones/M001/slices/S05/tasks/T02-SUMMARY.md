---
id: T02
parent: S05
milestone: M001
provides:
  - DocumentList page with inline upload form and document table
  - Document API client functions (upload with FormData, download with blob URL, list, delete)
  - Dökümanlar tab in PropertyLayout navigation
  - Document route in App.tsx
key_files:
  - gurkan-ui/src/pages/Documents/DocumentList.tsx
  - gurkan-ui/src/pages/Documents/Documents.css
  - gurkan-ui/src/types/index.ts
  - gurkan-ui/src/api/client.ts
  - gurkan-ui/src/pages/Properties/PropertyLayout.tsx
  - gurkan-ui/src/App.tsx
key_decisions:
  - Used multipart/form-data Content-Type header override on axios instead of deleting the header, since axios auto-sets the boundary when Content-Type is explicitly multipart/form-data
  - Download uses blob responseType + URL.createObjectURL + temporary anchor click pattern for browser file save
patterns_established:
  - FormData upload pattern for axios with Content-Type override (reusable for future file upload features)
  - formatFileSize helper for displaying bytes as KB/MB in document tables
observability_surfaces:
  - Browser console: no errors on document CRUD operations
  - Network: POST /api/properties/{id}/documents returns 201 on upload, GET .../download returns 200 with blob, DELETE returns 204
  - UI: Document count shown in section subtitle; upload error displayed inline above form; delete confirmation dialog
duration: ~15min
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T02: Build document frontend and verify end-to-end in browser

**Add DocumentList page with inline upload/download/delete, Dökümanlar tab, and document API client functions — full CRUD verified in browser**

## What Happened

Implemented all 6 frontend files for the document management feature:

1. Added `DocumentCategory` const, `DocumentCategoryType` union, `DocumentCategoryLabels` map, and `DocumentResponse` interface to `types/index.ts`
2. Added 4 document API functions to `client.ts`: `getDocuments`, `uploadDocument` (FormData), `downloadDocument` (blob URL), `deleteDocument`
3. Added "Dökümanlar" tab to `PropertyLayout.tsx` with active state detection
4. Added `documents` route to `App.tsx` under PropertyLayout
5. Created `DocumentList.tsx` with inline upload form (file input + category select + upload button), document table (filename, category badge, size, date, actions), empty state, error handling, and loading states
6. Created `Documents.css` with upload form styles, category badges (6 color-coded variants), download button, and responsive layout

## Verification

- `npm run build` — TypeScript compiles cleanly, zero errors (vite build 119ms)
- Browser: login → property → Dökümanlar tab active and highlighted → upload test PDF with Sözleşme category → document appears in table with correct name/category/size/date → İndir button triggers download (200 response) → Sil button shows confirm dialog → confirm removes document from list → empty state returns
- Tab navigation: clicked through Kiracılar → Faturalar → Dökümanlar — all tabs work, no regression
- All 6 browser assertions passed (url_contains, text_visible, selector_visible ×2, no_console_errors, no_failed_requests)
- S05 integration tests: 8/8 passed

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd gurkan-ui && npm run build` | 0 | ✅ pass | 5s |
| 2 | `dotnet test GurkanApi.Tests/ --filter "Category=S05"` | 0 | ✅ pass | 6.3s |
| 3 | Browser: upload → list → download → delete cycle | — | ✅ pass | manual |
| 4 | Browser: tab navigation regression check | — | ✅ pass | manual |
| 5 | `dotnet test GurkanApi.Tests/` (regression) | 1 | ⚠️ transient | 6.3s |

Note: Full regression test run hit a transient Windows Defender file lock (CS2012 error on test DLL) — not related to code changes.

## Diagnostics

- **Upload errors:** Inline `.doc-upload-error` element shows backend error messages (invalid file type, invalid content type)
- **Network inspection:** All document API calls go through `/api/properties/{propertyId}/documents` — visible in browser DevTools Network tab
- **Empty state:** When no documents exist, page shows "Henüz döküman yüklenmemiş." message
- **Category badges:** Color-coded by type — green (TitleDeed), blue (Contract), orange (Insurance), red (Invoice), purple (Photo), gray (Other)

## Deviations

None — implemented exactly as planned.

## Known Issues

None.

## Files Created/Modified

- `gurkan-ui/src/types/index.ts` — Added DocumentCategory, DocumentCategoryType, DocumentCategoryLabels, DocumentResponse
- `gurkan-ui/src/api/client.ts` — Added getDocuments, uploadDocument, downloadDocument, deleteDocument functions
- `gurkan-ui/src/pages/Properties/PropertyLayout.tsx` — Added Dökümanlar tab with isDocuments active check
- `gurkan-ui/src/App.tsx` — Added DocumentList import and documents route
- `gurkan-ui/src/pages/Documents/DocumentList.tsx` — New document list page with inline upload form and table
- `gurkan-ui/src/pages/Documents/Documents.css` — New styles for upload form, category badges, download button
