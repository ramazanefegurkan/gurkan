---
id: T04
parent: S03
milestone: M001
provides:
  - 7 new React pages (TenantList, TenantForm, TenantDetail, ShortTermRentalList, ShortTermRentalForm) with full CRUD
  - PropertyLayout wrapper with persistent tab navigation (Detaylar / Kiracılar / Kısa Dönem)
  - 15 API client functions for tenants, payments, short-term rentals, rent increases
  - 4 TypeScript interfaces + 3 const enum objects matching backend DTOs
  - 7 new routes wired in App.tsx via nested route layout
key_files:
  - gurkan-ui/src/types/index.ts
  - gurkan-ui/src/api/client.ts
  - gurkan-ui/src/App.tsx
  - gurkan-ui/src/pages/Properties/PropertyLayout.tsx
  - gurkan-ui/src/pages/Properties/PropertyDetail.tsx
  - gurkan-ui/src/pages/Tenants/TenantList.tsx
  - gurkan-ui/src/pages/Tenants/TenantForm.tsx
  - gurkan-ui/src/pages/Tenants/TenantDetail.tsx
  - gurkan-ui/src/pages/Tenants/Tenants.css
  - gurkan-ui/src/pages/ShortTermRentals/ShortTermRentalList.tsx
  - gurkan-ui/src/pages/ShortTermRentals/ShortTermRentalForm.tsx
  - gurkan-ui/src/pages/ShortTermRentals/ShortTermRentals.css
key_decisions:
  - Created PropertyLayout as shared wrapper with Outlet for persistent tab navigation across all property sub-pages
  - Date fields sent as UTC ISO strings (appending T00:00:00Z) to avoid PostgreSQL Npgsql DateTimeKind.Unspecified error
  - Status badges use semantic colors (Paid=green, Late=red, Pending=yellow, Cancelled=gray) matching design system
patterns_established:
  - toUtcIso() helper for date-only form inputs — all forms that send dates to backend must convert to UTC ISO string
  - PropertyLayout nested route pattern — all property sub-pages render inside PropertyLayout which provides back-link, property title, and tab navigation
observability_surfaces:
  - Browser console clean during all CRUD operations (no JS errors)
  - API errors render as inline error banners with backend message passthrough
  - Payment status badges and platform badges provide visual diagnostic state
duration: ~45min
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T04: Build frontend pages, wire routing, and verify in browser

**Built 7 React pages for tenant management, rent payments, and short-term rentals with tab navigation, status badges, mark-paid modal, and full browser-verified CRUD**

## What Happened

Added TypeScript types (4 interfaces + 3 const enum objects using `as const` pattern) and 15 API client functions to the existing codebase. Built TenantList (active/past sections), TenantForm (create/edit dual mode), TenantDetail (info card + payment table + rent increase history + mark-paid modal + terminate confirmation), ShortTermRentalList (table with summary stats), and ShortTermRentalForm (with auto-computed night count and net amount).

Created PropertyLayout as a shared route wrapper providing persistent tab navigation (Detaylar / Kiracılar / Kısa Dönem) across all property sub-pages using React Router nested routes with `<Outlet>`. This replaced the original plan of modifying PropertyDetail directly — the layout approach gives tab persistence on all child routes without duplicating navigation code.

Hit and fixed a DateTime UTC issue: PostgreSQL with Npgsql rejects `DateTime.Kind = Unspecified`, which happens when JSON deserializes date-only strings like "2025-01-01". Added `toUtcIso()` helper to append `T00:00:00Z` to all date form submissions.

## Verification

- `npm run build` — TypeScript compiles without errors, Vite bundles cleanly (334.88 KB JS, 25.53 KB CSS)
- `dotnet test --filter "Category=S03"` — all 13 S03 integration tests pass
- Browser: login → property detail → tabs visible → Kiracılar → create tenant "Ahmet Yılmaz" → 12 auto-generated payments with Late status badges → mark first payment as Paid via modal → status changes to green "Ödendi" with payment method and date → Kısa Dönem tab → create short-term rental "John Smith" → list shows summary stats (4 nights, ₺1,700 net) and table row with platform badge
- No console errors during any navigation or form submission

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd gurkan-ui && npm run build` | 0 | ✅ pass | 4.7s |
| 2 | `dotnet test --filter "Category=S03"` | 0 | ✅ pass | 14.9s |
| 3 | Browser: tenant creation + payment display | - | ✅ pass | manual |
| 4 | Browser: mark payment paid | - | ✅ pass | manual |
| 5 | Browser: short-term rental creation + list | - | ✅ pass | manual |
| 6 | Browser: tab navigation persistence | - | ✅ pass | manual |
| 7 | Browser: console errors check | - | ✅ pass (0 errors) | manual |

## Diagnostics

- Navigate to any property → Kiracılar tab to inspect tenant/payment state
- Kısa Dönem tab shows rental records with summary stats
- Browser DevTools Network tab: filter on `/tenants/` or `/short-term-rentals/` to trace API calls
- Payment status badges reflect real-time late detection computed at query time by backend
- Error banners show backend validation/conflict messages when API calls fail

## Deviations

- Created PropertyLayout wrapper component instead of embedding tab navigation directly in PropertyDetail — provides better UX with persistent tabs across all sub-routes
- Added `toUtcIso()` helper to fix PostgreSQL DateTime UTC requirement — not in original plan but necessary for form submissions to work

## Known Issues

- None

## Files Created/Modified

- `gurkan-ui/src/types/index.ts` — added 4 interfaces (TenantListItem, TenantResponse, RentPaymentResponse, etc.) + 3 const enum objects (RentPaymentStatus, PaymentMethod, RentalPlatform) with Turkish labels
- `gurkan-ui/src/api/client.ts` — added 15 API functions for tenants, payments, short-term rentals, rent increases
- `gurkan-ui/src/App.tsx` — restructured routes with nested PropertyLayout wrapper, 7 new routes
- `gurkan-ui/src/pages/Properties/PropertyLayout.tsx` — new shared layout with tab navigation and Outlet
- `gurkan-ui/src/pages/Properties/PropertyDetail.tsx` — removed back-link and container wrapper (now handled by PropertyLayout)
- `gurkan-ui/src/pages/Tenants/TenantList.tsx` — new, active/past tenant sections with empty state
- `gurkan-ui/src/pages/Tenants/TenantForm.tsx` — new, create/edit dual mode with active tenant warning
- `gurkan-ui/src/pages/Tenants/TenantDetail.tsx` — new, info card + payment table + mark-paid modal + terminate confirmation + rent increase history
- `gurkan-ui/src/pages/Tenants/Tenants.css` — new, shared styles for tabs, status badges, data tables, modals
- `gurkan-ui/src/pages/ShortTermRentals/ShortTermRentalList.tsx` — new, table with summary stats and platform badges
- `gurkan-ui/src/pages/ShortTermRentals/ShortTermRentalForm.tsx` — new, auto-computed night count and net amount
- `gurkan-ui/src/pages/ShortTermRentals/ShortTermRentals.css` — new, card and summary styles
