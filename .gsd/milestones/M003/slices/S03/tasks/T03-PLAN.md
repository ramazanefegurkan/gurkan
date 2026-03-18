---
estimated_steps: 7
estimated_files: 6
---

# T03: Frontend import page with upload, preview, and confirmation

**Slice:** S03 — Data Import
**Milestone:** M003

## Description

Build the frontend import page that lets users upload CSV files, preview parsed results with row-level error highlighting, and confirm the import. Adds two API client functions, import response types, the ImportPage component with two sections (Airbnb CSV + Rent Payments), and wires the route into App.tsx with a sidebar navigation link.

**Relevant skills:** `frontend-design`

## Steps

1. **Add import response types to `gurkan-ui/src/types/index.ts`:**
   ```typescript
   // ── Import ────────────────────────────────────────────
   export interface ImportSummary {
     totalRows: number;
     importedCount: number;
     errorCount: number;
     warningCount: number;
     duplicateCount: number;
   }
   
   export interface ImportRowResult {
     rowNumber: number;
     status: string; // "Success" | "Error" | "Warning"
     errorMessage?: string;
     warningMessage?: string;
     data: Record<string, unknown>;
   }
   
   export interface ImportPreviewResponse {
     summary: ImportSummary;
     rows: ImportRowResult[];
   }
   ```

2. **Add import API functions to `gurkan-ui/src/api/client.ts`:**
   ```typescript
   // ── Import ────────────────────────────────────────────
   export async function importAirbnbCsv(
     propertyId: string,
     file: File,
     dryRun: boolean = true,
   ): Promise<ImportPreviewResponse> {
     const formData = new FormData();
     formData.append('file', file);
     const { data } = await api.post<ImportPreviewResponse>(
       `/import/airbnb-csv?propertyId=${propertyId}&dryRun=${dryRun}`,
       formData,
       { headers: { 'Content-Type': 'multipart/form-data' } },
     );
     return data;
   }
   
   export async function importRentPayments(
     file: File,
     dryRun: boolean = true,
   ): Promise<ImportPreviewResponse> {
     const formData = new FormData();
     formData.append('file', file);
     const { data } = await api.post<ImportPreviewResponse>(
       `/import/rent-payments?dryRun=${dryRun}`,
       formData,
       { headers: { 'Content-Type': 'multipart/form-data' } },
     );
     return data;
   }
   ```
   Also add `ImportPreviewResponse` to the import list at the top of the file.

3. **Create `gurkan-ui/src/pages/Import/ImportPage.tsx`:**
   - Two-section layout with tab-style switching (or both visible as cards):
     - **Section 1: Airbnb CSV Import**
       - Property selector dropdown (fetch properties via `getProperties()` on mount)
       - File input for .csv files (use `useRef<HTMLInputElement>`)
       - "Önizleme" (Preview) button → calls `importAirbnbCsv(propertyId, file, true)` → shows preview table
       - Preview table shows: RowNumber, GuestName, CheckIn, CheckOut, NightCount, TotalAmount, PlatformFee, NetAmount, Status. Error rows highlighted in red, warning rows in yellow.
       - "İçe Aktar" (Import) button → calls `importAirbnbCsv(propertyId, file, false)` → shows result summary
       - Result summary: "X kayıt başarıyla içe aktarıldı, Y hata, Z uyarı (tekrar)"
     - **Section 2: Kira Ödemesi İçe Aktarma (Rent Payment Import)**
       - File input for .csv files
       - Same preview → confirm flow using `importRentPayments(file, dryRun)`
       - Preview table shows: RowNumber, PropertyName, TenantName, Amount, Currency, DueDate, Status, row status
   - State management: `activeTab` (airbnb/rent), `selectedPropertyId`, `file`, `preview` (ImportPreviewResponse | null), `importing` (boolean), `importResult` (ImportPreviewResponse | null), `error` (string)
   - Loading spinner during upload/import (use shared `loading-spinner` class)
   - Error banner for API errors (use shared `error-banner` class)
   - Use shared CSS classes: `page-header`, `section-header`, `btn`, `btn-primary`, `btn-secondary`, `data-table`, `data-table-wrap`, `form-group`, `form-label`, `form-input`, `form-select`, `error-banner`, `loading-container`, `loading-spinner`, `empty-state`
   - After successful import, show a link to navigate to the property's short-term rentals page or tenants page to verify records.

