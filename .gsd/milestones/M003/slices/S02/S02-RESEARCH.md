# S02 (Web Improvements) — Research

**Date:** 2026-03-18

## Summary

S02 covers two distinct concerns: token refresh (R026) and web UI polish (R027). Both are straightforward application of known patterns to the existing codebase.

**Token refresh:** The backend is fully ready — `POST /api/auth/refresh` exists with refresh token rotation (revoke old → issue new pair). The frontend `client.ts` already exports a `refreshToken()` function and stores `refreshToken` in localStorage. The gap is the 401 response interceptor: it currently clears tokens and hard-redirects to `/login` instead of attempting a refresh. The AuthContext also needs to update its stored tokens after a successful refresh. This is a well-known axios interceptor pattern with one subtle concurrency edge case (multiple parallel 401s should queue behind a single refresh attempt, not trigger multiple refresh calls).

**Web UI polish:** The existing UI is already well-structured — 17 pages all follow consistent patterns (loading-container + loading-spinner, error-banner, empty-state with icon/title/text). Design tokens are centralized in `index.css`. Responsive breakpoints exist at 768px and 480px across all page CSS files. The main polish opportunities are: (1) extracting shared CSS that's currently duplicated across `Properties.css` and `Tenants.css` into a shared file so all pages import one source; (2) ensuring the property-tabs scroll horizontally on small screens (already partially handled); (3) adding a mobile hamburger menu for the sidebar (currently collapses to 64px icon-only bar at 768px but the nav text is hidden via `display: none` which removes labels entirely); (4) consistent spacing and typography pass; (5) button/form styling consistency.

## Recommendation

Split into two independent tasks:
1. **Token refresh interceptor** — modify `client.ts` response interceptor to attempt refresh before redirecting to login, update `AuthContext` to support token rotation. This is the higher-value task that directly fixes a user-facing annoyance (R026).
2. **UI polish pass** — extract shared CSS, add missing responsive rules, refine spacing/typography consistency, improve mobile sidebar. This is lower-risk CSS-only work (R027).

Build token refresh first — it's a smaller, testable unit that proves R026. UI polish is independent and can proceed in parallel.

## Implementation Landscape

### Key Files

**Token Refresh:**
- `gurkan-ui/src/api/client.ts` — Response interceptor at line 48-60 needs replacement with refresh-then-retry pattern. The `refreshToken()` function at line 72-78 already exists and calls `POST /api/auth/refresh`.
- `gurkan-ui/src/contexts/AuthContext.tsx` — Needs a `refreshSession()` method exposed to the interceptor so it can update `user` state after token rotation. Currently has `login()` and `logout()` only. The token-expired check (`isTokenExpired`) at line 38 is already implemented.
- `gurkan-ui/src/types/index.ts` — `TokenResponse` interface (line 3-7) has `accessToken`, `refreshToken`, `expiresAt` — no changes needed.

**Backend (no changes needed):**
- `GurkanApi/Controllers/AuthController.cs` — `POST /api/auth/refresh` accepts `{ refreshToken: string }`, returns `TokenResponse` (access + refresh + expiresAt) or 401. Refresh token rotation is implemented.
- `GurkanApi/Services/TokenService.cs` — Access token TTL: 15 minutes. Refresh token TTL: 7 days. Rotation: old token revoked on use, new pair issued.

**UI Polish:**
- `gurkan-ui/src/index.css` — Design tokens and global reset. Loading spinner animation defined here.
- `gurkan-ui/src/components/Layout.css` — Sidebar, main-content layout. Mobile responsive at 768px (sidebar → 64px icon-only). No hamburger menu.
- `gurkan-ui/src/components/Layout.tsx` — Sidebar with 3 nav items (Dashboard, Mülkler, Bildirimler) + user badge + logout.
- `gurkan-ui/src/pages/Properties/Properties.css` (827 lines) — De-facto shared CSS. Contains `.loading-container`, `.error-banner`, `.empty-state`, `.btn`, `.form-card`, `.form-field`, `.page-header`, `.section-title`, `.badge`, `.back-link`. Imported by 12 of 17 pages.
- `gurkan-ui/src/pages/Tenants/Tenants.css` — Contains `.property-tabs` (tab navigation) + tenant-specific styles. Imported by 10 pages that need tab navigation.
- `gurkan-ui/src/pages/Dashboard/Dashboard.css` — Dashboard-specific (summary cards, property table). Has its own responsive rules.
- `gurkan-ui/src/pages/Login.css` — Login page styling, responsive at 480px.
- Per-page CSS: `Bills.css`, `Documents.css`, `Expenses.css`, `Notifications.css`, `ShortTermRentals.css` — small page-specific overrides.

