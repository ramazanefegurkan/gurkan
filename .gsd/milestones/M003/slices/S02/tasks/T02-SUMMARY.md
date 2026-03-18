---
id: T02
parent: S02
milestone: M003
provides:
  - Shared CSS file (shared.css) with all reusable component classes
  - Clean CSS architecture with no cross-page imports
  - Mobile sidebar hamburger toggle with overlay
key_files:
  - gurkan-ui/src/styles/shared.css
  - gurkan-ui/src/pages/Properties/Properties.css
  - gurkan-ui/src/pages/Tenants/Tenants.css
  - gurkan-ui/src/components/Layout.tsx
  - gurkan-ui/src/components/Layout.css
key_decisions:
  - Moved confirm-dialog and modal-overlay classes into shared.css since they are used by multiple pages (Property delete confirmation, Tenant payment modal)
  - Kept platform-badge in shared.css alongside status-badge since ShortTermRentals pages depend on it
patterns_established:
  - All pages import shared.css for common components (buttons, forms, tables, tabs, badges, feedback states) then optionally import their own page-specific CSS
  - Mobile sidebar uses fixed positioning with translateX transform and a conditional overlay rendered via React state
observability_surfaces:
  - none
duration: ~35min
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T02: Extract shared CSS and polish UI consistency across all pages

**Extracted shared component classes into `gurkan-ui/src/styles/shared.css`, eliminated all cross-page CSS imports, and added mobile sidebar hamburger toggle with overlay.**

## What Happened

1. Created `gurkan-ui/src/styles/shared.css` with all shared component classes extracted from Properties.css and Tenants.css: page headers, buttons, badges, status badges, platform badges, forms, feedback states (loading, error, empty), back-link, section headers, tab navigation, data tables, confirm/modal dialogs, and their responsive rules.

2. Reduced Properties.css from 827 lines to 408 lines — now contains only property-page-specific styles (property card grid, detail view, notes section).

3. Reduced Tenants.css from 463 lines to 233 lines — now contains only tenant-page-specific styles (tenant card, past tenant items, tenant info section, payments section).

4. Updated imports in 14 page .tsx files: Bills (2), Documents (1), Expenses (2), ShortTermRentals (2), Tenants (3), Properties (4). Non-property/tenant pages replaced both `Properties.css` and `Tenants.css` imports with a single `shared.css` import. Property pages added `shared.css` alongside their existing `Properties.css`. Tenant pages replaced `Properties.css` with `shared.css` and kept `Tenants.css`. PropertyLayout replaced `Tenants.css` with `shared.css` and kept `Properties.css`.

5. Added mobile sidebar hamburger toggle to Layout.tsx and Layout.css: a `sidebarOpen` state with toggle button visible at ≤768px, semi-transparent overlay that closes on click, smooth CSS transitions, sidebar slides in from the left at full 240px width. Wrapped nav item text in `<span>` tags to allow CSS hiding. Sidebar auto-closes on route change.

6. Build passes, no console errors, visual verification confirmed at 1280px (desktop), 768px (tablet), and 375px (mobile) with correct rendering of page headers, buttons, badges, empty states, tabs, data tables, and sidebar toggle.

## Verification

