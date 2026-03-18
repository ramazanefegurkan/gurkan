---
estimated_steps: 6
estimated_files: 3
---

# T02: Port API client and TypeScript types with token refresh interceptor

**Slice:** S04 — Mobil App Foundation
**Milestone:** M003

## Description

Create the mobile API client module by porting the web's `gurkan-ui/src/api/client.ts` to work with SecureStore (async) instead of localStorage (sync). Copy all TypeScript types from `gurkan-ui/src/types/index.ts`. Implement the token refresh interceptor that handles concurrent 401s with a singleton promise pattern — same architecture as the web client but adapted for React Native's async storage.

This task addresses R026 (token refresh on mobile) and provides the typed API surface every screen in T03/T04 depends on.

**Key constraint:** SecureStore is async, unlike localStorage. The axios request interceptor must use `async` for token retrieval. The response interceptor's refresh flow already uses `async/await` so it adapts naturally, but storage reads/writes must all be `await`ed.

**Key constraint:** No `window`, `document`, `localStorage`, or `import.meta.env` in React Native. Use `SecureStore` for storage, `Constants.expoConfig?.extra?.apiUrl` for API URL, and `router.replace('/sign-in')` is NOT needed in the interceptor — let the auth context handle logout by clearing the session (K021 equivalent: the interceptor should call the registered callback + clear SecureStore, and `Stack.Protected` guard handles the redirect automatically).

## Steps

1. **Copy types file:** Copy `gurkan-ui/src/types/index.ts` to `gurkan-mobile/src/api/types.ts`. The file is fully compatible with React Native (uses `const` objects, not `enum` — K009). No modifications needed. All types are useful for future S05 screens, so keep the complete file including Import types.

2. **Create `src/api/client.ts` — Axios instance and configuration:**
   - Import `Constants` from `expo-constants` to read `apiUrl` from `Constants.expoConfig?.extra?.apiUrl`.
   - Create axios instance with `baseURL` from config, fallback to `http://localhost:5039/api` for dev safety.
   - Set default header `Content-Type: application/json`.

3. **Implement request interceptor — attach JWT:**
   - Use `async` interceptor function (axios supports this).
   - Read `accessToken` from SecureStore via `SecureStore.getItemAsync('accessToken')`.
   - Attach as `Authorization: Bearer ${token}` header.

4. **Implement response interceptor — token refresh on 401:**
   - On non-401 errors, reject immediately.
   - Skip refresh for `/auth/login` and `/auth/refresh` URLs (prevent infinite loops).
   - Skip if `originalRequest._retried` is already true (prevent infinite retry).
   - Check for stored `refreshToken` in SecureStore — if missing, clear all tokens and set `onTokenRefreshCallback` to null state (triggering auth context to show sign-in).
   - Use `refreshPromise` singleton: if already refreshing, await the existing promise. Otherwise, call `refreshToken(storedRefreshToken)`.
   - On success: write new `accessToken`, `refreshToken`, `expiresAt` to SecureStore. Call `onTokenRefreshCallback` if registered. Log `console.debug('[auth] Token refreshed successfully')`. Set `_retried = true`, update Authorization header, retry the original request.
   - On failure: clear all SecureStore tokens. Call `onTokenRefreshCallback(null)` to trigger logout. Log `console.warn('[auth] Token refresh failed')`.
   - In `finally`: reset `refreshPromise = null`.

5. **Export API functions for S04 screens:** Port these functions from the web client with identical signatures:
   - Auth: `login(email, password)`, `refreshToken(token)`
   - Dashboard: `getDashboard()`
   - Notifications: `getNotifications()`
   - Properties: `getProperties()`, `getProperty(id)`
   - Groups: `getGroups()`
   - Export `setOnTokenRefreshCallback(cb)` for auth context registration.
   - Add commented stubs / TODO markers for remaining endpoints (tenants, expenses, bills, documents, etc.) that S05 will implement. Include the function signatures from the web client as comments so S05 can fill them in easily.

6. **Wire auth context to API client:** Update `src/ctx.tsx` (from T01) to:
   - Import `setOnTokenRefreshCallback` from the new API client.
   - In `SessionProvider`'s mount effect, register a callback that updates the session state when tokens are refreshed by the interceptor.
   - Update `signIn` to use the API client's `login` function instead of raw axios call.
   - Update `signOut` to also call `setOnTokenRefreshCallback(null)`.

## Must-Haves

- [ ] `src/api/types.ts` contains all TypeScript types from the web project
- [ ] `src/api/client.ts` creates an axios instance with SecureStore-based interceptors
- [ ] Request interceptor reads token from SecureStore (async)
- [ ] Response interceptor handles 401 → refresh → retry with `refreshPromise` singleton
- [ ] Auth URLs (`/auth/login`, `/auth/refresh`) are excluded from refresh logic
- [ ] `_retried` flag prevents infinite retry loops
- [ ] `setOnTokenRefreshCallback` allows auth context to sync after silent refresh
- [ ] All S04-needed API functions are exported with correct TypeScript types
- [ ] No references to `localStorage`, `window`, `document`, or `import.meta.env`
- [ ] `src/ctx.tsx` updated to use API client's login function and register refresh callback

## Verification

- `cd gurkan-mobile && npx tsc --noEmit` — zero TypeScript errors
- Code review: grep for `localStorage` / `window.` / `document.` / `import.meta.env` in `gurkan-mobile/src/` — zero hits
- Code review: `refreshPromise` variable exists and is used in both the "start refresh" and "join existing refresh" branches
- Code review: `/auth/login` and `/auth/refresh` URLs are checked before attempting refresh
- Manual: login → dashboard loads → API calls use Bearer token from SecureStore

## Observability Impact

- Signals added: `console.debug('[auth] Token refreshed successfully, new expiresAt:', ...)` on successful refresh; `console.warn('[auth] Token refresh failed:', error)` on failure
- How a future agent inspects this: Expo Go developer tools → console output shows auth lifecycle events
- Failure state exposed: refresh failure triggers console warning + automatic logout (session cleared → auth guard redirects to sign-in)

## Inputs

- `gurkan-ui/src/api/client.ts` — Complete web API client (reference for all function signatures, interceptor logic)
- `gurkan-ui/src/types/index.ts` — TypeScript types to copy
- `gurkan-mobile/src/ctx.tsx` — Auth context from T01 (will be updated to wire refresh callback)
- K010: JWT XML namespace claim keys
- K011: Backend enums serialized as strings
- K021: Same-tab storage sync limitation (callback pattern instead of storage events)

## Expected Output

- `gurkan-mobile/src/api/types.ts` — All TypeScript types (copied from web)
- `gurkan-mobile/src/api/client.ts` — Axios instance + SecureStore interceptors + all S04 API functions + TODO stubs for S05
- `gurkan-mobile/src/ctx.tsx` — Updated to use API client login + register refresh callback