### Current CSS Architecture (important for planner)

`Properties.css` acts as a shared component library — it defines `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-sm`, `.form-card`, `.form-field`, `.form-label`, `.form-input`, `.form-select`, `.page-header`, `.page-title`, `.page-subtitle`, `.section-header`, `.section-title`, `.loading-container`, `.error-banner`, `.empty-state`, `.badge`, `.back-link`, and more. `Tenants.css` similarly shares `.property-tabs`, `.status-badge`, `.section-header`, `.btn-pay`, `.data-table`.

The cross-import pattern: most sub-pages import BOTH `Properties.css` and `Tenants.css` to get these shared classes. This works but is architecturally messy — renaming to clarify would help maintainability.

### Build Order

1. **Token refresh interceptor (T01)** — Modify `client.ts` interceptor and `AuthContext.tsx`. Proves R026. No backend changes needed.
2. **UI polish (T02)** — Extract shared CSS into `gurkan-ui/src/styles/shared.css`, refine mobile sidebar, tabs, spacing/typography pass, ensure all pages have consistent loading/empty/error patterns.

### Verification Approach

**Token Refresh:**
- Start backend + frontend locally
- Login, wait for access token to expire (or manually set `AccessTokenExpirationMinutes` to 1 in appsettings.json for testing)
- Make an API call after token expires — should silently refresh and succeed without redirect to login
- Check localStorage: accessToken, refreshToken, and expiresAt should all be updated after refresh
- Verify that an invalid/expired refresh token correctly redirects to login (graceful degradation)
- Verify concurrent 401s don't trigger multiple refresh requests (check network tab)

**UI Polish:**
- `npm run build` succeeds (no CSS import errors)
- Visual check of all major pages at desktop (1280px), tablet (768px), and mobile (375px) widths
- Confirm sidebar behavior at each breakpoint
- Confirm property-tabs scroll horizontally on mobile without layout break
- Confirm all pages show loading spinner → content/empty-state transitions
- Confirm consistent spacing on page headers, forms, tables, cards

## Constraints

- **No new dependencies** — axios interceptors and CSS are sufficient. No need for a token refresh library.
- **Backend is frozen for this slice** — Token refresh endpoint already works correctly. No backend changes.
- **Design system preservation** — Terracotta accent, DM Sans body, Playfair Display headers must be maintained. This is polish, not redesign.
- **K009** — Cannot use TypeScript `enum` declarations (erasableSyntaxOnly). Use `const` objects with `as const`.
- **K010** — JWT uses full XML namespace claim keys for token decoding.

## Common Pitfalls

- **Concurrent 401 refresh race** — If 3 API calls return 401 simultaneously, all 3 interceptors fire. Without a queue, 3 refresh calls happen — the first succeeds but the second uses the now-revoked refresh token and fails (rotation). Solution: use a `refreshPromise` singleton — if a refresh is in-flight, subsequent 401 handlers await the same promise instead of starting a new refresh.
- **Refresh on login/register 401** — The interceptor must NOT attempt refresh when the 401 comes from `/auth/login` or `/auth/refresh` itself. The current code already checks `isLoginRequest`; extend this to include `/auth/refresh` to avoid infinite loops.
- **AuthContext state sync** — The interceptor runs outside React. After a successful refresh, `localStorage` is updated by the interceptor but `AuthContext.user` state is stale (still decoded from the old token). Need a mechanism for the interceptor to notify AuthContext — either a custom event, a shared callback, or by having the interceptor update localStorage and letting AuthContext's next render pick it up (lazy approach is fine since user identity doesn't change on refresh).
- **CSS specificity when extracting shared styles** — Moving classes from `Properties.css` to a shared file may change import order and specificity. Test that no page-specific overrides break.

