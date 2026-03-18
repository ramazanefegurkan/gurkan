# S02: Web Improvements — UAT

**Milestone:** M003
**Written:** 2026-03-18

## UAT Type

- UAT mode: mixed (artifact-driven for CSS architecture + live-runtime for token refresh)
- Why this mode is sufficient: CSS architecture changes are verified structurally (grep, build). Token refresh requires a running backend with short TTL to confirm end-to-end behavior. Visual polish requires human eye at multiple viewports.

## Preconditions

1. Backend running locally (`dotnet run` from GurkanApi project, default port 5039)
2. Frontend running locally (`npm run dev` from gurkan-ui, default port 5173)
3. A valid user account exists (can login with email + password)
4. For token refresh tests: temporarily set `AccessTokenExpirationMinutes` to `1` in `appsettings.Development.json` and restart backend
5. Browser DevTools open (Console + Network tabs)

## Smoke Test

Login to the app → navigate to Dashboard → open browser console → confirm no errors. Open sidebar on mobile viewport (375px) using hamburger icon → sidebar slides in with overlay.

## Test Cases

### 1. Silent token refresh on expiry

1. Set `AccessTokenExpirationMinutes` to `1` in backend appsettings, restart backend
2. Login with valid credentials
3. Navigate to Dashboard — confirm data loads
4. Wait 60+ seconds (do not navigate away)
5. Click any navigation item that triggers an API call (e.g., go to Properties list)
6. Open Network tab → look for `POST /api/auth/refresh` request
7. **Expected:** Refresh request returns 200. Properties list loads successfully. No redirect to login. Console shows `[auth] Token refreshed successfully, new expiresAt: <date>`.

### 2. Concurrent 401s share single refresh

1. With 1-minute token TTL still active, login and wait 60+ seconds
2. Navigate to a page that makes multiple parallel API calls (e.g., PropertyDetail with tabs that load tenants + expenses + bills)
3. Open Network tab, filter for `/auth/refresh`
4. **Expected:** Only ONE `/auth/refresh` request appears despite multiple 401s from parallel calls. All parallel calls retry and succeed after the single refresh completes.

### 3. Graceful logout on invalid refresh token

1. Login with valid credentials
2. Open browser DevTools → Application → Local Storage
3. Manually delete or corrupt the `refreshToken` value (change a few characters)
4. Wait for access token to expire (60+ seconds with 1-minute TTL)
5. Navigate to trigger an API call
6. **Expected:** Console shows `[auth] Token refresh failed: <error>`. Browser redirects to `/login`. All three localStorage keys (`accessToken`, `refreshToken`, `expiresAt`) are cleared.

### 4. Auth endpoints skip refresh

1. Login → navigate to any page
2. Open browser console
3. Manually clear `accessToken` from localStorage (simulating expired token)
4. Try to login again from `/login` page
5. **Expected:** Login request goes directly without attempting refresh. No `[auth]` console messages. Login succeeds normally.

### 5. CSS architecture — no cross-page imports

1. In terminal, run: `grep -rn "import.*Properties/Properties.css" gurkan-ui/src/pages/ --include="*.tsx"`
2. **Expected:** Zero matches (exit code 1)
3. Run: `grep -rn "import.*Tenants/Tenants.css" gurkan-ui/src/pages/ --include="*.tsx"`
4. **Expected:** Zero matches (exit code 1)
5. Run: `ls gurkan-ui/src/styles/shared.css`
6. **Expected:** File exists, ~13KB

### 6. Desktop visual consistency (1280px)

1. Set browser viewport to 1280px width
2. Navigate to Dashboard
3. **Expected:** Page header, summary cards, property breakdown all have consistent spacing. No overflow or broken layout.
4. Navigate to Properties list
5. **Expected:** Property cards in grid layout, consistent padding, group filter tabs aligned.
6. Navigate to a Property detail → Tenants tab → Bills tab
7. **Expected:** Tabs are styled consistently. Data tables have uniform column spacing. Status badges display correctly.
8. Navigate to Tenant detail
9. **Expected:** Tenant info section, payment table, action buttons all use consistent styling from shared.css.

### 7. Tablet visual consistency (768px)

