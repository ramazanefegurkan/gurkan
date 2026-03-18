# S04 (Mobil App Foundation) — Research

**Date:** 2026-03-18
**Depth:** Targeted — known technology (React Native/Expo), new to this codebase, moderate integration with existing backend

## Summary

This slice creates a new Expo (managed workflow) mobile app in `gurkan-mobile/` that connects to the existing ASP.NET Core backend over HTTPS. The app needs: JWT authentication with SecureStore token persistence, a token refresh interceptor mirroring the web pattern, a dashboard screen, and property list/detail screens — all wired to the same REST API the web UI uses.

The backend API is fully ready — 58+ endpoints across 16 controllers, JWT auth with refresh token rotation already working. The web client (`gurkan-ui/src/api/client.ts`) provides a proven API surface and token refresh pattern that the mobile client should replicate. The TypeScript types in `gurkan-ui/src/types/index.ts` can be directly copied to the mobile project (they use `const` objects + union types, no `enum` keyword — compatible with any TS project).

The primary risk is Expo + JWT integration: SecureStore replaces localStorage, and the axios interceptor pattern needs adaptation for async SecureStore reads. Navigation uses Expo Router (file-based routing) with `Stack.Protected` for auth guarding. No backend changes are needed for this slice.

## Recommendation

Use Expo SDK 55 (latest) with Expo Router for file-based navigation, `expo-secure-store` for token storage, and axios for the API client (same library as web). Reuse the TypeScript type definitions from `gurkan-ui/src/types/index.ts` verbatim. Mirror the token refresh interceptor pattern from `gurkan-ui/src/api/client.ts` with SecureStore instead of localStorage.

**Navigation:** Expo Router with bottom tabs (`expo-router` Tabs layout) — 3 tabs: Dashboard, Properties, Notifications. Property detail opens as a Stack screen pushed on top of the Properties tab.

**Auth flow:** `Stack.Protected` guards in root `_layout.tsx` — unauthenticated users see login screen, authenticated users see tabs. Session context provides `signIn`/`signOut` + token state via `useStorageState` hook backed by SecureStore.

