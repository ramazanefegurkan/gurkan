---
estimated_steps: 6
estimated_files: 18
---

# T02: Extract shared CSS and polish UI consistency across all pages

**Slice:** S02 — Web Improvements
**Milestone:** M003

**Relevant skill:** `frontend-design` — but NOTE: this is a **polish pass within an existing design system**, not a redesign. The existing design tokens (terracotta accent `#c4653a`, DM Sans body, Playfair Display headers) must be preserved. The skill's guidance on bold aesthetic direction does NOT apply — focus on refinement, consistency, and maintainability instead.

## Description

The current CSS architecture has a messy cross-import pattern: `Properties.css` (827 lines) acts as a de-facto shared component library containing `.btn`, `.form-card`, `.form-field`, `.page-header`, `.section-title`, `.loading-container`, `.error-banner`, `.empty-state`, `.badge`, `.back-link` and more. `Tenants.css` (463 lines) similarly shares `.property-tabs`, `.data-table`, `.status-badge`. 12+ page components import both files to get these shared classes.

This task extracts the shared classes into `gurkan-ui/src/styles/shared.css`, updates all page imports, and performs a spacing/typography/responsive consistency pass. The mobile sidebar is also improved with a hamburger toggle.

**Key risk:** CSS specificity changes when moving classes between files. The build will catch import errors, but visual regressions require manual checking at desktop/tablet/mobile widths.

## Steps

