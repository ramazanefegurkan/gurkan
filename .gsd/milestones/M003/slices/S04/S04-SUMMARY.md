---
id: S04
parent: M003
milestone: M003
provides:
  - gurkan-mobile/ Expo managed-workflow project (SDK 54, TypeScript, React 19)
  - JWT auth with SecureStore-backed token storage (signIn/signOut/session/user)
  - Token refresh interceptor with refreshPromise singleton pattern (401 → refresh → retry)
  - Auth-guarded navigation via Stack.Protected (unauthenticated → sign-in, authenticated → tabs)
  - Bottom tab navigation (Dashboard / Mülkler / Bildirimler)
  - Dashboard screen with currency-grouped summary cards, notification banner, per-property financial list
  - Property list screen with FlatList cards (type/city/currency/group badges)
  - Property detail screen with dynamic [id] routing showing all fields in sections
  - Notification list screen with severity-colored badges (Critical/Warning/Info) and pressable property links
  - Typed API client module with all S04 endpoints and S05 stubs
  - Design token system (terracotta accent #c4653a, DM Sans font, consistent spacing/colors)
requires:
  - slice: S01
    provides: Production HTTPS backend URL for mobile API calls
  - slice: S02
    provides: Token refresh interceptor pattern (reference implementation adapted for SecureStore)
affects:
  - S05
  - S06
key_files:
  - gurkan-mobile/app.config.ts
  - gurkan-mobile/src/ctx.tsx
  - gurkan-mobile/src/theme.ts
  - gurkan-mobile/src/api/client.ts
  - gurkan-mobile/src/api/types.ts
  - gurkan-mobile/app/_layout.tsx
  - gurkan-mobile/app/sign-in.tsx
  - gurkan-mobile/app/(tabs)/_layout.tsx
  - gurkan-mobile/app/(tabs)/index.tsx
  - gurkan-mobile/app/(tabs)/notifications.tsx
  - gurkan-mobile/app/(tabs)/properties/_layout.tsx
  - gurkan-mobile/app/(tabs)/properties/index.tsx
  - gurkan-mobile/app/(tabs)/properties/[id].tsx
key_decisions:
  - D022: expo-secure-store for native JWT storage (encrypted keychain), localStorage fallback for web
  - D023: Duplicated storage helpers in client.ts to avoid circular dependency with ctx.tsx
  - Stack.Protected pattern for auth-guarded routing (Expo Router docs pattern)
  - DM Sans font via @expo-google-fonts/dm-sans with useFonts hook
  - Properties tab uses nested Stack navigator (headerShown:false in tab) for list→detail push navigation
  - Notification property names are pressable, linking to property detail via cross-tab deep linking
patterns_established:
  - useStorageState hook for cross-platform encrypted storage (SecureStore native / localStorage web)
  - SessionProvider context with JWT claim extraction using ASP.NET XML namespace keys (K010)
  - Async axios interceptors reading tokens from SecureStore (not synchronous localStorage)
  - refreshPromise singleton for deduplicating concurrent 401 refresh attempts
  - onTokenRefreshCallback registration for React context ↔ interceptor sync
  - Screen-level console.debug logging with component prefix ([dashboard], [properties], [auth])
  - Detail screen pattern: useLocalSearchParams + Stack.Screen options for dynamic title
  - formatAmount helper using tr-TR locale for Turkish number formatting
  - Severity config mapping for notification styling (Critical=red, Warning=amber, Info=blue)
  - Pull-to-refresh via RefreshControl on all list screens
  - Loading spinner + error state with retry button on all data screens
observability_surfaces:
  - "console.debug('[auth] signIn attempt/success/signOut') — auth lifecycle"
  - "console.debug('[auth] Token refreshed successfully') — silent refresh success"
  - "console.warn('[auth] Token refresh failed') — refresh failure triggers logout"
  - "console.debug('[auth] session synced after silent token refresh') — React state updated"
  - "console.debug('[dashboard] fetching data...') / '[dashboard] data loaded' — dashboard fetch lifecycle"
  - "console.debug('[properties] fetching list...') / '[properties] loaded' — property list lifecycle"
  - "console.debug('[property-detail] fetching id:') / '[property-detail] loaded' — detail lifecycle"
  - "console.debug('[notifications] fetching...') / '[notifications] loaded' — notification lifecycle"
  - "console.error('[component] fetch error') — all screen-level fetch failures"
  - "Expo Go network inspector — all API calls visible (GET /dashboard, /properties, /notifications)"
drill_down_paths:
  - .gsd/milestones/M003/slices/S04/tasks/T01-SUMMARY.md
  - .gsd/milestones/M003/slices/S04/tasks/T02-SUMMARY.md
  - .gsd/milestones/M003/slices/S04/tasks/T03-SUMMARY.md
  - .gsd/milestones/M003/slices/S04/tasks/T04-SUMMARY.md
duration: ~56min
verification_result: passed
completed_at: 2026-03-18
---

# S04: Mobil App Foundation

**Expo managed-workflow mobile app with SecureStore JWT auth, token refresh interceptor, 3-tab navigation (Dashboard/Properties/Notifications), and all foundation screens rendering real data from the production backend API**

## What Happened

Built the complete `gurkan-mobile/` Expo project from scratch, delivering a functional mobile application that authenticates against the existing ASP.NET Core backend and renders real portfolio data across four screens.

**T01 — Project scaffold + auth:** Created the Expo project (SDK 54, TypeScript, React 19) with `create-expo-app --template default`. Built `SessionProvider` with SecureStore-backed JWT storage, `useStorageState` hook for cross-platform encrypted storage, and `Stack.Protected` auth guards. The login screen authenticates via `POST /api/auth/login`, decodes JWT claims using ASP.NET Core's XML namespace keys (K010), and stores tokens in SecureStore. Design tokens (`theme.ts`) establish the terracotta accent (#c4653a) and DM Sans typography matching the web app.

**T02 — API client + token refresh:** Ported all TypeScript types from `gurkan-ui/src/types/index.ts` verbatim (all `const` objects, no enums — fully RN-compatible). Created the axios-based API client with async SecureStore interceptors (replacing the web's synchronous localStorage). The token refresh interceptor mirrors the web pattern: `refreshPromise` singleton deduplicates concurrent 401s, auth URLs are excluded to prevent infinite loops, and `_retried` flag prevents infinite retry. The `onTokenRefreshCallback` bridges the interceptor with React state — on successful refresh, the auth context updates silently; on failure, it clears the session (Stack.Protected handles redirect).

**T03 — Tab navigation + dashboard:** Built 3-tab bottom navigation (Dashboard, Mülkler, Bildirimler) with MaterialIcons and terracotta active state. The dashboard screen fetches `getDashboard()` and `getNotifications()` in parallel, rendering currency-grouped summary cards (income/expense/profit), a notification banner with severity breakdown, and a per-property financial list. Sign-out button with Turkish confirmation dialog placed in the dashboard header.

**T04 — Property screens + notifications:** Property list renders FlatList cards with type badges, currency badges (color-coded: TRY default, USD blue, EUR green), city, and group name. Property detail uses `useLocalSearchParams` for dynamic `[id]` routing, displaying all fields in organized sections (header, location, details, description, dates). Notifications screen shows severity-colored badges (Critical=red solid, Warning=amber solid, Info=blue solid with white text) and pressable property names that deep-link to property detail across tabs. All list screens support pull-to-refresh.

## Verification

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 1 | `npx tsc --noEmit` | ✅ pass | Zero TypeScript errors across all 12 source files |
| 2 | `npx expo export --platform android` | ✅ pass | 1074 modules bundled, 3.08 MB HBC output, exported to dist/ |
| 3 | No web-only APIs leaked | ✅ pass | `grep` for `localStorage`/`window.`/`document.`/`import.meta.env` — only Platform.OS-guarded fallback |
| 4 | Token refresh interceptor | ✅ pass | refreshPromise singleton (5 refs), auth URL exclusions (3 refs), _retried flag confirmed |
| 5 | Observability surfaces | ✅ pass | 27 console.debug/warn/error calls across auth, dashboard, properties, notifications |
| 6 | All S04 API functions exported | ✅ pass | login, refreshToken, getDashboard, getNotifications, getProperties, getProperty, getGroups |
| 7 | Manual E2E in Expo Go | ⏳ UAT | Requires human testing on device/emulator — UAT script provided |

## Requirements Advanced

- R017 — Foundation screens delivered: login, dashboard, property list, property detail, notifications. Remaining sub-pages (tenants, expenses, bills, documents) deferred to S05.
- R026 — Mobile token refresh interceptor implemented with same pattern as web (refreshPromise singleton, concurrent dedup, auth URL exclusion). Mobile-specific adaptation: async SecureStore instead of synchronous localStorage, callback-based state sync instead of storage events.

## Requirements Validated

- None fully validated by this slice alone. R017 requires S05 completion (all sub-pages). R026's mobile validation requires runtime testing with short TTL (manual UAT).

## New Requirements Surfaced

- None

## Requirements Invalidated or Re-scoped

- None

## Deviations

- **File paths:** The slice plan listed files under `src/app/` but T01's Expo Router scaffold placed routes under `app/` (no `src/` prefix). All tasks adapted to the actual structure. Non-route code (ctx.tsx, theme.ts, api/) lives under `src/`.
- **Expo SDK version:** Plan specified SDK 55, but `create-expo-app` installed SDK 54 (latest stable at execution time). No functional difference for S04 scope.
- **Notification badge styling:** T04 upgraded from T03's light-background tints to solid-color backgrounds with white text for better mobile readability — an improvement over the original plan.

## Known Limitations

- **No device testing:** All verification is static (TypeScript + bundle export). Expo Go runtime testing requires a physical device or emulator — covered in UAT script.
- **No offline support:** All screens require network connectivity. No caching or optimistic UI.
- **No search/filter on lists:** Property list and notification list show all items without filtering (web app has this too — consistent).
- **Groups not fetched for property list:** Group names on property cards come from the property API response, not a separate groups fetch. This works because the backend includes group info in property responses.

## Follow-ups

- S05 must add all remaining sub-pages: tenants, short-term rentals, expenses, bills, documents — these will consume the navigation structure, API client, and UI patterns established here.
- S06 will add push notification permission request and device token registration on login — it consumes the auth context and Expo project from this slice.
- Consider adding a search/filter bar on property list if the number of properties grows large.
- Focus management between email→password inputs on the login screen could be improved (minor UX).

## Files Created/Modified

- `gurkan-mobile/app.config.ts` — Expo config with name "Gürkan", slug, scheme, apiUrl, plugins
- `gurkan-mobile/src/ctx.tsx` — SessionProvider with SecureStore auth, JWT decode, useStorageState hook, refresh callback registration
- `gurkan-mobile/src/theme.ts` — Design tokens (colors, typography, spacing, borderRadius, shadows)
- `gurkan-mobile/src/api/client.ts` — Axios instance with SecureStore interceptors, token refresh singleton, all S04 API functions, S05 stubs
- `gurkan-mobile/src/api/types.ts` — All TypeScript types copied from web (const objects, RN-compatible)
- `gurkan-mobile/app/_layout.tsx` — Root layout with SessionProvider, DM Sans font loading, Stack.Protected auth guards
- `gurkan-mobile/app/sign-in.tsx` — Login screen with polished UI, Turkish error messages, KeyboardAvoidingView
- `gurkan-mobile/app/(tabs)/_layout.tsx` — 3-tab bottom navigation (Dashboard, Mülkler, Bildirimler) with theme styling
- `gurkan-mobile/app/(tabs)/index.tsx` — Dashboard with summary cards, notification banner, property list, sign-out
- `gurkan-mobile/app/(tabs)/notifications.tsx` — Notification list with severity badges and pressable property links
- `gurkan-mobile/app/(tabs)/properties/_layout.tsx` — Stack navigator for property list→detail navigation
- `gurkan-mobile/app/(tabs)/properties/index.tsx` — Property list with FlatList cards, badges, pull-to-refresh
- `gurkan-mobile/app/(tabs)/properties/[id].tsx` — Property detail with dynamic routing, all fields in sections

## Forward Intelligence

### What the next slice should know
- The Expo Router routes live under `gurkan-mobile/app/` (not `src/app/`). Non-route code (context, API, theme) lives under `gurkan-mobile/src/`.
- API client (`src/api/client.ts`) already has commented TODO stubs for all S05 endpoints — just uncomment and implement the function bodies.
- All TypeScript types are already ported in `src/api/types.ts` — S05 screens can import directly.
- The tab layout supports adding new tabs, but S05 sub-pages should be added as screens within property detail (not new tabs). Use `router.push` from the property detail screen to navigate to sub-page screens.
- The `theme.ts` exports all design tokens. Use `StyleSheet.create()` with theme constants — no inline styles.

### What's fragile
- **SecureStore async timing:** The token read in the request interceptor is async (`await getStorageItemAsync`). If SecureStore is slow on cold boot, the first API call might fire without a token. The session restore in `ctx.tsx` waits for SecureStore before setting `isLoading=false`, but edge cases with deep links could bypass this.
- **Cross-tab navigation:** Notification → property detail navigation uses `router.push('/(tabs)/properties/${id}')`. This hard-codes the route structure — if the properties tab path changes, these links break silently.

### Authoritative diagnostics
- `console.debug('[auth] ...')` messages in Expo Go dev tools console — the single best signal for auth flow debugging. Covers signIn, signOut, token restore, silent refresh, and refresh failure.
- `npx tsc --noEmit` in `gurkan-mobile/` — catches type mismatches between API responses and TypeScript types. Run after any API client changes.
- `npx expo export --platform android` — catches React Native-incompatible APIs (web-only modules, incorrect imports). Run after adding any new dependency.

### What assumptions changed
- **SDK version:** Plan assumed Expo SDK 55 but SDK 54 was the latest stable. No impact on S04 functionality.
- **Template contents:** The default Expo template already includes expo-secure-store and expo-font in the plugins array (K024) — no manual plugin registration needed.
- **Route structure:** Plan assumed `src/app/` but the actual Expo Router scaffold uses `app/` at the project root. All code adapted accordingly.
