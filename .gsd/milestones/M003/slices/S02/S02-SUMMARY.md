---
id: S02
parent: M003
milestone: M003
provides:
  - Token refresh interceptor with concurrent-request queuing (401 → refresh → retry)
  - AuthContext sync after silent token rotation via callback pattern
  - Shared CSS architecture — single shared.css replaces 18+ cross-page imports
  - Mobile sidebar hamburger toggle with overlay
  - Consistent spacing, typography, and responsive behavior across all pages
requires:
  - slice: S01
    provides: Production-accessible backend URL, working CORS config for web frontend
affects:
  - S04 (mobile app will need same token refresh pattern)
key_files:
  - gurkan-ui/src/api/client.ts
  - gurkan-ui/src/contexts/AuthContext.tsx
  - gurkan-ui/src/styles/shared.css
  - gurkan-ui/src/pages/Properties/Properties.css
  - gurkan-ui/src/pages/Tenants/Tenants.css
  - gurkan-ui/src/components/Layout.tsx
  - gurkan-ui/src/components/Layout.css
key_decisions:
  - D020 — Callback pattern for interceptor→AuthContext sync (storage events don't fire same-tab)
  - D021 — Single shared.css for all shared component styles, page-specific CSS kept alongside components
patterns_established:
  - refreshPromise singleton for deduplicating concurrent token refresh attempts
  - setOnTokenRefreshCallback for bridging non-React interceptor code → React context state
  - All pages import shared.css for common components, then optionally import page-specific CSS
  - Mobile sidebar uses fixed positioning + translateX transform + overlay via React state
observability_surfaces:
  - "console.debug('[auth] Token refreshed successfully, new expiresAt: ...')" on successful refresh
  - "console.warn('[auth] Token refresh failed:', error)" on refresh failure before redirect
  - localStorage keys accessToken, refreshToken, expiresAt updated after successful refresh
  - Browser Network tab shows POST /api/auth/refresh on token expiry
drill_down_paths:
  - .gsd/milestones/M003/slices/S02/tasks/T01-SUMMARY.md
  - .gsd/milestones/M003/slices/S02/tasks/T02-SUMMARY.md
duration: ~50m
verification_result: passed
completed_at: 2026-03-18
---

# S02: Web Improvements

**Token refresh interceptor with concurrent-request queuing prevents 15-minute session drops; shared CSS architecture eliminates 18+ cross-page imports; mobile sidebar hamburger toggle added.**

## What Happened

Two tasks shipped back-to-back to close the web polish gap before mobile development begins.

**T01 — Token refresh interceptor:** Replaced the hard-redirect 401 handler in `client.ts` with a refresh-then-retry pattern. The interceptor uses a module-level `refreshPromise` singleton so that when multiple parallel API calls all receive 401s simultaneously, only one refresh request is issued — the rest await the same promise. This is critical because the backend uses refresh token rotation and revokes old tokens, so duplicate refresh calls would invalidate each other. Auth URLs (`/auth/login`, `/auth/refresh`) are excluded from refresh attempts to prevent infinite loops. A `_retried` flag on the original request config prevents infinite retry if the retried request also 401s. On success, localStorage is updated and AuthContext is notified via a registered callback (`setOnTokenRefreshCallback`). On failure, tokens are cleared and the user is redirected to `/login`. The callback pattern was chosen over `window.addEventListener('storage')` because storage events only fire in *other* tabs — not the same page that wrote the value (documented in K021).

**T02 — Shared CSS & mobile sidebar:** Created `styles/shared.css` (13,136 bytes) by extracting all shared component classes from Properties.css and Tenants.css: page headers, buttons, badges, status/platform badges, forms, feedback states (loading, error, empty), back-link, section headers, tab navigation, data tables, confirm/modal dialogs, and their responsive rules. Properties.css dropped from 827→408 lines, Tenants.css from 463→233 lines. Updated imports in 14 page `.tsx` files — non-property/tenant pages now import only `shared.css` instead of cross-importing two unrelated page CSS files. Added a mobile sidebar hamburger toggle to Layout.tsx with `sidebarOpen` React state, smooth CSS transitions (translateX), semi-transparent overlay, and auto-close on route change. CSS bundle size slightly decreased (38.97→38.82 KB gzip) from deduplication.

## Verification

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 1 | `npm run build` succeeds | ✅ pass | 106 modules, no TS errors, 38.82 KB CSS gzip |
| 2 | No cross-dir Properties.css imports | ✅ pass | `grep -rn "import.*Properties/Properties.css" --include="*.tsx"` → 0 matches |
| 3 | No cross-dir Tenants.css imports | ✅ pass | `grep -rn "import.*Tenants/Tenants.css" --include="*.tsx"` → 0 matches |
| 4 | `shared.css` exists | ✅ pass | 13,136 bytes |
| 5 | Token refresh interceptor wired | ✅ pass | refreshPromise singleton, URL guards, _retried flag, console diagnostics — all confirmed via grep |
| 6 | AuthContext callback registered | ✅ pass | setOnTokenRefreshCallback imported and used in useEffect |
| 7 | Mobile hamburger toggle in Layout | ✅ pass | sidebarOpen state, hamburger-btn, sidebar-overlay confirmed |
| 8 | Visual consistency at 1280px | ✅ pass | T02 executor verified |
| 9 | Visual consistency at 768px | ✅ pass | T02 executor verified — hamburger visible |
| 10 | Visual consistency at 375px | ✅ pass | T02 executor verified — sidebar slides, overlay works |

## Requirements Advanced

- R026 — Token refresh interceptor fully wired: 401 → refresh → retry pattern with concurrent-request deduplication, AuthContext sync, graceful fallback to login on refresh failure.
- R027 — CSS architecture cleaned, mobile sidebar added, spacing/typography consistency pass completed across all pages at 3 breakpoints.

## Requirements Validated

- R026 — Build passes, interceptor code structurally verified (guards, singleton, retry flag, diagnostics). Runtime verification documented in UAT script for manual confirmation.
- R027 — Zero cross-page CSS imports remaining (grep-verified), shared.css consolidates all shared components, visual consistency confirmed at desktop/tablet/mobile.

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

- T01 added a `_retried` flag to prevent infinite retry loops — not explicitly in the plan but necessary for safety when the retried request itself returns 401.
- T02 moved `confirm-overlay`, `confirm-dialog`, `modal-overlay`, `modal-dialog`, and `platform-badge` classes into shared.css — the plan didn't explicitly list these but they were clearly shared across multiple pages.
- Properties.css ended up at 408 lines (not the ~200-300 estimated) because property detail, notes section, and confirm dialog styles are genuinely page-specific.

## Known Limitations

- Token refresh runtime behavior (login → token expiry → silent refresh → continued session) has not been tested against a live backend with short TTL. The interceptor is structurally verified through code analysis and successful build, but end-to-end runtime verification requires the backend running — documented in UAT script.
- Cross-tab token sync is not implemented — if a user has two tabs open and one refreshes the token, the other tab still uses the old token until its own 401 triggers a refresh. This is acceptable for the current single-user use case.

## Follow-ups

- S04 (Mobil App Foundation) will need the same token refresh pattern adapted for React Native with SecureStore instead of localStorage.
- Runtime UAT for token refresh should be performed when backend is running (set `AccessTokenExpirationMinutes` to 1, verify silent refresh).

## Files Created/Modified

- `gurkan-ui/src/api/client.ts` — Replaced 401 interceptor with refresh-then-retry pattern; added refreshPromise singleton, setOnTokenRefreshCallback, _retried guard, console diagnostics
- `gurkan-ui/src/contexts/AuthContext.tsx` — Registered setOnTokenRefreshCallback in mount useEffect; cleanup on unmount
- `gurkan-ui/src/styles/shared.css` — **new** shared component CSS (13,136 bytes: buttons, forms, tabs, tables, badges, feedback states, dialogs, responsive rules)
- `gurkan-ui/src/pages/Properties/Properties.css` — Reduced to property-page-specific styles (408 lines)
- `gurkan-ui/src/pages/Tenants/Tenants.css` — Reduced to tenant-page-specific styles (233 lines)
- `gurkan-ui/src/components/Layout.tsx` — Added sidebarOpen state, hamburger toggle, overlay, auto-close on route change
- `gurkan-ui/src/components/Layout.css` — Added hamburger button, sidebar overlay, mobile transitions, responsive sidebar rules
- `gurkan-ui/src/pages/Bills/BillForm.tsx` — Replaced Properties.css + Tenants.css → shared.css
- `gurkan-ui/src/pages/Bills/BillList.tsx` — Replaced Properties.css + Tenants.css → shared.css
- `gurkan-ui/src/pages/Documents/DocumentList.tsx` — Replaced Properties.css + Tenants.css → shared.css
- `gurkan-ui/src/pages/Expenses/ExpenseForm.tsx` — Replaced Properties.css + Tenants.css → shared.css
- `gurkan-ui/src/pages/Expenses/ExpenseList.tsx` — Replaced Properties.css + Tenants.css → shared.css
- `gurkan-ui/src/pages/ShortTermRentals/ShortTermRentalForm.tsx` — Replaced Properties.css + Tenants.css → shared.css
- `gurkan-ui/src/pages/ShortTermRentals/ShortTermRentalList.tsx` — Replaced Properties.css + Tenants.css → shared.css
- `gurkan-ui/src/pages/Tenants/TenantDetail.tsx` — Replaced Properties.css → shared.css, kept Tenants.css
- `gurkan-ui/src/pages/Tenants/TenantForm.tsx` — Replaced Properties.css → shared.css, kept Tenants.css
- `gurkan-ui/src/pages/Tenants/TenantList.tsx` — Replaced Properties.css → shared.css, kept Tenants.css
- `gurkan-ui/src/pages/Properties/PropertyDetail.tsx` — Added shared.css, kept Properties.css
- `gurkan-ui/src/pages/Properties/PropertyForm.tsx` — Added shared.css, kept Properties.css
- `gurkan-ui/src/pages/Properties/PropertyList.tsx` — Added shared.css, kept Properties.css
- `gurkan-ui/src/pages/Properties/PropertyLayout.tsx` — Added shared.css, kept Properties.css, removed Tenants.css

## Forward Intelligence

### What the next slice should know
- The token refresh interceptor pattern in `client.ts` is the reference implementation for S04's mobile API client. The key elements: `refreshPromise` singleton, URL exclusion for auth endpoints, `_retried` flag, callback-based context sync. Adapt for SecureStore instead of localStorage.
- `shared.css` is the single source of truth for all reusable UI classes. Any new page should import it — don't create new shared classes in page-specific CSS files.
- The mobile sidebar hamburger is a simple React state toggle (`sidebarOpen`). It auto-closes on route change via `useEffect` watching `location.pathname`.

### What's fragile
- Token refresh concurrent deduplication relies on the `refreshPromise` singleton being `null`ed in the `finally` block. If this is accidentally removed, the singleton would stick after the first refresh and deadlock all subsequent refresh attempts.
- CSS class names in `shared.css` are global (no CSS modules). Adding a class like `.btn` to a new context could clash if there's a specificity conflict. The current architecture works because all shared classes have reasonable specificity.

### Authoritative diagnostics
- Browser console `[auth]` prefixed messages — `console.debug` on successful refresh, `console.warn` on failure. These are the first place to look when debugging "unexpected logout" issues.
- `grep -rn "import.*Properties/Properties.css\|import.*Tenants/Tenants.css" gurkan-ui/src/pages/ --include="*.tsx"` — should return zero matches. Any matches indicate a regression in CSS architecture.

### What assumptions changed
- Plan assumed storage events could be used for interceptor→context sync — actually they only fire cross-tab (K021). Callback pattern was used instead.
- Plan estimated Properties.css would shrink to ~200-300 lines — actually 408 lines because property-specific styles (card grid, detail view, notes section) are larger than estimated.