**API URL:** Configurable via Expo's `app.config.ts` → `extra.apiUrl`, read with `expo-constants`. Default to production URL. For local development, use the machine's LAN IP (not `localhost` — the phone can't reach `localhost`).

## Implementation Landscape

### Key Files

**Existing (read-only references):**
- `gurkan-ui/src/api/client.ts` — Complete API client with all 58+ endpoint functions + token refresh interceptor. Mobile client should replicate this structure.
- `gurkan-ui/src/types/index.ts` — All TypeScript request/response types + const-object enums with Turkish labels. Copy directly to mobile project.
- `gurkan-ui/src/contexts/AuthContext.tsx` — JWT decode, claim extraction (uses full XML namespace keys per K010), token expiry check. Adapt for SecureStore.
- `gurkan-ui/src/pages/Dashboard/Dashboard.tsx` — Dashboard data fetching pattern (parallel `getDashboard()` + `getNotifications()`). Reference for mobile dashboard screen.
- `gurkan-ui/src/pages/Properties/PropertyList.tsx` — Property card grid with group filtering. Reference for mobile property list.
- `gurkan-ui/src/pages/Properties/PropertyDetail.tsx` — Property detail with field rendering pattern. Reference for mobile property detail.
- `GurkanApi/Controllers/AuthController.cs` — Login (`POST /api/auth/login`), Refresh (`POST /api/auth/refresh`). Body: `{ email, password }` → `{ accessToken, refreshToken, expiresAt }`.
- `GurkanApi/appsettings.json` — JWT config: 15min access token, 7-day refresh token.
- `GurkanApi/Program.cs` (lines 42-62) — CORS config: reads `Cors:AllowedOrigins` array, falls back to `AllowAnyOrigin()`. React Native requests from mobile devices do NOT send an `Origin` header, so CORS is not an issue for native mobile — only for Expo Web if used.

**New files to create (`gurkan-mobile/`):**
- `app.config.ts` — Expo config with `extra.apiUrl` for production backend URL
- `src/app/_layout.tsx` — Root layout with SessionProvider + Stack.Protected auth guard
- `src/app/sign-in.tsx` — Login screen
- `src/app/(tabs)/_layout.tsx` — Bottom tab navigator (Dashboard, Properties, Notifications)
- `src/app/(tabs)/index.tsx` — Dashboard screen
- `src/app/(tabs)/properties/index.tsx` — Property list screen
- `src/app/(tabs)/properties/[id].tsx` — Property detail screen
- `src/app/(tabs)/notifications.tsx` — Notification list screen
- `src/ctx.tsx` — Session context (auth state, signIn, signOut, useStorageState with SecureStore)
- `src/api/client.ts` — Axios instance + all API functions (adapted from web client.ts)
- `src/api/types.ts` — TypeScript types (copied from web types/index.ts, minus import-related types not needed yet)
- `src/theme.ts` — Design tokens mirroring web CSS variables (terracotta accent #c4653a, DM Sans font, colors)

### Build Order

**1. Project scaffold + auth proof (highest risk, unblocks everything)**
Create Expo project, install dependencies, wire up SecureStore-based auth context, build login screen, prove API call to production backend returns tokens. This retires the primary risk: "Can Expo app authenticate against the ASP.NET Core backend?"

**2. API client + types**
Port `client.ts` from web to mobile (axios + SecureStore interceptor). Copy types. This is the foundation every screen depends on.

**3. Tab navigation + Dashboard screen**
Set up Expo Router tabs layout. Build dashboard screen consuming `getDashboard()` + `getNotifications()`. Proves data flows from backend through the mobile API client to rendered UI.

**4. Property list + detail screens**
Property list with card layout + group badges. Property detail with field display. Proves navigation between list → detail works with Expo Router dynamic routes (`[id].tsx`).

**5. Notification list screen**
Simple list rendering notifications with severity badges. Low risk, rounds out the foundation.

### Verification Approach

1. **Auth proof:** `npx expo start` → open in Expo Go → login with `admin@gurkan.com` / `Admin123!` against local backend (LAN IP) → verify token stored in SecureStore → verify dashboard loads
2. **Token refresh:** Set `AccessTokenExpirationMinutes: 1` temporarily → wait for expiry → trigger API call → verify interceptor refreshes silently without redirect to login
3. **Navigation:** Verify bottom tabs switch between Dashboard/Properties/Notifications. Verify property list → tap card → detail screen with back navigation.
4. **Build check:** `npx expo export` succeeds (proves no web-only APIs used)

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Secure token storage | `expo-secure-store` | Native keychain (iOS) / encrypted SharedPreferences (Android). Don't use AsyncStorage for tokens. |
| Navigation / routing | `expo-router` (file-based) | Already the Expo standard. Provides Stack.Protected for auth guards, Tabs for bottom nav. |
| HTTP client | `axios` | Same library as web client — interceptor pattern transfers directly. No need to switch to fetch. |
| Icons | `@expo/vector-icons` (MaterialIcons / Ionicons) | Bundled with Expo, zero install cost. |

## Constraints

- **SecureStore is async** — Unlike `localStorage.getItem()` (sync), SecureStore requires `await`. The axios request interceptor must handle async token retrieval. Use `async` interceptor function (axios supports this).
- **No `window` / `document` / `localStorage`** — Mobile has no web APIs. Any code copied from web client that references these must be replaced (SecureStore for storage, no `window.location.href` for logout redirect — use router navigation instead).
- **React Native has no CSS** — All styling via `StyleSheet.create()` or inline styles. Design tokens from `index.css` must be translated to a JS theme object.
- **`import.meta.env` doesn't exist in React Native** — Use `expo-constants` (`Constants.expoConfig?.extra?.apiUrl`) for configuration.
- **Expo Go limitations** — Push notifications require a development build, not Expo Go. This slice doesn't include push (that's S06), so Expo Go is fine for testing.
- **CORS irrelevant for native mobile** — React Native's HTTP stack doesn't use browser CORS. No backend CORS changes needed. Only relevant if testing via Expo Web.
- **JWT claim keys use full XML namespaces** (K010) — `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier` for user ID, `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress` for email. The JWT decode logic in AuthContext.tsx handles this — replicate in mobile.
- **Backend enums are serialized as strings** (K011) — TypeScript const objects use string values like `"Apartment"`, not numeric ordinals. Already correct in the types file.

## Common Pitfalls

- **`localhost` unreachable from phone** — Expo Go on a physical device can't reach `localhost:5039`. For local dev, use the machine's LAN IP (e.g., `http://192.168.1.x:5039/api`). Expo prints this IP on startup.
- **Token refresh race with SecureStore** — Multiple concurrent 401 responses must share a single refresh promise (same pattern as web). The web client's `refreshPromise` singleton pattern works — port it directly. SecureStore writes are async but the promise deduplication handles this.
- **Navigation after logout** — Web uses `window.location.href = '/login'`. Mobile must use `router.replace('/sign-in')` from `expo-router`. The interceptor shouldn't handle navigation directly — it should clear tokens and let the auth context's `Stack.Protected` guard handle the redirect automatically.
- **Date formatting** — `Intl.DateTimeFormat` works in React Native (Hermes engine supports it since 2023). The `tr-TR` locale formatting from web code should work on mobile too, but test on Android where locale support can vary.
- **Copying types file** — The web types file includes `ImportPreviewResponse`, `AirbnbImportRow`, `RentPaymentImportRow` which aren't needed for S04. Copy the file but these unused types are harmless.

## Open Risks

- **Expo SDK version / template compatibility** — Expo SDK 55 is current as of early 2026. If the executor encounters issues with `create-expo-app`, it should use `--template default@sdk-55` explicitly.
- **DM Sans font loading on mobile** — The web app uses Google Fonts via CSS `@import`. Mobile needs `expo-font` + `@expo-google-fonts/dm-sans` or a local font file. If font loading fails, the app should fall back to system sans-serif — not block rendering.
- **Android emulator network access** — Android emulator uses `10.0.2.2` to reach the host machine, not `localhost`. This is a development-only concern, not production.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| React Native + Expo | `jezweb/claude-skills@react-native-expo` (744 installs) | available — `npx skills add jezweb/claude-skills@react-native-expo` |
| React Native | `callstackincubator/agent-skills@react-native-best-practices` (7.7K installs) | available — `npx skills add callstackincubator/agent-skills@react-native-best-practices` |
| React Native Architecture | `wshobson/agents@react-native-architecture` (4.9K installs) | available — `npx skills add wshobson/agents@react-native-architecture` |

## Sources

- Expo Router auth pattern with `Stack.Protected` and `useStorageState` hook (source: [Expo Router Authentication Docs](https://docs.expo.dev/router/advanced/authentication))
- SecureStore API for encrypted native token storage (source: [Expo SecureStore Guide](https://docs.expo.dev/guides/authentication))
- Bottom tab navigation with `Tabs` component (source: [Expo Router Tabs Docs](https://docs.expo.dev/router/advanced/tabs))
- `Stack.Protected` guard for conditional screen rendering based on auth state (source: [Expo Router Common Navigation Patterns](https://docs.expo.dev/router/basics/common-navigation-patterns))