1. Set browser viewport to 768px width
2. **Expected:** Hamburger menu icon is visible in the header area.
3. Navigate through Dashboard, Properties, Tenants pages
4. **Expected:** Content adapts to narrower width. No horizontal scrollbar. Cards stack or resize appropriately. Tabs remain readable and tappable.
5. Page headers, buttons, badges all use consistent spacing.

### 8. Mobile visual consistency (375px)

1. Set browser viewport to 375px width
2. **Expected:** Sidebar is hidden. Hamburger icon visible.
3. Tap hamburger icon
4. **Expected:** Sidebar slides in from the left (240px wide). Semi-transparent overlay covers the rest of the screen.
5. Tap the overlay
6. **Expected:** Sidebar closes with smooth animation.
7. Tap hamburger → tap a navigation item
8. **Expected:** Sidebar auto-closes after navigation. New page loads correctly.
9. Check form pages (e.g., PropertyForm, TenantForm) at 375px
10. **Expected:** Form fields stack vertically, labels readable, buttons full-width or appropriately sized.

### 9. Empty states display correctly

1. Navigate to a property that has no tenants (or create a new property)
2. Go to Tenants tab
3. **Expected:** Empty state message displayed (not a blank white area). Styled consistently with loading/error states.
4. Check Bills tab for same property
5. **Expected:** Empty state message for bills.

### 10. Build verification

1. Run: `cd gurkan-ui && npm run build`
2. **Expected:** Build succeeds with no TypeScript errors. Output shows CSS bundle ~38-39 KB gzip.

## Edge Cases

### Token refresh during form submission

1. Start filling a long form (e.g., PropertyForm with all fields)
2. Wait for token to expire (with 1-minute TTL)
3. Submit the form
4. **Expected:** Form submission triggers 401 → refresh → retry. Form data is not lost. Submission succeeds.

### Rapid navigation during token refresh

1. Wait for token to expire
2. Rapidly click 3-4 different navigation items
3. **Expected:** One refresh fires, all requests queue behind it, all resolve successfully. No multiple login redirects.

### Sidebar interaction during navigation

1. On mobile viewport, open sidebar
2. Press browser back button
3. **Expected:** Sidebar closes (route change triggers auto-close). No UI glitch or stale state.

## Failure Signals

- Redirect to `/login` during active session after ~15 minutes → token refresh not working
- Console error `[auth] Token refresh failed` when it shouldn't → interceptor URL guard broken
- Multiple `POST /api/auth/refresh` requests in Network tab for simultaneous 401s → refreshPromise singleton broken
- CSS classes not applying (unstyled buttons, missing spacing) → shared.css import missing from a page
- Horizontal scrollbar at 768px or 375px → responsive rules missing or broken
- Hamburger icon not visible at mobile width → Layout.css responsive rules broken
- `import.*Properties/Properties.css` found in non-Property page → CSS architecture regression

## Requirements Proved By This UAT

- R026 — Tests 1-4 prove token refresh interceptor works: silent refresh, concurrent dedup, graceful fallback, auth URL exclusion
- R027 — Tests 5-9 prove CSS architecture is clean, visual consistency holds at 3 breakpoints, mobile sidebar works, empty states display

## Not Proven By This UAT

- Cross-tab token sync (not implemented — acceptable for current single-user scope)
- Production HTTPS behavior (tested locally, production deploy is S01 scope)
- Token refresh on mobile app (S04 scope — will use same pattern adapted for SecureStore)
- Long-term token stability (7-day refresh token TTL — would need extended session test)

## Notes for Tester

- Remember to reset `AccessTokenExpirationMinutes` back to `15` (or its production value) after token refresh testing.
- The `[auth]` console messages are `console.debug` (success) and `console.warn` (failure) — in Chrome, `console.debug` is hidden by default. Set the Console log level filter to include "Verbose" to see debug messages.
- Visual consistency checks are subjective — the goal is "no layout breaks, consistent spacing" not pixel-perfection. The existing design system (terracotta accent, DM Sans, Playfair Display) should be preserved.
- If testing locally without Docker, backend runs on port 5039 and frontend on 5173. CORS should allow localhost origins in development.
