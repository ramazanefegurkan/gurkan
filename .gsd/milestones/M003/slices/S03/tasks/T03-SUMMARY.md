---
id: T03
parent: S03
milestone: M003
provides:
  - Complete frontend import page with Airbnb CSV and rent payment CSV upload, preview, and confirmation flows
  - importAirbnbCsv() and importRentPayments() API client functions with FormData multipart upload
  - Typed import response interfaces (ImportPreviewResponse<T>, AirbnbImportRow, RentPaymentImportRow, ImportSummary)
  - /import route and sidebar navigation link
key_files:
  - gurkan-ui/src/pages/Import/ImportPage.tsx
  - gurkan-ui/src/pages/Import/Import.css
  - gurkan-ui/src/api/client.ts
  - gurkan-ui/src/types/index.ts
  - gurkan-ui/src/App.tsx
  - gurkan-ui/src/components/Layout.tsx
key_decisions:
  - Used generic ImportPreviewResponse<TRow> with typed AirbnbImportRow and RentPaymentImportRow instead of Record<string, unknown> — matches backend DTOs exactly, provides IDE autocomplete and compile-time safety
  - Tab-style switcher between Airbnb and Rent sections rather than showing both simultaneously — keeps the page focused and avoids long scrolling
patterns_established:
  - Import flow pattern: file select → Preview (dryRun=true) → review table with summary stats → Confirm (dryRun=false) → success banner with link to verify records
  - Row status highlighting: import-row--error (red bg), import-row--warning (yellow bg), import-row--success (default) — reusable for any future import types
observability_surfaces:
  - /import route renders with two tab sections; blank main-content indicates routing failure
  - Network tab shows POST to /api/import/airbnb-csv or /api/import/rent-payments with multipart FormData
  - Error banner div surfaces API failures; console.warn logs import errors
  - Row-level error/warning messages render inline in preview table with colored backgrounds
duration: 25m
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T03: Frontend import page with upload, preview, and confirmation

**Built complete import page with two-section tab layout (Airbnb CSV + Rent Payments), preview/confirm flow, row-level error highlighting, property selector, and sidebar navigation**

## What Happened

Added typed import response interfaces to `types/index.ts` matching the backend DTOs exactly — `ImportPreviewResponse<TRow>` generic with `AirbnbImportRow` and `RentPaymentImportRow` providing full field typing rather than the plan's `Record<string, unknown>` suggestion. Added `importAirbnbCsv()` and `importRentPayments()` functions to `client.ts` using the same FormData multipart pattern as `uploadDocument()`.

Created `ImportPage.tsx` with tab-style switching between Airbnb CSV and Rent Payment sections. The Airbnb tab includes a property selector dropdown (fetches properties on mount via `getProperties()`), file input, Preview button (dryRun=true), and Import button (dryRun=false). The rent payments tab has just file input and the same preview/confirm flow. Both sections show: loading spinners during API calls, error banners for failures, summary card with stats (total rows, success, errors, warnings, duplicates), preview table with row-level error/warning highlighting, and a success banner with navigation link after import.

Created `Import.css` with import-specific styles for tabs, upload area, summary cards, row highlighting (red for errors, yellow for warnings), status badges, and the result banner — all using the existing CSS variable theme.

Wired the `/import` route into `App.tsx` alongside dashboard/notifications/properties, and added an "İçe Aktar" nav link with upload icon in `Layout.tsx` after "Bildirimler".

## Verification

- `npm run build` in gurkan-ui — succeeded with no TypeScript errors, compiled 108 modules
- `dotnet test --filter "Category=S03"` — all 22 tests passed including the 9 import-specific integration tests
- Frontend build output: 42.52 KB CSS, 394.49 KB JS (gzipped 107.80 KB)

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd gurkan-ui && npm run build` | 0 | ✅ pass | 3.5s |
| 2 | `dotnet test --filter "Category=S03"` | 0 | ✅ pass | 9.4s |

## Diagnostics

- **Route check:** Navigate to `/import` — page renders with "İçe Aktar" header and two tabs (Airbnb CSV, Kira Ödemeleri)
- **API requests:** Browser DevTools Network tab shows POST to `/api/import/airbnb-csv?propertyId=...&dryRun=true` or `/api/import/rent-payments?dryRun=true` with multipart/form-data content type
- **Error visibility:** API failures surface in red error-banner div with message. `console.warn('[import] ...')` logs provide debugging context
- **Row highlighting:** Error rows get `.import-row--error` (red background), warning rows get `.import-row--warning` (yellow background). Each row shows status badge and inline error/warning message

## Deviations

- Used typed `ImportPreviewResponse<TRow>` with `AirbnbImportRow` and `RentPaymentImportRow` instead of the plan's `ImportRowResult` with `data: Record<string, unknown>`. This matches the backend's actual response shape and provides compile-time safety.
- Added `NightlyRate` field to `AirbnbImportRow` which the plan omitted but the backend includes.

## Known Issues

None.

## Files Created/Modified

- `gurkan-ui/src/pages/Import/ImportPage.tsx` — New: Complete import page with two-section tab layout, preview/confirm flows, property selector
- `gurkan-ui/src/pages/Import/Import.css` — New: Import-specific styles (tabs, upload area, row highlighting, summary cards, status badges)
- `gurkan-ui/src/api/client.ts` — Modified: Added importAirbnbCsv() and importRentPayments() functions with FormData upload
- `gurkan-ui/src/types/index.ts` — Modified: Added ImportSummary, AirbnbImportRow, RentPaymentImportRow, ImportPreviewResponse<TRow> interfaces
- `gurkan-ui/src/App.tsx` — Modified: Added /import route under protected routes, imported ImportPage
- `gurkan-ui/src/components/Layout.tsx` — Modified: Added "İçe Aktar" nav link with upload icon after Bildirimler
- `.gsd/milestones/M003/slices/S03/tasks/T03-PLAN.md` — Modified: Added Observability Impact section
