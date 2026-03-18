# S04: Mobil App Foundation

**Goal:** Expo (managed workflow) mobil uygulamada login olunabiliyor, dashboard görüntülenebiliyor, mülk listesi ve detayı çalışıyor — production backend'e bağlı.
**Demo:** Expo Go'da uygulama açılır → login ekranı görünür → admin@gurkan.com ile giriş yapılır → dashboard summary cards + notification banner yüklenir → Properties tabına geçilir → mülk listesi görünür → bir mülke dokunulur → detay ekranı açılır → Notifications tabında bildirimler listelenir.

## Must-Haves

- `gurkan-mobile/` Expo project (managed workflow, SDK 55, TypeScript)
- Login screen with JWT auth (email/password → accessToken + refreshToken stored in SecureStore)
- Token refresh interceptor (401 → refresh → retry, same pattern as web S02, using SecureStore)
- Auth-guarded navigation: unauthenticated → sign-in, authenticated → bottom tabs
- Bottom tab navigation: Dashboard, Properties, Notifications
- Dashboard screen: summary cards (currency breakdown), notification banner, per-property table
- Property list screen: card grid with type badges, city, currency, group name
- Property detail screen: all fields displayed (name, type, address, city, district, area, rooms, floor, build year, currency, description, group)
- Notification list screen: severity badges (Critical/Warning/Info), property name, date, message
- API client module with all endpoints needed for foundation screens (auth, dashboard, properties, notifications, groups)
- TypeScript types copied from web (all types from `gurkan-ui/src/types/index.ts`)
- Theme constants matching web design tokens (terracotta accent #c4653a, consistent color palette)

## Proof Level

- This slice proves: integration
- Real runtime required: yes (Expo Go against backend API)
- Human/UAT required: yes (manual testing in Expo Go on device/emulator)

## Verification

- `cd gurkan-mobile && npx expo export --platform android` succeeds (proves no web-only APIs, valid RN code)
- `cd gurkan-mobile && npx tsc --noEmit` passes (TypeScript type-checks with zero errors)
- Manual verification in Expo Go:
  1. Login with admin@gurkan.com / Admin123! → dashboard loads
  2. Summary cards show currency breakdown
  3. Bottom tabs switch between Dashboard / Properties / Notifications
  4. Property list shows cards with type badges and city
  5. Tapping a property opens detail screen with all fields
  6. Notifications tab shows severity-colored badges
  7. Logout returns to sign-in screen
  8. Token refresh: set short TTL → verify silent refresh (no redirect to login)

## Observability / Diagnostics

- Runtime signals: `console.debug('[auth] ...')` messages for token refresh lifecycle (same pattern as web)
- Inspection surfaces: Expo Go developer menu → network inspector shows API calls; React DevTools for component state
- Failure visibility: API errors surface as user-facing error banners with retry option on each screen; 401 refresh failures trigger automatic logout with console warning
- Redaction constraints: JWT tokens stored only in SecureStore, never logged in full — only expiry timestamps logged

## Integration Closure

- Upstream surfaces consumed:
  - Production HTTPS backend URL (from S01: `https://{DOMAIN}/api` pattern, or LAN IP for local dev)
  - `gurkan-ui/src/api/client.ts` — API function signatures and token refresh pattern (reference only, rewritten for mobile)
  - `gurkan-ui/src/types/index.ts` — TypeScript types (copied verbatim)
  - `gurkan-ui/src/contexts/AuthContext.tsx` — JWT decode + claim extraction pattern (adapted for SecureStore)
- New wiring introduced in this slice: `gurkan-mobile/` Expo project with its own API client connecting to the same backend
- What remains before the milestone is truly usable end-to-end: S05 (all sub-pages: tenants, expenses, bills, documents), S06 (push notifications)

## Tasks

- [x] **T01: Scaffold Expo project with auth context and login screen** `est:1h`
  - Why: Retires the primary risk — proves Expo can authenticate against the ASP.NET Core backend via JWT + SecureStore. Creates the project foundation that all other tasks depend on.
  - Files: `gurkan-mobile/app.config.ts`, `gurkan-mobile/package.json`, `gurkan-mobile/tsconfig.json`, `gurkan-mobile/src/ctx.tsx`, `gurkan-mobile/src/app/_layout.tsx`, `gurkan-mobile/src/app/sign-in.tsx`, `gurkan-mobile/src/theme.ts`
  - Do: Run `npx create-expo-app@latest gurkan-mobile --template default`. Install deps (`expo-secure-store`, `expo-router`, `axios`, `expo-constants`, `@expo/vector-icons`). Configure `app.config.ts` with `extra.apiUrl`. Create `useStorageState` hook backed by SecureStore. Build `SessionProvider` with `signIn`/`signOut` + JWT decode (XML namespace claim keys per K010). Create root `_layout.tsx` with `Stack.Protected` auth guards. Build login screen with email/password form. Create `theme.ts` with design tokens.
  - Verify: `cd gurkan-mobile && npx tsc --noEmit` passes. `npx expo export --platform android` succeeds. Manual: open in Expo Go → login screen renders → enter credentials → tokens stored.
  - Done when: Login screen authenticates against backend, tokens are stored in SecureStore, and auth guard redirects authenticated users away from sign-in.

- [x] **T02: Port API client and TypeScript types with token refresh interceptor** `est:45m`
  - Why: Foundation for all screens. Every screen depends on typed API functions. Token refresh interceptor (R026) prevents session expiry on mobile.
  - Files: `gurkan-mobile/src/api/client.ts`, `gurkan-mobile/src/api/types.ts`
  - Do: Copy `gurkan-ui/src/types/index.ts` to `src/api/types.ts`. Create `src/api/client.ts` with axios instance reading `apiUrl` from Constants.expoConfig.extra. Replace all `localStorage` calls with `SecureStore` (async). Implement request interceptor (attach Bearer token from SecureStore). Implement response interceptor with `refreshPromise` singleton pattern for concurrent 401s. Port all API functions needed for S04 screens: `login`, `refreshToken`, `getDashboard`, `getNotifications`, `getProperties`, `getProperty`, `getGroups`. Include stubs for remaining endpoints (S05 will fill them). Wire `setOnTokenRefreshCallback` so auth context syncs after silent refresh.
  - Verify: `npx tsc --noEmit` passes. Token refresh interceptor handles: (a) single 401 → refresh → retry, (b) concurrent 401s share one refresh promise, (c) auth URLs skip refresh, (d) `_retried` flag prevents infinite loop.
  - Done when: API client module exports all S04-needed functions with correct TypeScript types, and token refresh interceptor is wired into the axios instance.

- [x] **T03: Build tab navigation and dashboard screen** `est:45m`
  - Why: Proves end-to-end data flow: mobile API client → backend → rendered UI. Dashboard is the first screen users see after login.
  - Files: `gurkan-mobile/src/app/(tabs)/_layout.tsx`, `gurkan-mobile/src/app/(tabs)/index.tsx`, `gurkan-mobile/src/app/(tabs)/notifications.tsx`
  - Do: Create `(tabs)/_layout.tsx` with 3 bottom tabs (Dashboard, Mülkler, Bildirimler) using MaterialIcons. Build dashboard screen: parallel fetch `getDashboard()` + `getNotifications()`, summary cards per currency (income/expense/profit), notification banner with count + severity breakdown, per-property list with financial summary. Add loading spinner and error state with retry. Create placeholder notification screen (simple list). Style all screens using theme tokens from `theme.ts` — use `StyleSheet.create()`, terracotta accent for interactive elements.
  - Verify: `npx tsc --noEmit` passes. Manual in Expo Go: login → dashboard loads with summary cards → tab bar shows 3 tabs → switching tabs works.
  - Done when: Dashboard screen displays real data from API, bottom tabs navigate correctly, loading and error states work.

- [x] **T04: Build property list, property detail, and notification screens** `est:1h`
  - Why: Completes the slice — property list/detail and notifications are the remaining must-haves. Property detail proves dynamic routing with `[id].tsx`.
  - Files: `gurkan-mobile/src/app/(tabs)/properties/_layout.tsx`, `gurkan-mobile/src/app/(tabs)/properties/index.tsx`, `gurkan-mobile/src/app/(tabs)/properties/[id].tsx`, `gurkan-mobile/src/app/(tabs)/notifications.tsx`
  - Do: Create properties tab with Stack navigator (`_layout.tsx`) so list→detail push navigation works within the tab. Build property list: fetch `getProperties()`, render card grid (FlatList) with type badges, city, currency, group name. Build property detail: fetch `getProperty(id)`, display all fields (name, type, address, city/district, area, rooms, floor/totalFloors, buildYear, currency, description, group). Update notification screen: fetch `getNotifications()`, render list with severity badge colors (Critical=red, Warning=amber, Info=blue), property name, message, date. Add pull-to-refresh on all list screens. Style consistently with theme tokens.
  - Verify: `npx tsc --noEmit` passes. `npx expo export --platform android` succeeds. Manual in Expo Go: properties tab shows card list → tap card → detail screen with back navigation → all fields displayed → notifications tab shows colored severity badges → pull-to-refresh works on all lists.
  - Done when: All four screens (dashboard, property list, property detail, notifications) render real data, navigation works between all screens, and `npx expo export` succeeds.

## Files Likely Touched

- `gurkan-mobile/app.config.ts`
- `gurkan-mobile/package.json`
- `gurkan-mobile/tsconfig.json`
- `gurkan-mobile/src/ctx.tsx`
- `gurkan-mobile/src/theme.ts`
- `gurkan-mobile/src/api/client.ts`
- `gurkan-mobile/src/api/types.ts`
- `gurkan-mobile/src/app/_layout.tsx`
- `gurkan-mobile/src/app/sign-in.tsx`
- `gurkan-mobile/src/app/(tabs)/_layout.tsx`
- `gurkan-mobile/src/app/(tabs)/index.tsx`
- `gurkan-mobile/src/app/(tabs)/properties/_layout.tsx`
- `gurkan-mobile/src/app/(tabs)/properties/index.tsx`
- `gurkan-mobile/src/app/(tabs)/properties/[id].tsx`
- `gurkan-mobile/src/app/(tabs)/notifications.tsx`
