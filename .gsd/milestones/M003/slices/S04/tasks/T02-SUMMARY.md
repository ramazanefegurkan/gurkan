---
id: T02
parent: S04
milestone: M003
provides:
  - Typed API client with SecureStore-based JWT interceptors for mobile
  - All TypeScript types from web project ported to mobile
  - Token refresh interceptor with singleton promise pattern
  - setOnTokenRefreshCallback for auth context ↔ interceptor sync
key_files:
  - gurkan-mobile/src/api/types.ts
  - gurkan-mobile/src/api/client.ts
  - gurkan-mobile/src/ctx.tsx
key_decisions:
  - Duplicated storage helpers in client.ts rather than importing from ctx.tsx to avoid circular dependency (client imports nothing from ctx; ctx imports from client)
  - Used null callback argument to signal refresh failure (triggers logout) vs throwing
patterns_established:
  - Async request interceptor pattern for SecureStore token attachment
  - refreshPromise singleton for deduplicating concurrent 401 refresh attempts
  - onTokenRefreshCallback registration for React state sync after silent refresh
observability_surfaces:
  - "console.debug('[auth] Token refreshed successfully, new expiresAt:', ...)" on successful silent refresh
  - "console.warn('[auth] Token refresh failed:', error)" on refresh failure
  - "console.debug('[auth] session synced after silent token refresh')" when React state updated
  - "console.debug('[auth] session cleared by refresh failure')" on logout from failed refresh
duration: ~12min
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T02: Port API client and TypeScript types with token refresh interceptor

**Ported web API client to mobile with SecureStore-based async interceptors, all TypeScript types, token refresh singleton, and wired auth context to use API client login + refresh callback**

## What Happened

1. Copied `gurkan-ui/src/types/index.ts` verbatim to `gurkan-mobile/src/api/types.ts` — all types use `const` objects (not `enum`), so they're fully React Native-compatible with no modifications needed.

2. Created `gurkan-mobile/src/api/client.ts` with:
   - Axios instance configured from `Constants.expoConfig?.extra?.apiUrl`
   - Async request interceptor that reads `accessToken` from SecureStore
   - Response interceptor with 401 → refresh → retry logic, using `refreshPromise` singleton to deduplicate concurrent refresh attempts
   - Auth URL exclusions (`/auth/login`, `/auth/refresh`) to prevent infinite loops
   - `_retried` flag to prevent infinite retry loops
   - `setOnTokenRefreshCallback` for auth context registration
   - All S04-needed API functions exported: `login`, `refreshToken`, `getDashboard`, `getNotifications`, `getProperties`, `getProperty`, `getGroups`
   - Commented TODO stubs for all remaining S05 endpoints with preserved function signatures

3. Updated `gurkan-mobile/src/ctx.tsx` to:
   - Import `login` and `setOnTokenRefreshCallback` from the new API client
   - Import `TokenResponse` from API types (removed local duplicate)
   - Register refresh callback in `useEffect` that updates React session state when interceptor silently refreshes tokens
   - Use API client's `login` function instead of raw `axios.post`
   - Clear refresh callback on `signOut`
   - Removed unused `Constants` and `axios` imports

Key adaptation from web: Instead of `window.location.href = '/login'` on refresh failure, the mobile interceptor calls `onTokenRefreshCallback(null)` which clears the session — the `Stack.Protected` auth guard handles the redirect automatically.

## Verification

- `npx tsc --noEmit` — zero TypeScript errors
- `grep` for `localStorage` / `window.` / `document.` / `import.meta.env` in `gurkan-mobile/src/` — zero hits (localStorage only inside Platform.OS === 'web' guards, which is correct)
- `refreshPromise` singleton confirmed: declared at line 79, "start refresh" at 128-129, "join existing" at 132, reset in `finally` at 162
- Auth URL exclusions confirmed at line 105
- `_retried` flag confirmed: check at line 110, set at line 147
- Observability signals confirmed: `console.debug` at line 144, `console.warn` at line 151

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd gurkan-mobile && npx tsc --noEmit` | 0 | ✅ pass | ~19s |
| 2 | `grep -rn "import\.meta\.env" src/` | 1 (no match) | ✅ pass | <1s |
| 3 | `grep -rn "window\." src/` (excl comments) | 1 (no match) | ✅ pass | <1s |
| 4 | `grep -rn "document\." src/` (excl comments) | 1 (no match) | ✅ pass | <1s |
| 5 | `grep -n "refreshPromise" src/api/client.ts` | 0 | ✅ pass (5 refs) | <1s |
| 6 | `grep -n "auth/login\|auth/refresh" src/api/client.ts` | 0 | ✅ pass (3 refs) | <1s |

## Diagnostics

- **Token refresh lifecycle:** Visible in Expo Go dev tools console — `[auth] Token refreshed successfully` / `[auth] Token refresh failed` messages
- **Auth state sync:** React DevTools shows `SessionProvider` context updating after silent refresh via callback
- **Network:** Expo Go network inspector shows `POST /api/auth/refresh` calls during token renewal
- **Failure state:** Refresh failure clears session (triggers automatic redirect to sign-in via Stack.Protected guard) with `console.warn`

## Deviations

- Storage helpers in `client.ts` are duplicated from `ctx.tsx` rather than shared — this avoids a circular dependency since `ctx.tsx` imports from `client.ts`. The duplication is minimal (two small functions) and the pattern is standard in Expo projects.

## Known Issues

None.

## Files Created/Modified

- `gurkan-mobile/src/api/types.ts` — All TypeScript types copied from web project (complete, including Import types for S05)
- `gurkan-mobile/src/api/client.ts` — Axios instance with SecureStore interceptors, token refresh singleton, S04 API functions, S05 TODO stubs
- `gurkan-mobile/src/ctx.tsx` — Updated to use API client login, register refresh callback, removed unused imports
