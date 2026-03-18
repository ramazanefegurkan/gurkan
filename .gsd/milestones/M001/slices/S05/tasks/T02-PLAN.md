---
estimated_steps: 7
estimated_files: 6
---

# T02: Build document frontend and verify end-to-end in browser

**Slice:** S05 — Döküman Yönetimi
**Milestone:** M001

## Description

Complete the user-facing document management feature: add TypeScript types and API functions for documents (using FormData for upload), wire the "Dökümanlar" tab into PropertyLayout, create the DocumentList page with an inline upload form and document table, and verify the entire flow in the browser. Documents don't need a separate form page — upload is a simple file+category picker inline at the top of the list page.

The frontend patterns follow BillList/ExpenseList exactly (same tab navigation, table layout, delete confirmation, formatting helpers). The one difference is the upload function uses `FormData` instead of JSON — the API client must NOT set `Content-Type: application/json` for the upload call (let the browser set the multipart boundary automatically).

**Relevant skills:** `frontend-design` (for consistent styling with existing pages)

## Steps

1. **Add document types to `gurkan-ui/src/types/index.ts`:**
   - Add `DocumentCategory` const object with string values matching backend enum: `{ TitleDeed: "TitleDeed", Contract: "Contract", Insurance: "Insurance", Invoice: "Invoice", Photo: "Photo", Other: "Other" }` with `as const` pattern
   - Add `DocumentCategoryType` union type
   - Add `DocumentCategoryLabels` map: `{ TitleDeed: "Tapu", Contract: "Sözleşme", Insurance: "Sigorta", Invoice: "Fatura", Photo: "Fotoğraf", Other: "Diğer" }`
   - Add `DocumentResponse` interface: `id`, `propertyId`, `originalFileName`, `category` (DocumentCategoryType), `contentType`, `fileSize` (number), `uploadedBy`, `uploadedAt` (string)

2. **Add document API functions to `gurkan-ui/src/api/client.ts`:**
   - `getDocuments(propertyId: string, category?: string): Promise<DocumentResponse[]>` — GET with optional category query param
   - `uploadDocument(propertyId: string, file: File, category: string): Promise<DocumentResponse>` — POST with FormData. **Critical:** Must use `api.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } })` or better yet, delete the Content-Type header entirely to let axios set the boundary: `api.post(url, formData, { headers: {} })`. The default axios instance has JSON content type — this must be overridden for FormData.
   - `downloadDocument(propertyId: string, documentId: string): Promise<Blob>` — GET with `responseType: 'blob'`. Then trigger browser download via `URL.createObjectURL` + temporary anchor click.
   - `deleteDocument(propertyId: string, documentId: string): Promise<void>` — DELETE

3. **Add "Dökümanlar" tab to `gurkan-ui/src/pages/Properties/PropertyLayout.tsx`:**
   - Add a new `isDocuments` check: `location.pathname.includes('/documents')`
   - Add a new `<Link>` for the "Dökümanlar" tab after "Faturalar", pointing to `${basePath}/documents`
   - Follow the same `property-tab` / `property-tab--active` class pattern

4. **Add document route to `gurkan-ui/src/App.tsx`:**
   - Import `DocumentList` from `'./pages/Documents/DocumentList'`
   - Add route under the PropertyLayout routes: `<Route path="documents" element={<DocumentList />} />`
   - Place after the bills routes

5. **Create `gurkan-ui/src/pages/Documents/DocumentList.tsx`:**
   - Follows BillList pattern: `useParams` for `id` (propertyId), `useState` for documents array + loading + error
   - `useEffect` to fetch documents on mount
   - **Inline upload form at the top:**
     - File input (`<input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx">`)
     - Category dropdown (`<select>`) with DocumentCategoryLabels options
     - Upload button
     - Upload handler: create `FormData`, append file and category, call `uploadDocument`, on success refresh list
     - Show uploading state (disabled button + "Yükleniyor..." text)
   - **Document table below:**
     - Columns: Dosya Adı, Kategori, Boyut, Yükleme Tarihi, İşlemler
     - Format file size: helper function to display bytes as KB/MB (e.g., `formatFileSize(bytes)`)
     - Format date: reuse `formatDate` helper from BillList pattern (Intl.DateTimeFormat tr-TR)
     - Category displayed with `DocumentCategoryLabels` lookup
     - Actions column: İndir button (calls `downloadDocument` which triggers browser download via blob URL), Sil button (with `window.confirm` then calls `deleteDocument` and refreshes list)
   - Empty state message when no documents: "Henüz döküman yüklenmemiş."
   - Error state for upload failures: display error message above the form

6. **Create `gurkan-ui/src/pages/Documents/Documents.css`:**
   - Style the upload form (flex row with gap, file input styled, category dropdown, upload button matching existing `.btn .btn--primary` classes)
   - Style the document table following existing table patterns from Bills/Expenses
   - Keep consistent with the design system (terracotta accent, DM Sans font, CSS custom properties)

7. **Browser verification:**
   - Start backend: `cd GurkanApi && dotnet run`
   - Start frontend: `cd gurkan-ui && npm run dev`
   - Login with admin@gurkan.com / Admin123!
   - Navigate to any existing property (create one if needed)
   - Click "Dökümanlar" tab — verify tab is active and page loads
   - Upload a test file (any PDF or image) with a category — verify it appears in the table
   - Click "İndir" — verify file downloads with correct content
   - Click "Sil" — confirm dialog appears, confirm, verify document removed from list
   - Verify other tabs (Detaylar, Kiracılar, etc.) still work — no navigation regressions

## Must-Haves

- [ ] `DocumentCategory` const + labels + `DocumentResponse` interface added to types/index.ts
- [ ] Document API functions in client.ts — upload uses FormData (not JSON body)
- [ ] "Dökümanlar" tab appears in PropertyLayout and highlights when active
- [ ] Document route wired in App.tsx
- [ ] DocumentList page with inline upload form and document table
- [ ] File download triggers browser save dialog (blob URL approach)
- [ ] Delete with confirmation removes document from list
- [ ] `npm run build` compiles without TypeScript errors
- [ ] Browser verification passes: upload → list → download → delete flow works

## Verification

- `cd gurkan-ui && npm run build` — TypeScript compiles cleanly, no errors
- Browser test: complete upload → list → download → delete cycle works end-to-end
- Tab navigation between all property tabs works (no regression)

## Inputs

- `gurkan-ui/src/types/index.ts` — existing type patterns (BillType, BillResponse, etc.)
- `gurkan-ui/src/api/client.ts` — existing API function patterns, axios instance
- `gurkan-ui/src/pages/Properties/PropertyLayout.tsx` — existing tab navigation
- `gurkan-ui/src/pages/Bills/BillList.tsx` — reference pattern for list page with table and actions
- `gurkan-ui/src/App.tsx` — existing route structure
- T01 must be complete — backend endpoints must be working and migration applied

## Expected Output

- `gurkan-ui/src/types/index.ts` — modified with document types
- `gurkan-ui/src/api/client.ts` — modified with document API functions
- `gurkan-ui/src/App.tsx` — modified with document route
- `gurkan-ui/src/pages/Properties/PropertyLayout.tsx` — modified with Dökümanlar tab
- `gurkan-ui/src/pages/Documents/DocumentList.tsx` — new document list page
- `gurkan-ui/src/pages/Documents/Documents.css` — new styles
