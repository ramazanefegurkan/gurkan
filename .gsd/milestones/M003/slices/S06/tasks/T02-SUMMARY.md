---
id: T02
parent: S06
milestone: M003
provides:
  - expo-notifications and expo-device installed with SDK 54 compatible versions
  - Push permission request, token acquisition, and backend registration on signIn
  - Push token unregistration on signOut
  - Foreground notification display handler (alert + sound + badge)
  - Android notification channel "Bildirimler" with MAX importance
  - Notification tap routing to property detail screen
  - API client functions for registerDeviceToken, unregisterDeviceToken, triggerPush
key_files:
  - gurkan-mobile/src/notifications.ts
  - gurkan-mobile/src/ctx.tsx
  - gurkan-mobile/app/_layout.tsx
  - gurkan-mobile/src/api/client.ts
  - gurkan-mobile/src/api/types.ts
  - gurkan-mobile/app.config.ts
key_decisions:
  - EAS projectId configured via EXPO_PUBLIC_EAS_PROJECT_ID env var with placeholder fallback — user must run `eas init` and set the env var for production push tokens
  - signOut changed from sync to async to support await on unregisterDeviceToken call before clearing session
  - NotificationBehavior includes shouldShowBanner + shouldShowList (required by expo-notifications SDK 54, shouldShowAlert is deprecated)
patterns_established:
  - Push registration is fire-and-forget after signIn — errors caught and logged, never block auth flow
  - Notification response listener lives in RootNavigator (inside navigation tree) to have router access
observability_surfaces:
  - "[push] token registered: ExponentPushToken[...]" logged on successful signIn + push registration
  - "[push] token unregistered" logged on signOut
  - "[push] must use physical device" logged when running on simulator
  - "[push] permission not granted" logged when user denies permission
  - "[push] notification handler configured" logged on app mount
  - "[push] Android notification channel created" logged on Android app mount
  - "[push] notification tapped, navigating to property: {id}" logged on notification tap
duration: 12m
verification_result: passed
completed_at: 2026-03-18T22:51:00Z
blocker_discovered: false
---

# T02: Mobile push permission, token registration, and notification handlers

**Installed expo-notifications/expo-device, wired push permission + token registration into signIn/signOut, configured foreground notification display and Android channel, added notification tap routing to property detail**

## What Happened

Completed the mobile side of push notifications in 6 implementation steps:

1. **Installed dependencies** — `expo-notifications ~0.32.16` and `expo-device ~8.0.10` via `npx expo install` (SDK 54 compatible).

2. **Updated app.config.ts** — Added `owner: 'efegurkan'`, `expo-notifications` plugin with icon + accent color, and `eas.projectId` under `extra` with `EXPO_PUBLIC_EAS_PROJECT_ID` env var fallback.

3. **Added API types and functions** — `DeviceTokenRequest` and `PushTriggerResponse` types in `types.ts`. Three new API functions in `client.ts`: `registerDeviceToken` (POST), `unregisterDeviceToken` (DELETE with body), `triggerPush` (POST).

4. **Created notifications module** — `src/notifications.ts` with three exports:
   - `registerForPushNotificationsAsync()` — checks for physical device, requests permission, acquires Expo push token. Returns null on simulator/emulator or permission denial.
   - `setupNotificationChannel()` — creates "Bildirimler" Android channel with MAX importance.
   - `setupNotificationHandlers()` — configures foreground notification display (banner, list, sound, badge).

5. **Wired registration into auth context** — In `ctx.tsx`, signIn calls `registerForPushNotificationsAsync()` then `registerDeviceToken()` after successful login. signOut calls `unregisterDeviceToken()` before clearing session. Push token stored in `useRef` for signOut access. Both paths wrapped in try-catch — push errors never block auth.

6. **Setup handlers in root layout** — `_layout.tsx` calls `setupNotificationHandlers()` and `setupNotificationChannel()` on mount in RootLayout. Notification response listener in RootNavigator navigates to `/(tabs)/properties/${propertyId}` on tap.

## Verification

- `npx tsc --noEmit` — zero TypeScript errors
- `npx expo export --platform android` — successful bundle (1235 modules, 3.5 MB HBC)
- `grep -r "localStorage"` — all usages inside `Platform.OS === 'web'` guards
- `dotnet test --filter "DeviceTokenAndPushTests"` — 7/7 passed (backend endpoints ready)
- `dotnet test --filter "DashboardAndNotificationTests"` — 7/7 passed (no regression)
- Manual UAT on physical device required: login → permission prompt → token registered → push trigger → notification arrives

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd gurkan-mobile && npx tsc --noEmit` | 0 | ✅ pass | 3s |
| 2 | `cd gurkan-mobile && npx expo export --platform android` | 0 | ✅ pass | 5s |
| 3 | `grep -r "localStorage" gurkan-mobile/src/` | 0 | ✅ pass (all guarded) | <1s |
| 4 | `cd GurkanApi.Tests && dotnet test --filter "DeviceTokenAndPushTests"` | 0 | ✅ pass (7/7) | 4s |
| 5 | `cd GurkanApi.Tests && dotnet test --filter "DashboardAndNotificationTests"` | 0 | ✅ pass (7/7) | 5s |
| 6 | Manual UAT on physical device | — | ⏳ requires physical device | — |

## Diagnostics

- **Console signals:** All push operations log with `[push]` prefix — token registration, unregistration, permission denial, simulator detection, errors, notification taps
- **Backend verification:** `SELECT * FROM "DeviceTokens"` shows registered tokens after login on physical device
- **Notification channel:** Android system notification settings for the app should show "Bildirimler" channel
- **Failure shapes:** Push errors are caught and logged with `console.warn('[push] ...')` — never block auth flow. On simulator, `registerForPushNotificationsAsync()` returns null silently.
- **EAS setup required:** For production push tokens, user must run `eas init` and set `EXPO_PUBLIC_EAS_PROJECT_ID` environment variable

## Deviations

- **NotificationBehavior API change:** The plan specified `shouldShowAlert` only, but expo-notifications SDK 54 requires `shouldShowBanner` and `shouldShowList` (shouldShowAlert is deprecated). Added both new required properties.
- **signOut made async:** Changed from sync `() => void` to `async () => Promise<void>` to properly await `unregisterDeviceToken()` before clearing session. Updated `SessionContextType` interface accordingly.

## Known Issues

- **EAS projectId placeholder:** The `eas.projectId` in app.config.ts uses `'your-eas-project-id'` as fallback. User must run `eas init` and set `EXPO_PUBLIC_EAS_PROJECT_ID` for push tokens to work in production builds. In Expo Go / development builds, token acquisition may still work without this.
- **Physical device required:** Push notification flow cannot be verified on simulator/emulator — requires physical device UAT.

## Files Created/Modified

- `gurkan-mobile/package.json` — added expo-notifications ~0.32.16 and expo-device ~8.0.10 dependencies
- `gurkan-mobile/app.config.ts` — added owner, expo-notifications plugin, eas.projectId in extra
- `gurkan-mobile/src/notifications.ts` — new module with registerForPushNotificationsAsync, setupNotificationChannel, setupNotificationHandlers
- `gurkan-mobile/src/api/types.ts` — added DeviceTokenRequest and PushTriggerResponse interfaces
- `gurkan-mobile/src/api/client.ts` — added registerDeviceToken, unregisterDeviceToken, triggerPush API functions
- `gurkan-mobile/src/ctx.tsx` — wired push registration into signIn, unregistration into signOut, added pushTokenRef
- `gurkan-mobile/app/_layout.tsx` — added notification handler setup on mount, notification tap routing in RootNavigator