- `npm run build` → passed, bundle size 38.82 KB CSS gzip (slightly smaller than pre-refactor 38.97 KB due to dedup)
- `grep -rn "import.*Properties/Properties.css" gurkan-ui/src/pages/ --include="*.tsx"` → zero matches (Property pages use `./Properties.css` relative import, not cross-dir)
- `grep -rn "import.*Tenants/Tenants.css" gurkan-ui/src/pages/ --include="*.tsx"` → zero matches (same pattern)
- `ls gurkan-ui/src/styles/shared.css` → exists (13,136 bytes)
- Visual verification at desktop (1280px): PropertyList, PropertyDetail with tabs, TenantList, BillList (empty state), Dashboard — all consistent
- Visual verification at tablet (768px): hamburger visible, layout responsive, tabs readable
- Visual verification at mobile (375px): hamburger toggle works, sidebar slides in with overlay, closes on overlay click

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd gurkan-ui && npm run build` | 0 | ✅ pass | 4.9s |
| 2 | `grep -rn "import.*Properties/Properties.css" gurkan-ui/src/pages/ --include="*.tsx"` | 1 (no match) | ✅ pass | <1s |
| 3 | `grep -rn "import.*Tenants/Tenants.css" gurkan-ui/src/pages/ --include="*.tsx"` | 1 (no match) | ✅ pass | <1s |
| 4 | `ls gurkan-ui/src/styles/shared.css` | 0 | ✅ pass | <1s |
| 5 | Visual: Desktop (1280px) — Dashboard, PropertyList, PropertyDetail, TenantList, BillList | — | ✅ pass | manual |
| 6 | Visual: Tablet (768px) — BillList with tabs, hamburger visible | — | ✅ pass | manual |
| 7 | Visual: Mobile (375px) — hamburger toggle, sidebar overlay, close on click | — | ✅ pass | manual |

### Slice-level verification (partial — T02 of S02)

| # | Check | Verdict | Notes |
|---|-------|---------|-------|
| 1 | `npm run build` succeeds | ✅ pass | TypeScript + Vite build clean |
| 2 | CSS architecture: Properties.css not cross-imported | ✅ pass | Only Property pages import it |
| 3 | CSS architecture: Tenants.css not cross-imported | ✅ pass | Only Tenant pages import it |
| 4 | Token refresh verification | ⏭️ skip | T01 scope, backend-dependent |
| 5 | Visual consistency at 3 breakpoints | ✅ pass | No layout breaks |

## Diagnostics

None — this is a CSS architecture refactoring task. No runtime signals, logs, or error states introduced. Changes are visible through browser DevTools' CSS inspector (verify classes load from shared.css) and the import graph in Vite's dependency tree.

## Deviations

- Properties.css ended up at 408 lines (vs ~200-300 estimated) because property detail, notes section, and confirm dialog styles are genuinely page-specific and couldn't be reduced further.
- Moved `confirm-overlay`, `confirm-dialog`, `modal-overlay`, `modal-dialog` and `platform-badge` classes into shared.css since they are used across multiple page contexts — the plan didn't explicitly list these but they were clearly shared.

## Known Issues

None.

## Files Created/Modified

- `gurkan-ui/src/styles/shared.css` — **new** shared component CSS (buttons, forms, tabs, tables, badges, feedback states, dialogs, responsive rules)
- `gurkan-ui/src/pages/Properties/Properties.css` — reduced to property-page-specific styles only (408 lines)
- `gurkan-ui/src/pages/Tenants/Tenants.css` — reduced to tenant-page-specific styles only (233 lines)
- `gurkan-ui/src/components/Layout.tsx` — added `sidebarOpen` state, hamburger toggle, overlay, auto-close on route change
- `gurkan-ui/src/components/Layout.css` — added hamburger button, sidebar overlay, mobile transitions, responsive sidebar
- `gurkan-ui/src/pages/Bills/BillForm.tsx` — replaced Properties.css + Tenants.css → shared.css
- `gurkan-ui/src/pages/Bills/BillList.tsx` — replaced Properties.css + Tenants.css → shared.css
- `gurkan-ui/src/pages/Documents/DocumentList.tsx` — replaced Properties.css + Tenants.css → shared.css
- `gurkan-ui/src/pages/Expenses/ExpenseForm.tsx` — replaced Properties.css + Tenants.css → shared.css
- `gurkan-ui/src/pages/Expenses/ExpenseList.tsx` — replaced Properties.css + Tenants.css → shared.css
- `gurkan-ui/src/pages/ShortTermRentals/ShortTermRentalForm.tsx` — replaced Properties.css + Tenants.css → shared.css
- `gurkan-ui/src/pages/ShortTermRentals/ShortTermRentalList.tsx` — replaced Properties.css + Tenants.css → shared.css
- `gurkan-ui/src/pages/Tenants/TenantDetail.tsx` — replaced Properties.css → shared.css, kept Tenants.css
- `gurkan-ui/src/pages/Tenants/TenantForm.tsx` — replaced Properties.css → shared.css, kept Tenants.css
- `gurkan-ui/src/pages/Tenants/TenantList.tsx` — replaced Properties.css → shared.css, kept Tenants.css
- `gurkan-ui/src/pages/Properties/PropertyDetail.tsx` — added shared.css, kept Properties.css
- `gurkan-ui/src/pages/Properties/PropertyForm.tsx` — added shared.css, kept Properties.css
- `gurkan-ui/src/pages/Properties/PropertyList.tsx` — added shared.css, kept Properties.css
- `gurkan-ui/src/pages/Properties/PropertyLayout.tsx` — added shared.css, kept Properties.css, removed Tenants.css