1. **Create `gurkan-ui/src/styles/shared.css`** — Extract these shared classes from `Properties.css`:
   - Layout/page: `.page-header`, `.page-title`, `.page-subtitle`, `.section-header`, `.section-title`, `.back-link`
   - Buttons: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-sm`, `.btn-danger`
   - Forms: `.form-card`, `.form-field`, `.form-label`, `.form-input`, `.form-select`, `.form-textarea`, `.form-row`, `.form-actions`, `.form-error`
   - Feedback: `.loading-container`, `.loading-spinner` (if not already in index.css), `.error-banner`, `.empty-state`, `.empty-state-icon`, `.empty-state-title`, `.empty-state-text`
   - Data display: `.badge`
   - Include all responsive rules (`@media`) that apply to these shared classes
   
   Extract from `Tenants.css`:
   - Navigation: `.property-tabs`, `.property-tabs-container`, `.property-tab`, `.property-tab.active`
   - Tables: `.data-table`, `.data-table th`, `.data-table td`
   - Status: `.status-badge` variants
   - Include responsive rules for these classes

2. **Clean up source CSS files**:
   - Remove extracted classes from `Properties.css` — keep only property-page-specific styles (`.property-card`, `.property-grid`, `.property-meta`, `.group-filter`, etc.)
   - Remove extracted classes from `Tenants.css` — keep only tenant-page-specific styles (`.tenant-card`, `.payment-row`, `.rent-info`, etc.)
   - Verify remaining classes in each file are truly page-specific

3. **Update all page component `.tsx` imports**:
   - Files currently importing `'../Properties/Properties.css'` AND/OR `'../Tenants/Tenants.css'` for shared classes should instead import `'../../styles/shared.css'` (or appropriate relative path)
   - Pages that need BOTH shared + their own page-specific CSS keep two imports: `shared.css` + their own
   - Property pages (`PropertyList.tsx`, `PropertyForm.tsx`, `PropertyDetail.tsx`) import `shared.css` + `Properties.css`
   - `PropertyLayout.tsx` imports `shared.css` + `Properties.css` (for property-specific) — property-tabs now come from shared
   - Tenant pages import `shared.css` + `Tenants.css`
   - Bills, Expenses, Documents, ShortTermRentals pages import `shared.css` + their own page CSS
   - Full list of files to update imports in:
     - `gurkan-ui/src/pages/Bills/BillForm.tsx` — change Properties.css + Tenants.css → shared.css
     - `gurkan-ui/src/pages/Bills/BillList.tsx` — change Properties.css + Tenants.css → shared.css
     - `gurkan-ui/src/pages/Documents/DocumentList.tsx` — change Properties.css + Tenants.css → shared.css
     - `gurkan-ui/src/pages/Expenses/ExpenseForm.tsx` — change Properties.css + Tenants.css → shared.css
     - `gurkan-ui/src/pages/Expenses/ExpenseList.tsx` — change Properties.css + Tenants.css → shared.css
     - `gurkan-ui/src/pages/ShortTermRentals/ShortTermRentalForm.tsx` — change Properties.css + Tenants.css → shared.css
     - `gurkan-ui/src/pages/ShortTermRentals/ShortTermRentalList.tsx` — change Properties.css + Tenants.css → shared.css
     - `gurkan-ui/src/pages/Tenants/TenantDetail.tsx` — change Properties.css → shared.css, keep Tenants.css
     - `gurkan-ui/src/pages/Tenants/TenantForm.tsx` — change Properties.css → shared.css, keep Tenants.css
     - `gurkan-ui/src/pages/Tenants/TenantList.tsx` — change Properties.css → shared.css, keep Tenants.css
     - `gurkan-ui/src/pages/Properties/PropertyDetail.tsx` — add shared.css, keep Properties.css
     - `gurkan-ui/src/pages/Properties/PropertyForm.tsx` — add shared.css, keep Properties.css
     - `gurkan-ui/src/pages/Properties/PropertyList.tsx` — add shared.css, keep Properties.css
     - `gurkan-ui/src/pages/Properties/PropertyLayout.tsx` — add shared.css, keep Properties.css, remove Tenants.css

4. **Improve mobile sidebar in `Layout.css` and `Layout.tsx`**:
   - Add a hamburger button visible only on mobile (≤768px) that toggles the sidebar between collapsed (64px icon-only) and expanded (full 240px overlay)
   - Add state management in `Layout.tsx` for `sidebarOpen` toggle
   - When sidebar is open on mobile, show a semi-transparent overlay behind it that closes on click
   - Add smooth transition for sidebar width change
   - Ensure nav item text is visible when sidebar is expanded on mobile

5. **Spacing and typography consistency pass**:
   - Ensure all `.page-header` uses consistent padding/margin across pages
   - Ensure `.form-card` has consistent padding and border-radius
   - Ensure `.section-title` uses `var(--font-display)` consistently
   - Check that empty states have consistent icon size, spacing, and text styling
   - Verify buttons have consistent height and padding across all variants
   - Add any missing responsive rules for form layouts at 768px and 480px breakpoints

6. **Build and verify**:
   - Run `npm run build` — must succeed with no errors
   - Run `grep -rn "import.*Properties/Properties.css" gurkan-ui/src/pages/ --include="*.tsx"` — should only show Properties page files
   - Run `grep -rn "import.*Tenants/Tenants.css" gurkan-ui/src/pages/ --include="*.tsx"` — should only show Tenants page files and PropertyLayout
   - Visually verify key pages at desktop (1280px), tablet (768px), and mobile (375px)

## Must-Haves

- [ ] `gurkan-ui/src/styles/shared.css` exists with all shared component classes
- [ ] `Properties.css` contains only property-page-specific styles
- [ ] `Tenants.css` contains only tenant-page-specific styles
- [ ] No page outside Properties/ imports `Properties.css`
- [ ] No page outside Tenants/ and PropertyLayout imports `Tenants.css`
- [ ] Mobile sidebar has a hamburger toggle with overlay
- [ ] `npm run build` succeeds with no errors
- [ ] No visual regressions on key pages (consistent spacing, buttons, forms, tables)

## Observability Impact

This task is a CSS architecture refactoring with no runtime behavior changes. No new logs, metrics, or error states are introduced. Changes are verifiable through:
- Build output (CSS bundle size, import resolution)
- Browser DevTools CSS inspector (verify classes load from shared.css)
- Visual regression testing at multiple viewport widths

## Verification

- `cd gurkan-ui && npm run build` — no errors
- `grep -rn "import.*Properties/Properties.css" gurkan-ui/src/pages/ --include="*.tsx"` — only Property page files
- `grep -rn "import.*Tenants/Tenants.css" gurkan-ui/src/pages/ --include="*.tsx"` — only Tenant pages and PropertyLayout
- `ls gurkan-ui/src/styles/shared.css` — file exists
- Visual verification: Dashboard, PropertyList, PropertyDetail with tabs, TenantDetail, BillList, DocumentList at 1280px, 768px, 375px — all show consistent spacing, working buttons, no layout breaks

## Inputs

- `gurkan-ui/src/pages/Properties/Properties.css` (827 lines) — contains shared classes that many pages depend on: `.btn*`, `.form-*`, `.page-header`, `.section-*`, `.loading-container`, `.error-banner`, `.empty-state`, `.badge`, `.back-link`
- `gurkan-ui/src/pages/Tenants/Tenants.css` (463 lines) — contains `.property-tabs*`, `.data-table`, `.status-badge` used by 10+ pages
- `gurkan-ui/src/components/Layout.css` — sidebar responsive at 768px, no hamburger toggle
- `gurkan-ui/src/components/Layout.tsx` — sidebar with 3 nav items, no mobile toggle state
- `gurkan-ui/src/index.css` — design tokens in `:root` (terracotta accent, DM Sans, Playfair Display, surfaces, borders, radius)
- Import pattern: 12+ page .tsx files import Properties.css + Tenants.css for shared classes (see step 3 for full list)

## Expected Output

- `gurkan-ui/src/styles/shared.css` — new file with all shared component classes (buttons, forms, page headers, sections, loading, errors, empty states, badges, tabs, tables, status badges) plus their responsive rules
- `gurkan-ui/src/pages/Properties/Properties.css` — reduced to only property-page-specific styles (~200-300 lines)
- `gurkan-ui/src/pages/Tenants/Tenants.css` — reduced to only tenant-page-specific styles (~100-200 lines)
- `gurkan-ui/src/components/Layout.css` — improved with hamburger toggle styles, smooth sidebar transitions, mobile overlay
- `gurkan-ui/src/components/Layout.tsx` — added `sidebarOpen` state and hamburger toggle button
- 14 page `.tsx` files — updated CSS imports to use `shared.css` instead of cross-importing Properties/Tenants
