---
id: T01
parent: S02
milestone: M003
provides:
  - Token refresh interceptor with concurrent-request queuing
  - AuthContext sync after silent token rotation
key_files:
  - gurkan-ui/src/api/client.ts
  - gurkan-ui/src/contexts/AuthContext.tsx
key_decisions:
  - Used callback pattern (not storage event) for AuthContext sync — storage events only fire cross-tab, not same-tab
  - Added _retried flag to prevent infinite retry loops on persistent 401s
patterns_established:
  - refreshPromise singleton pattern for deduplicating concurrent token refresh attempts
  - setOnTokenRefreshCallback for bridging non-React interceptor → React context state
observability_surfaces:
  - "console.debug('[auth] Token refreshed successfully...')" on successful refresh with new expiresAt
  - "console.warn('[auth] Token refresh failed:', error)" on refresh failure before redirect
  - localStorage keys accessToken, refreshToken, expiresAt updated after successful refresh
  - Browser Network tab shows POST /api/auth/refresh on token expiry
duration: 15m
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T01: Wire token refresh interceptor with concurrent-request queuing

**Replaced hard-redirect 401 handler with refresh-then-retry interceptor using refreshPromise singleton for concurrent request deduplication**

## What Happened

Replaced the existing 401 response interceptor in `client.ts` that cleared tokens and hard-redirected to `/login` on every 401. The new interceptor:

1. Skips refresh for `/auth/login` and `/auth/refresh` URLs to prevent infinite loops.
2. Uses a module-level `refreshPromise` singleton — when the first 401 triggers a refresh, concurrent 401s await the same promise instead of issuing duplicate refresh calls (critical because backend uses refresh token rotation and revokes old tokens).
3. On successful refresh: updates all three localStorage keys, notifies AuthContext via callback, retries the original request with the new access token.
4. On refresh failure: clears localStorage, logs a warning, redirects to `/login`.
5. Uses `finally` block to always clear `refreshPromise`, preventing deadlock if refresh throws.

Updated AuthContext to register a `setOnTokenRefreshCallback` so it picks up the new user identity (decoded from the fresh JWT) after silent rotation. Cleanup unregisters the callback on unmount.

Chose callback pattern over `storage` event listener because `window.addEventListener('storage')` only fires in *other* tabs/windows — it does not fire for changes made in the same page context where `localStorage.setItem` is called.

## Verification

- `npm run build` passes with no TypeScript errors (tsc + Vite production build)
- Code review confirms: `/auth/login` and `/auth/refresh` URLs skip refresh attempt
- Code review confirms: `refreshPromise` singleton prevents duplicate refresh calls
- Code review confirms: `_retried` flag prevents infinite retry loop
- Code review confirms: `console.debug` on success, `console.warn` on failure
- Manual runtime test documented but requires backend running with short token TTL

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd gurkan-ui && npm run build` | 0 | ✅ pass | 3.2s |
| 2 | grep for `/auth/login\|/auth/refresh` guard in interceptor | 0 | ✅ pass | <1s |
| 3 | grep for `refreshPromise` singleton pattern | 0 | ✅ pass | <1s |

### Slice-Level Verification (partial — T01 of 2)

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 1 | `npm run build` succeeds | ✅ pass | No errors |
| 2 | Token refresh interceptor wired | ✅ pass | Code-reviewed |
| 3 | CSS architecture (Properties.css cross-imports) | ⏳ T02 | 10 cross-imports remain — T02 will extract shared CSS |
| 4 | CSS architecture (Tenants.css cross-imports) | ⏳ T02 | 8 cross-imports remain — T02 will extract shared CSS |
| 5 | Visual consistency at 3 viewports | ⏳ T02 | Not yet addressed |

## Diagnostics

- **Success path:** After silent token refresh, browser console shows `[auth] Token refreshed successfully, new expiresAt: <ISO date>`. localStorage keys `accessToken`, `refreshToken`, `expiresAt` all contain updated values. Network tab shows `POST /api/auth/refresh` → 200.
- **Failure path:** Console shows `[auth] Token refresh failed: <error>`. All three localStorage keys are cleared. Browser redirects to `/login`.
- **Debugging "unexpected logout":** Check browser console for `[auth]` prefixed messages. If no refresh was attempted, check if the failing request URL contains `/auth/` (those skip refresh). If refresh was attempted but failed, check the error — likely expired refresh token (7-day TTL).

## Deviations

- Added `_retried` flag on original request config to prevent infinite retry if the retried request also returns 401 (not explicitly in plan but necessary for safety).
- Used callback pattern instead of storage event — plan listed both as options; chose callback because storage events don't fire same-tab (discovered during implementation).

## Known Issues

- Runtime verification (login → token expiry → silent refresh → continued session) requires the backend running with a short access token TTL. This is documented as a manual test step.

## Files Created/Modified

- `gurkan-ui/src/api/client.ts` — Replaced 401 interceptor with refresh-then-retry pattern; added `refreshPromise` singleton, `setOnTokenRefreshCallback` export, `_retried` guard, console diagnostics
- `gurkan-ui/src/contexts/AuthContext.tsx` — Registered `setOnTokenRefreshCallback` in mount useEffect to sync user state after silent token rotation; cleanup on unmount
