---
estimated_steps: 5
estimated_files: 2
---

# T01: Wire token refresh interceptor with concurrent-request queuing

**Slice:** S02 — Web Improvements
**Milestone:** M003

## Description

The current 401 response interceptor in `client.ts` clears tokens and hard-redirects to `/login` on any 401 response. This means users get kicked out every 15 minutes when the access token expires, even though the backend has a fully working `POST /api/auth/refresh` endpoint with refresh token rotation.

This task replaces the 401 handler with a proper refresh-then-retry pattern. The key subtlety is concurrent request handling: if multiple API calls return 401 simultaneously, they must share a single refresh attempt (via a `refreshPromise` singleton) rather than each triggering their own refresh — because the backend uses refresh token rotation (revokes the old token), so the second refresh call would fail with an already-revoked token.

The interceptor must also NOT attempt refresh on 401s from `/auth/login` or `/auth/refresh` itself to prevent infinite loops.

After a successful refresh, `AuthContext` needs to pick up the new tokens. Since the interceptor runs outside React, the simplest approach is: the interceptor updates localStorage, and AuthContext listens for a `storage` event or checks on next render. Alternatively, a callback registered by AuthContext can be called by the interceptor. The lazy approach (AuthContext reads from localStorage on next check) is acceptable because user identity doesn't change on refresh — only the token validity.

**Relevant knowledge:** K009 (no TS enums), K010 (JWT XML namespace claim keys), K014 (backend runs on port 5039).

## Steps

1. **Replace the 401 response interceptor in `client.ts`** (lines 48-60):
   - Add a module-level `let refreshPromise: Promise<TokenResponse> | null = null` variable
   - In the 401 handler, check if the request URL includes `/auth/login` or `/auth/refresh` — if so, reject immediately without attempting refresh (prevents infinite loops)
   - If no refresh is in-flight (`refreshPromise` is null), start one: read `refreshToken` from localStorage, call the `refreshToken()` function, store the promise in `refreshPromise`
   - If a refresh IS in-flight, await the existing `refreshPromise`
   - On successful refresh: update localStorage (`accessToken`, `refreshToken`, `expiresAt`), set `refreshPromise = null`, retry the original request with the new access token
   - On refresh failure: clear localStorage, set `refreshPromise = null`, redirect to `/login`
   - Use a `finally` block or `.finally()` to ensure `refreshPromise` is always cleared

2. **Update AuthContext to stay in sync after token rotation**:
   - Add a `storage` event listener in the `useEffect` that restores session on mount
   - When the `storage` event fires for `accessToken`, decode the new token and update `user` state
   - This ensures AuthContext's `user` and `isAuthenticated` stay current after the interceptor silently refreshes tokens
   - Alternative (simpler): add an exported `onTokenRefresh` callback setter that the AuthContext registers, and the interceptor calls after successful refresh

3. **Update the `refreshToken` function export** if needed — it currently takes a token string parameter and calls `POST /api/auth/refresh`. Verify this matches the backend contract (`{ refreshToken: string }` body → `TokenResponse` response). No changes expected here.

4. **Add a console.warn on refresh failure** and **console.debug on refresh success** for development debugging. These help future agents diagnose token refresh issues without needing to add breakpoints.

5. **Build and verify**: Run `npm run build` to ensure no TypeScript errors. The full runtime test (login → wait for token expiry → confirm silent refresh) requires the backend running, which is documented as a manual verification step.

## Must-Haves

- [ ] 401 interceptor attempts refresh before redirecting to login
- [ ] Concurrent 401s share a single refresh promise (no duplicate refresh calls)
- [ ] `/auth/login` and `/auth/refresh` 401s skip the refresh attempt (no infinite loops)
- [ ] localStorage is updated with new tokens after successful refresh
- [ ] Original failed request is retried with the new access token
- [ ] Invalid/expired refresh token triggers clean logout + redirect to `/login`
- [ ] AuthContext user state stays in sync after token rotation
- [ ] `npm run build` passes

## Verification

- `cd gurkan-ui && npm run build` — no errors
- Code review: the interceptor checks for `/auth/login` and `/auth/refresh` before attempting refresh
- Code review: `refreshPromise` singleton pattern prevents duplicate refresh calls
- Manual runtime test (documented, not automated):
  1. Start backend with short access token TTL (e.g., 1 minute)
  2. Login in the frontend
  3. Wait for access token to expire
  4. Navigate or trigger an API call
  5. Verify: Network tab shows `POST /api/auth/refresh` → 200, followed by retried original request succeeding
  6. Verify: localStorage `accessToken`, `refreshToken`, `expiresAt` are all updated
  7. Verify: No redirect to `/login`

## Inputs

- `gurkan-ui/src/api/client.ts` — current interceptor at lines 48-60 clears tokens and redirects on any 401. `refreshToken()` function at lines 72-78 already calls `POST /api/auth/refresh`.
- `gurkan-ui/src/contexts/AuthContext.tsx` — has `login()` and `logout()` but no mechanism to sync state after external token updates. Uses `extractUserFromToken()` to decode JWT. Stores user in React state.
- `gurkan-ui/src/types/index.ts` — `TokenResponse` interface has `accessToken`, `refreshToken`, `expiresAt`
- Backend `POST /api/auth/refresh` accepts `{ refreshToken: string }`, returns `TokenResponse`, uses refresh token rotation (revokes old, issues new pair). Access token TTL: 15 minutes, refresh token TTL: 7 days.

## Observability Impact

- **New console signals:** `console.debug` on successful token refresh (includes new expiresAt), `console.warn` on refresh failure (includes HTTP status or error message). These are development-only diagnostics — no production log transport.
- **Inspection surfaces:** After a silent refresh, `localStorage.getItem('accessToken')`, `localStorage.getItem('refreshToken')`, and `localStorage.getItem('expiresAt')` all contain updated values. Browser Network tab shows `POST /api/auth/refresh` requests.
- **Failure visibility:** When refresh fails (expired/revoked refresh token, network error), the interceptor logs a console warning with the failure reason, clears all three localStorage keys, and redirects to `/login`. A future agent debugging "unexpected logout" should check the browser console for these warnings.
- **AuthContext sync:** After interceptor-driven token rotation, AuthContext's `user` state updates via a callback mechanism. The user sees no flash or re-render — the identity doesn't change, only the token validity.

## Expected Output

- `gurkan-ui/src/api/client.ts` — response interceptor replaced with refresh-then-retry pattern using `refreshPromise` singleton. localStorage updated on successful refresh. Failed request retried with new token.
- `gurkan-ui/src/contexts/AuthContext.tsx` — mechanism added to sync `user` state after interceptor-driven token refresh (either storage event listener or callback pattern).
