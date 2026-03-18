---
id: T01
parent: S04
milestone: M003
provides:
  - gurkan-mobile Expo project scaffold with managed workflow
  - SessionProvider with SecureStore-backed JWT auth (signIn/signOut/session/user)
  - useStorageState hook (SecureStore on native, localStorage on web)
  - JWT decode with ASP.NET Core XML namespace claim keys (K010)
  - Stack.Protected auth guard routing (sign-in vs tabs)
  - Login screen with real backend authentication
  - Design token system (colors, typography, spacing, borderRadius, shadows)
key_files:
  - gurkan-mobile/app.config.ts
  - gurkan-mobile/src/ctx.tsx
  - gurkan-mobile/src/theme.ts
  - gurkan-mobile/app/_layout.tsx
  - gurkan-mobile/app/sign-in.tsx
  - gurkan-mobile/app/(tabs)/_layout.tsx
  - gurkan-mobile/app/(tabs)/index.tsx
key_decisions:
  - Used expo-secure-store for native token storage with localStorage fallback for web
  - Used Stack.Protected pattern from Expo Router docs for auth guard routing
  - Kept signIn calling axios directly (not via API client module — T02 will create that)
  - DM Sans font loaded via @expo-google-fonts/dm-sans with useFonts hook
patterns_established:
  - useStorageState hook pattern for cross-platform encrypted storage
  - SessionProvider context with user info extracted from JWT claims
  - Theme tokens exported from src/theme.ts (colors, typography, spacing, borderRadius, shadows)
  - console.debug('[auth] ...') observability pattern for auth lifecycle events
observability_surfaces:
  - "console.debug('[auth] signIn attempt/success/signOut') — auth lifecycle"
  - "console.debug('[auth] session restored from SecureStore') — cold boot restore"
  - "console.warn('[auth] invalid token on restore') — token validation failure"
  - "console.error('[auth] SecureStore error') — storage layer errors"
duration: 12m
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T01: Scaffold Expo project with auth context and login screen

**Scaffolded gurkan-mobile/ Expo project with SecureStore-backed JWT auth, Stack.Protected guards, and polished login screen targeting production backend**

## What Happened

Created the `gurkan-mobile/` Expo managed-workflow project from scratch using `create-expo-app` with the default template (SDK 54, TypeScript, React 19). Installed all required dependencies: `expo-secure-store`, `axios`, `expo-constants`, `expo-font`, `@expo-google-fonts/dm-sans`.

Configured `app.config.ts` with app name "Gürkan", slug "gurkan-mobile", scheme "gurkan", and `extra.apiUrl` defaulting to `https://gurkan.efegurkan.com/api` (overridable via `EXPO_PUBLIC_API_URL`).

Built the session context (`src/ctx.tsx`) implementing:
- `useStorageState` hook using `expo-secure-store` on native and `localStorage` on web
- `setStorageItemAsync` helper exported for T02's API client interceptor
- `SessionProvider` with `signIn(email, password)` calling `POST /api/auth/login` via axios
- JWT decode handling ASP.NET Core XML namespace claim keys (`nameidentifier`, `emailaddress`, `role`)
- `UserInfo` extraction stored in context alongside session token
- Auth lifecycle observability via `console.debug('[auth] ...')` messages

Created root layout (`app/_layout.tsx`) wrapping the app in `SessionProvider`, loading DM Sans fonts, and using `Stack.Protected` guards to route authenticated users to `(tabs)` and unauthenticated to `sign-in`.

Built the login screen (`app/sign-in.tsx`) with polished design: centered card layout, email/password inputs with icons, terracotta accent button, loading spinner during API call, Turkish error messages for 401/400/network errors, password visibility toggle, and `KeyboardAvoidingView`.

Cleaned up all default template files (explore.tsx, modal.tsx, components/, hooks/, constants/, scripts/) leaving only the auth flow structure.

## Verification

- `npx tsc --noEmit` — zero TypeScript errors
- `npx expo export --platform android` — export succeeds, 1068 modules bundled, 3MB HBC output
- All 5 required dependencies confirmed in `package.json`
- File structure matches expected output: `app.config.ts`, `src/ctx.tsx`, `src/theme.ts`, `app/_layout.tsx`, `app/sign-in.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd gurkan-mobile && npx tsc --noEmit` | 0 | ✅ pass | 1.5s |
| 2 | `cd gurkan-mobile && npx expo export --platform android` | 0 | ✅ pass | 8.3s |

### Slice-level checks (partial — T01 is intermediate):
| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | `npx expo export --platform android` | ✅ pass | No web-only APIs |
| 2 | `npx tsc --noEmit` | ✅ pass | Zero errors |
| 3 | Manual: login → dashboard loads | ⏳ pending | Requires Expo Go on device |
| 4 | Manual: summary cards | ⏳ pending | T03 scope |
| 5 | Manual: bottom tabs | ⏳ pending | T03 scope |
| 6 | Manual: property list/detail | ⏳ pending | T04 scope |
| 7 | Manual: notifications | ⏳ pending | T04 scope |
| 8 | Manual: logout | ⏳ pending | Logout button exists, needs device test |
| 9 | Manual: token refresh | ⏳ pending | T02 scope |

## Diagnostics

- **Auth lifecycle:** All auth events logged via `console.debug('[auth] ...')` — visible in Expo Go dev tools console
- **Network:** `POST /api/auth/login` call visible in Expo Go network inspector
- **Session state:** React DevTools shows `SessionProvider` context value with session token, user info, and isLoading
- **Error shapes:** Login errors surface as Turkish user-facing messages; SecureStore errors logged to console.error

## Deviations

- Template came with `expo-secure-store` and `expo-font` already in plugins array — no manual plugin config needed.
- Used `process.env.EXPO_OS` pattern for web detection in `setStorageItemAsync` but `Platform.OS` in `useStorageState` hook (matching the Expo docs pattern exactly for the hook, using Platform for broader compatibility in the helper).

## Known Issues

- Manual device testing not performed (no Expo Go available in this environment). TypeScript and bundle export both pass, confirming the code is structurally sound.
- Password input `onSubmitEditing` triggers sign-in but there's no explicit focus management between email→password inputs (minor UX enhancement for later).

## Files Created/Modified

- `gurkan-mobile/app.config.ts` — Expo config with name, slug, scheme, apiUrl, plugins
- `gurkan-mobile/src/ctx.tsx` — Session context with SecureStore auth, JWT decode, useStorageState
- `gurkan-mobile/src/theme.ts` — Design tokens (colors, typography, spacing, borderRadius, shadows)
- `gurkan-mobile/app/_layout.tsx` — Root layout with SessionProvider, font loading, Stack.Protected guards
- `gurkan-mobile/app/sign-in.tsx` — Login screen with polished UI, error handling, KeyboardAvoidingView
- `gurkan-mobile/app/(tabs)/_layout.tsx` — Minimal tab layout with single Dashboard tab
- `gurkan-mobile/app/(tabs)/index.tsx` — Placeholder dashboard with welcome message and logout button
- `gurkan-mobile/package.json` — Dependencies (expo-secure-store, axios, expo-constants, expo-font, dm-sans)
- `gurkan-mobile/.gsd/milestones/M003/slices/S04/tasks/T01-PLAN.md` — Added Observability Impact section