4. **Create `gurkan-ui/src/pages/Import/Import.css`:**
   - Import-specific styles: preview table row highlighting (`.import-row--error` red bg, `.import-row--warning` yellow bg, `.import-row--success` default/green), upload area styling, summary card styling, tab switcher, status badges for row status.
   - Keep it concise — reuse shared.css classes for buttons, tables, forms.

5. **Add route to `gurkan-ui/src/App.tsx`:**
   - Import the ImportPage component: `import ImportPage from './pages/Import/ImportPage';`
   - Add route under protected routes: `<Route path="/import" element={<ImportPage />} />`
   - Place it alongside `/dashboard`, `/notifications`, `/properties` (not nested under property layout — import is a top-level page).

6. **Add navigation link in `gurkan-ui/src/components/Layout.tsx`:**
   - Add "İçe Aktar" (Import) link in the sidebar/nav, pointing to `/import`
   - Use an upload/import icon (arrow-up into box or similar)
   - Place it after "Bildirimler" (Notifications) or at the bottom of the nav before any settings.

7. **Verify build:**
   - Run `cd gurkan-ui && npm run build` — must succeed without TypeScript errors or build warnings.

## Must-Haves

- [ ] `importAirbnbCsv()` and `importRentPayments()` functions added to client.ts with FormData upload
- [ ] Import response types added to types/index.ts
- [ ] ImportPage component with two-section layout (Airbnb CSV + Rent Payments)
- [ ] Preview flow: file upload → dryRun=true → preview table with row status highlighting
- [ ] Confirm flow: user clicks confirm → dryRun=false → records created → success summary shown
- [ ] Error rows highlighted in red, warning rows in yellow in preview table
- [ ] Property selector dropdown for Airbnb import section
- [ ] `/import` route added to App.tsx under protected routes
- [ ] Navigation link added to Layout sidebar/nav
- [ ] `npm run build` succeeds

## Observability Impact

- **Frontend route `/import` renders:** The page loads with two tab sections visible, confirming route and component wiring. If the page fails to render, a blank main-content area appears.
- **Network requests visible in browser DevTools:** dryRun=true preview fires POST to `/api/import/airbnb-csv` or `/api/import/rent-payments` with FormData; dryRun=false fires the same endpoint to commit. Response shape matches `ImportPreviewResponse`.
- **Row-level error visibility:** Error rows show red background, warning rows show yellow. Row `status`, `errorMessage`, and `warningMessage` render inline in the preview table.
- **Console errors:** API failures surface in the error-banner div and log to console. No silent failures.
- **Navigation sidebar:** "İçe Aktar" nav link visible in sidebar confirms Layout.tsx wiring.

## Verification

- `cd gurkan-ui && npm run build` — no errors
- Browser: navigate to `/import` — page renders with two sections
- Browser: select property, choose a CSV file, click Preview — dryRun request fires, preview table shows
- Browser: click Import — commit request fires, success summary displayed
- Browser: upload malformed CSV — error rows highlighted in red in preview table
- Navigation: sidebar shows "İçe Aktar" link that navigates to /import

## Inputs

- `gurkan-ui/src/api/client.ts` — existing axios instance, `uploadDocument` as pattern for FormData upload
- `gurkan-ui/src/types/index.ts` — existing type definitions (PropertyListResponse used for property selector)
- `gurkan-ui/src/App.tsx` — existing route structure (add `/import` route alongside dashboard/properties)
- `gurkan-ui/src/components/Layout.tsx` — existing sidebar/nav structure for adding import link
- `gurkan-ui/src/pages/Documents/DocumentList.tsx` — reference pattern for file upload UI (useRef, uploading state, error handling)
- `gurkan-ui/src/styles/shared.css` — shared CSS classes (buttons, forms, tables, loading states, error banners, empty states)
- T01's import endpoints: `POST /api/import/airbnb-csv?propertyId={id}&dryRun={bool}` and `POST /api/import/rent-payments?dryRun={bool}`, returning `ImportPreviewResponse` with `summary` and `rows`

## Expected Output

- `gurkan-ui/src/pages/Import/ImportPage.tsx` — Complete import page with two sections, preview flow, confirm flow
- `gurkan-ui/src/pages/Import/Import.css` — Import-specific styles (row highlighting, upload area, summary)
- `gurkan-ui/src/api/client.ts` — Two new import functions added
- `gurkan-ui/src/types/index.ts` — Import response types added
- `gurkan-ui/src/App.tsx` — `/import` route added
- `gurkan-ui/src/components/Layout.tsx` — "İçe Aktar" nav link added
