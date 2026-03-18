---
id: T03
parent: S02
milestone: M001
provides:
  - React + Vite + TypeScript project at gurkan-ui/ with complete auth infrastructure
  - AuthContext with JWT token decode, login/logout, localStorage persistence
  - Axios-based API client with Bearer token interceptor and 401 redirect
  - TypeScript types matching all backend DTOs (Property, PropertyNote, Group, TokenResponse)
  - Login page with form validation, error handling, loading state
  - Layout component with sidebar navigation, user info badge, logout button
  - React Router with ProtectedRoute guard and public login route
key_files:
  - gurkan-ui/src/api/client.ts
  - gurkan-ui/src/contexts/AuthContext.tsx
  - gurkan-ui/src/pages/Login.tsx
  - gurkan-ui/src/components/Layout.tsx
  - gurkan-ui/src/types/index.ts
  - gurkan-ui/src/App.tsx
  - gurkan-ui/src/main.tsx
  - gurkan-ui/src/index.css
key_decisions:
  - Used const objects instead of TypeScript enums for PropertyType/Currency due to Vite's erasableSyntaxOnly tsconfig
  - JWT decode extracts user info from full XML namespace claim keys (ClaimTypes.NameIdentifier etc.), fullName set to null since backend doesn't include it in token
  - Design system uses warm terracotta accent (#c4653a), DM Sans body font, Playfair Display serif headings — intentionally non-generic property management aesthetic
patterns_established:
  - Frontend design tokens in CSS custom properties on :root — all colors, fonts, radii referenced via var()
  - AuthContext pattern: createContext + useAuth hook, login/logout callbacks with useNavigate, localStorage for token persistence, JWT payload decode for user info
  - API client pattern: single axios instance with request interceptor (attach token) and response interceptor (401 → clear + redirect), typed export functions per endpoint
  - ProtectedRoute component wrapping Layout with Outlet for nested authenticated routes
observability_surfaces:
  - localStorage keys accessToken/refreshToken/expiresAt reflect auth session state
  - 401 API responses trigger automatic localStorage clear and /login redirect (visible in browser Network tab)
  - Login error messages display inline on form (Turkish: "E-posta veya şifre hatalı" for 401, "Sunucuya bağlanılamadı" for network errors)
  - npm run build exit code 0 verifies TypeScript compilation
duration: 25m
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T03: Scaffold React frontend with auth context, API client, and login page

**Scaffolded complete React + Vite + TypeScript frontend with JWT auth context, axios API client, login page, and protected routing at gurkan-ui/**

## What Happened

Created the gurkan-ui project from scratch using `npm create vite@latest` with react-ts template, then installed react-router-dom and axios. Built TypeScript types matching all backend DTOs — had to use `const` objects instead of enums because Vite's tsconfig sets `erasableSyntaxOnly: true`.

Built the API client with axios instance pointing at `localhost:5000/api`, request interceptor that attaches JWT from localStorage, and response interceptor that clears auth and redirects on 401 (skipping login requests themselves).

AuthContext decodes JWT payload using the actual ASP.NET Core claim keys (`http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier` etc.) rather than shorthand `sub`/`email` — confirmed by reading TokenService.cs. The backend doesn't include a FullName claim, so it's null in UserInfo.

Login page uses a warm terracotta design system: Playfair Display serif for brand/headings, DM Sans for body, earthy #c4653a accent. Form includes validation, loading spinner, and shake animation on error. Layout has a 240px sidebar with nav, user badge, and responsive collapse to icon-only at 768px.

Routing: BrowserRouter in main.tsx, AuthProvider wrapping AppRoutes, ProtectedRoute component that shows a loading spinner during auth check then redirects to /login if unauthenticated. Placeholder pages for /properties, /properties/new, /properties/:id ready for T04.

## Verification

1. `npm run build` — TypeScript compiles, Vite bundles (275KB JS, 6.9KB CSS)
2. Browser: navigated to localhost:5173/login, verified login form renders with all elements
3. Browser: logged in as admin@gurkan.com / Admin123! — redirected to /properties with layout showing sidebar, user info (SuperAdmin), nav
4. Browser: invalid credentials (wrong@email.com) — error message "E-posta veya şifre hatalı" displayed
5. Browser: cleared localStorage, navigated to /properties — redirected to /login (ProtectedRoute working)
6. `dotnet test --filter "Category=S02"` — all 14 backend integration tests pass (pre-existing from T01/T02)

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd gurkan-ui && npm run build` | 0 | ✅ pass | 3.2s |
| 2 | `dotnet test GurkanApi.Tests/ --filter "Category=S02"` | 0 | ✅ pass | 6.5s |
| 3 | Browser: login with admin@gurkan.com / Admin123! | — | ✅ pass | — |
| 4 | Browser: invalid credentials error display | — | ✅ pass | — |
| 5 | Browser: protected route redirect to /login | — | ✅ pass | — |

## Diagnostics

- **Build check**: `cd gurkan-ui && npm run build` — exit code 0 means TypeScript compiles
- **Dev server**: `cd gurkan-ui && npx vite --port 5173` — serves at localhost:5173
- **Auth state**: DevTools → Application → Local Storage → accessToken/refreshToken/expiresAt
- **API calls**: DevTools → Network tab — all requests to localhost:5000/api include Authorization header
- **Login errors**: Inline on form — "E-posta veya şifre hatalı" (401) or "Sunucuya bağlanılamadı" (network error)

## Deviations

- Used `const` objects with `as const` instead of TypeScript `enum` for PropertyType/Currency — Vite's default tsconfig sets `erasableSyntaxOnly: true` which forbids enum declarations
- UserInfo.fullName is always null — backend JWT doesn't include a FullName claim (only nameidentifier, email, role, GroupMemberships)

## Known Issues

- No token refresh mechanism implemented — when the 15-minute access token expires, the 401 interceptor redirects to login rather than attempting refresh. Token refresh can be added in a future task if needed.

## Files Created/Modified

- `gurkan-ui/package.json` — project manifest with react-router-dom + axios dependencies
- `gurkan-ui/src/types/index.ts` — TypeScript interfaces/types for all backend DTOs and const-object enums
- `gurkan-ui/src/api/client.ts` — Axios instance with JWT interceptor, typed API functions for all endpoints
- `gurkan-ui/src/contexts/AuthContext.tsx` — AuthProvider + useAuth hook with JWT decode, login/logout, token persistence
- `gurkan-ui/src/pages/Login.tsx` — Login page component with form, validation, error handling, loading state
- `gurkan-ui/src/pages/Login.css` — Login page styles with card animation, shake error, spinner
- `gurkan-ui/src/components/Layout.tsx` — App layout with sidebar, nav, user badge, logout, Outlet
- `gurkan-ui/src/components/Layout.css` — Layout styles with responsive sidebar collapse
- `gurkan-ui/src/App.tsx` — React Router setup with ProtectedRoute, AuthProvider, placeholder pages
- `gurkan-ui/src/main.tsx` — Entry point with BrowserRouter wrapping App
- `gurkan-ui/src/index.css` — Global CSS with design tokens (colors, fonts, radii), reset, loading screen
- `gurkan-ui/src/App.css` — Cleared Vite defaults (stub)
