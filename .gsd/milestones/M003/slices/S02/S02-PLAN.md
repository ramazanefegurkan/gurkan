# S02: Web Improvements

**Goal:** Token refresh çalışıyor (session 15dk'da kopmuyor). Web UI polish geçilmiş — tutarlı spacing, responsive, loading state'ler, boş durum görselleri, CSS mimarisi temizlenmiş.
**Demo:** Login olunduktan sonra access token expire olduğunda sayfa otomatik refresh yapıp session devam ediyor (login ekranına atılmıyor). Tüm sayfalar tutarlı spacing, responsive layout ve loading/empty state pattern'leri kullanıyor. Shared CSS tek dosyadan import ediliyor.

## Must-Haves

- 401 response interceptor that attempts token refresh before redirecting to login (R026)
- Concurrent 401 handling — multiple parallel requests share a single refresh attempt (R026)
- Invalid/expired refresh token gracefully falls back to logout + redirect to login (R026)
- AuthContext state updates after successful token rotation (R026)
- Shared CSS extracted from Properties.css and Tenants.css into `styles/shared.css` (R027)
- All page CSS imports updated to use shared file instead of cross-importing Properties/Tenants (R027)
- Mobile sidebar improvements — better small-screen navigation UX (R027)
- Consistent spacing, typography, and responsive behavior across all pages (R027)

## Proof Level

- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: yes (visual polish + token refresh flow must be manually verified)

## Verification

- `cd gurkan-ui && npm run build` — succeeds with no errors (validates all CSS imports resolve, no TypeScript errors)
- Token refresh: Login → set `AccessTokenExpirationMinutes` to 1 in backend appsettings → wait 1+ minute → make API call → network tab shows refresh request succeeding → page continues working without redirect to login
- Token refresh failure: Clear refresh token from localStorage → wait for access token to expire → make API call → redirected to login (graceful degradation)
- CSS architecture: `grep -rn "import.*Properties/Properties.css" gurkan-ui/src/pages/ --include="*.tsx"` only returns Properties page files themselves (not Bills, Tenants, etc.)
- CSS architecture: `grep -rn "import.*Tenants/Tenants.css" gurkan-ui/src/pages/ --include="*.tsx"` only returns Tenants page files and PropertyLayout
- Visual: Check Dashboard, Properties list, Property detail with tabs, Tenant detail, Bill list at desktop (1280px), tablet (768px), and mobile (375px) widths — consistent spacing, no layout breaks

## Observability / Diagnostics

- Runtime signals: Console warning when token refresh fails (before redirect to login), console.debug when refresh succeeds (for development debugging)
- Inspection surfaces: Browser localStorage keys `accessToken`, `refreshToken`, `expiresAt` updated after refresh; browser Network tab shows `POST /api/auth/refresh` calls
- Failure visibility: Failed refresh logs error to console with status code; expired/invalid refresh token triggers clean redirect to `/login`

## Integration Closure

- Upstream surfaces consumed: `gurkan-ui/src/api/client.ts` (S01 made baseURL configurable via VITE_API_URL), backend `POST /api/auth/refresh` endpoint (M001/S01)
- New wiring introduced in this slice: Response interceptor refresh-then-retry chain in `client.ts`, token update callback between interceptor and AuthContext
- What remains before the milestone is truly usable end-to-end: S03 (data import), S04-S05 (mobile app), S06 (push notifications)

## Tasks

- [x] **T01: Wire token refresh interceptor with concurrent-request queuing** `est:45m`
  - Why: R026 — users lose their session every 15 minutes because the 401 interceptor clears tokens and redirects instead of attempting a refresh. The backend refresh endpoint already exists and works.
  - Files: `gurkan-ui/src/api/client.ts`, `gurkan-ui/src/contexts/AuthContext.tsx`
  - Do: Replace the 401 response interceptor with a refresh-then-retry pattern. Use a `refreshPromise` singleton to prevent concurrent 401s from triggering multiple refresh calls. Skip refresh attempts for `/auth/login` and `/auth/refresh` URLs (prevent infinite loops). After successful refresh, update localStorage and retry the original request. On refresh failure, clear tokens and redirect to `/login`. Expose a callback mechanism so AuthContext can sync its state after token rotation.
  - Verify: `npm run build` succeeds. Manual test: login, set short token TTL, wait for expiry, make API call — session continues without redirect.
  - Done when: Access token expiry triggers silent refresh and retry; concurrent 401s share one refresh call; invalid refresh token cleanly redirects to login; AuthContext stays in sync.

- [x] **T02: Extract shared CSS and polish UI consistency across all pages** `est:1h`
  - Why: R027 — CSS is architecturally messy (12+ pages cross-import Properties.css and Tenants.css for shared classes). Extracting shared styles into a dedicated file improves maintainability and makes the polish pass safer. Mobile sidebar needs improvement. Consistent spacing/typography pass needed.
  - Files: `gurkan-ui/src/styles/shared.css` (new), `gurkan-ui/src/pages/Properties/Properties.css`, `gurkan-ui/src/pages/Tenants/Tenants.css`, `gurkan-ui/src/components/Layout.css`, all page `.tsx` files that import Properties.css or Tenants.css
  - Do: (1) Create `styles/shared.css` with shared classes extracted from Properties.css (`.btn`, `.form-card`, `.form-field`, `.page-header`, `.section-title`, `.loading-container`, `.error-banner`, `.empty-state`, `.badge`, `.back-link`) and Tenants.css (`.property-tabs`, `.data-table`, `.status-badge`). (2) Remove extracted classes from source files, keeping only page-specific styles. (3) Update all page `.tsx` imports to use `../../styles/shared.css` instead of cross-importing. (4) Improve mobile sidebar in Layout.css — add hamburger toggle for sidebar on mobile. (5) Spacing/typography consistency pass — ensure page headers, form cards, tables all use consistent spacing. (6) Verify no CSS specificity regressions by building and visually checking key pages.
  - Verify: `npm run build` succeeds. `grep -rn "import.*Properties.css" gurkan-ui/src/pages/ --include="*.tsx"` shows only Properties pages. Visual check at 1280px, 768px, 375px widths.
  - Done when: All shared CSS lives in one file, all pages import it cleanly, no visual regressions, mobile sidebar improved, spacing consistent.

## Files Likely Touched

- `gurkan-ui/src/api/client.ts`
- `gurkan-ui/src/contexts/AuthContext.tsx`
- `gurkan-ui/src/styles/shared.css` (new)
- `gurkan-ui/src/pages/Properties/Properties.css`
- `gurkan-ui/src/pages/Tenants/Tenants.css`
- `gurkan-ui/src/components/Layout.css`
- `gurkan-ui/src/components/Layout.tsx`
- `gurkan-ui/src/pages/Bills/BillForm.tsx`
- `gurkan-ui/src/pages/Bills/BillList.tsx`
- `gurkan-ui/src/pages/Documents/DocumentList.tsx`
- `gurkan-ui/src/pages/Expenses/ExpenseForm.tsx`
- `gurkan-ui/src/pages/Expenses/ExpenseList.tsx`
- `gurkan-ui/src/pages/ShortTermRentals/ShortTermRentalForm.tsx`
- `gurkan-ui/src/pages/ShortTermRentals/ShortTermRentalList.tsx`
- `gurkan-ui/src/pages/Tenants/TenantDetail.tsx`
- `gurkan-ui/src/pages/Tenants/TenantForm.tsx`
- `gurkan-ui/src/pages/Tenants/TenantList.tsx`
- `gurkan-ui/src/pages/Properties/PropertyLayout.tsx`
