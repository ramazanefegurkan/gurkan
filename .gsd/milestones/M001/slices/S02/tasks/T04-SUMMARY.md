---
id: T04
parent: S02
milestone: M001
provides:
  - PropertyList page with responsive card grid, loading/empty/error states
  - PropertyForm page (create + edit dual mode) with all property fields and group/currency dropdowns
  - PropertyDetail page with structured field layout and full notes CRUD (add, inline edit, delete)
  - Routes wired in App.tsx replacing T03 placeholders
  - Fixed TypeScript enum types to match backend JsonStringEnumConverter output (string-based, not numeric)
key_files:
  - gurkan-ui/src/pages/Properties/PropertyList.tsx
  - gurkan-ui/src/pages/Properties/PropertyForm.tsx
  - gurkan-ui/src/pages/Properties/PropertyDetail.tsx
  - gurkan-ui/src/pages/Properties/Properties.css
  - gurkan-ui/src/App.tsx
  - gurkan-ui/src/types/index.ts
key_decisions:
  - Changed PropertyType/Currency const objects from numeric values to string values matching ASP.NET Core JsonStringEnumConverter output — backend serializes enums as "Apartment"/"TRY" strings, not 0/1 integers
  - GroupId dropdown hidden in edit mode since group assignment is immutable after creation
  - Notes use inline editing (textarea replaces content in place) rather than modal — simpler UX for short text
patterns_established:
  - Property pages share a single Properties.css with reusable .btn, .badge, .form-*, .detail-*, .note-* classes
  - All fetch calls use cancelled flag pattern in useEffect cleanup to prevent state updates on unmounted components
  - Form validation checks run client-side before API call; API errors display as error-banner at form level
observability_surfaces:
  - Browser DevTools Network tab shows all API calls (properties, notes, groups) with JWT Authorization header
  - Loading spinners visible during fetch; error banners on API failure; empty states when no data
  - Note count badge on notes section header reflects real-time count
  - Console errors surface API failures; 403/404 responses shown as user-facing error messages
duration: 25m
verification_result: passed
completed_at: 2026-03-18T12:10:00Z
blocker_discovered: false
---

# T04: Build property list and detail pages with notes

**Built property list (card grid), create/edit form, detail page with notes CRUD, and fixed enum types to match backend string serialization**

## What Happened

Built three property pages that replace the T03 placeholders. PropertyList fetches group-filtered properties and displays them in a responsive card grid with type badges, city, currency, and group labels. PropertyForm serves both create (/properties/new) and edit (/properties/:id/edit) modes, loading existing data for edits, with dropdowns for type, currency, and group (groups fetched from API). PropertyDetail shows all property fields in a structured two-column grid with a terracotta gradient accent bar, plus a full notes section supporting add, inline edit, and delete.

During browser testing, discovered that the backend's `JsonStringEnumConverter` serializes enums as strings ("Apartment", "TRY") not integers (0, 1). The T03-created TypeScript types used numeric values. Fixed `PropertyType` and `Currency` const objects in `types/index.ts` to use string values matching the API response format.

## Verification

- `npm run build` — TypeScript compiles cleanly with 0 errors
- `dotnet test --filter "Category=S02"` — all 14 integration tests pass
- Browser flow: login → empty state renders → create property with all fields → detail page shows correct type/currency badges → add note → note appears with author/timestamp → edit note inline → save updates content → delete note → empty state returns → property list shows card with correct metadata
- Edit form pre-fills all fields from API data correctly
- Back navigation (breadcrumbs) works between list ↔ detail ↔ form

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd gurkan-ui && npm run build` | 0 | ✅ pass | 4.2s |
| 2 | `dotnet test GurkanApi.Tests/ --filter "Category=S02"` | 0 | ✅ pass | 11.3s |
| 3 | Browser: login → create property → view list → detail → add/edit/delete note | — | ✅ pass | manual |

## Diagnostics

- **Property list**: Card count matches API response length; subtitle shows "N mülk listeleniyor"
- **Form errors**: Client-side validation shows inline red text; API errors display as error-banner with red background
- **Detail page**: All fields shown with labels; empty values display "—" dash
- **Notes section**: Count badge updates on add/delete; inline edit shows textarea with accent border ring; hover reveals edit/delete action buttons
- **Network inspection**: DevTools → Network tab shows GET /api/properties, GET /api/properties/:id, GET /api/properties/:id/notes, POST/PUT/DELETE calls

## Deviations

- Fixed `types/index.ts` enum values from numeric (0,1,2...) to string ("Apartment","TRY"...) to match backend `JsonStringEnumConverter` output — this was a T03 bug that only surfaced when the detail page tried to look up labels by API response values

## Known Issues

None.

## Files Created/Modified

- `gurkan-ui/src/pages/Properties/PropertyList.tsx` — Property list page with card grid, loading/empty/error states
- `gurkan-ui/src/pages/Properties/PropertyForm.tsx` — Dual-purpose create/edit form with all property fields
- `gurkan-ui/src/pages/Properties/PropertyDetail.tsx` — Detail view with structured fields and full notes CRUD
- `gurkan-ui/src/pages/Properties/Properties.css` — Shared styles for all property pages (cards, forms, notes, badges, dialogs)
- `gurkan-ui/src/App.tsx` — Replaced placeholder routes with real page components
- `gurkan-ui/src/types/index.ts` — Fixed PropertyType/Currency from numeric to string values matching API
- `.gsd/milestones/M001/slices/S02/tasks/T04-PLAN.md` — Added Observability Impact section
