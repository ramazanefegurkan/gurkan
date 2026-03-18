---
id: S06
parent: M003
milestone: M003
provides:
  - DeviceToken entity with unique ExpoPushToken constraint + EF migration
  - POST/DELETE /api/device-tokens for push token registration/unregistration (upsert semantics)
  - INotificationComputeService extracted from NotificationsController — shared computation for in-app + push
  - IPushNotificationService with Expo Push API integration (IHttpClientFactory, batch 100, best-effort)
  - POST /api/push/trigger endpoint — computes notifications, groups by type, sends consolidated push
  - Mobile push permission request + Expo push token acquisition + backend registration on signIn
  - Mobile push token unregistration on signOut
  - Foreground notification display handler (banner + list + sound + badge)
  - Android notification channel "Bildirimler" with MAX importance
  - Notification tap routing to property detail screen
requires:
  - slice: S04
    provides: Expo project structure, auth context (signIn/signOut hooks), API client with auth interceptor
affects: []
key_files:
  - GurkanApi/Entities/DeviceToken.cs
  - GurkanApi/Data/ApplicationDbContext.cs
  - GurkanApi/Migrations/20260318224044_AddDeviceTokens.cs
  - GurkanApi/Controllers/DeviceTokensController.cs
  - GurkanApi/Services/INotificationComputeService.cs
  - GurkanApi/Services/NotificationComputeService.cs
  - GurkanApi/Controllers/NotificationsController.cs
  - GurkanApi/Services/IPushNotificationService.cs
  - GurkanApi/Services/PushNotificationService.cs
  - GurkanApi/Controllers/PushController.cs
  - GurkanApi/Program.cs
  - GurkanApi.Tests/IntegrationTests/DeviceTokenAndPushTests.cs
  - gurkan-mobile/src/notifications.ts
  - gurkan-mobile/src/ctx.tsx
  - gurkan-mobile/app/_layout.tsx
  - gurkan-mobile/src/api/client.ts
  - gurkan-mobile/src/api/types.ts
  - gurkan-mobile/app.config.ts
key_decisions:
  - Extracted notification computation into INotificationComputeService so both GET /api/notifications and POST /api/push/trigger share identical logic (D025)
  - On-demand push trigger (POST /api/push/trigger) with best-effort delivery — no background scheduler (D026)
  - PushNotificationService uses IHttpClientFactory named client "ExpoPush" with batch support (100 tokens per request)
  - Push trigger groups notifications by type to send consolidated messages
  - Push registration is fire-and-forget after signIn — errors never block auth flow
  - EAS projectId via EXPO_PUBLIC_EAS_PROJECT_ID env var (user must run eas init for production)
  - signOut changed from sync to async to await unregisterDeviceToken before clearing session
patterns_established:
  - Service extraction pattern — controller delegates to scoped service for shared business logic
  - Expo Push API integration via IHttpClientFactory named client with batch support
  - Fire-and-forget push registration in auth flow — catch errors, log, never block
  - Notification response listener placed inside navigation tree (RootNavigator) for router access
observability_surfaces:
  - ILogger<PushNotificationService> logs push attempts, Expo API response status, ticket counts, errors
  - ILogger<DeviceTokensController> logs register/unregister with truncated token and UserId
  - ILogger<NotificationComputeService> logs notification count per computation
  - Push trigger response body includes per-type ticket results and errors
  - Mobile [push] prefixed console logs for token registration, unregistration, errors, taps
  - DeviceTokens DB table queryable via SELECT * FROM "DeviceTokens"
drill_down_paths:
  - .gsd/milestones/M003/slices/S06/tasks/T01-SUMMARY.md
  - .gsd/milestones/M003/slices/S06/tasks/T02-SUMMARY.md
duration: 27m
verification_result: passed
completed_at: 2026-03-18T22:51:00Z
---

# S06: Push Notifications

**Backend device token storage + Expo Push API integration + on-demand trigger endpoint, with mobile push permission/registration wired into signIn/signOut and foreground notification handlers**

## What Happened

Built the complete push notification pipeline — backend infrastructure in T01, mobile integration in T02.

**T01 (Backend):** Created `DeviceToken` entity (UserId, ExpoPushToken, Platform, CreatedAt) with unique index on token and FK to User. Added EF migration. Built `DeviceTokensController` with register (POST, upsert semantics with token format validation) and unregister (DELETE by token value) endpoints. Extracted the entire notification computation logic from `NotificationsController.Get()` into `NotificationComputeService` — late rent, upcoming/overdue bills, lease expiry, rent increases — so both the in-app query endpoint and push trigger share identical logic. The original controller became a thin wrapper. Created `PushNotificationService` using IHttpClientFactory to POST to Expo Push API with batching (100 tokens per request), structured ticket/error parsing, and best-effort delivery (catches all failures, returns structured PushResult). Created `PushController` with POST /api/push/trigger that computes notifications, groups by type, and sends consolidated pushes. Wrote 7 integration tests covering register, upsert, invalid format rejection, unregister, unregister 404, push trigger with no tokens, and push trigger with registered token.

**T02 (Mobile):** Installed `expo-notifications` and `expo-device` (SDK 54 compatible). Configured the expo-notifications plugin in app.config.ts with Android notification icon/color and EAS projectId. Created `src/notifications.ts` with three functions: `registerForPushNotificationsAsync()` (physical device check → permission request → token acquisition), `setupNotificationChannel()` (Android "Bildirimler" channel with MAX importance), and `setupNotificationHandlers()` (foreground display with banner+list+sound+badge). Wired push registration into `ctx.tsx` signIn flow (fire-and-forget after successful login, errors caught and logged). Wired token unregistration into signOut (async, awaited before clearing session). Added notification response listener in `_layout.tsx` RootNavigator for tap-to-navigate to property detail.

## Verification

| # | Check | Result |
|---|-------|--------|
| 1 | `dotnet test --filter "DeviceTokenAndPushTests"` | ✅ 7/7 passed |
| 2 | `dotnet test --filter "DashboardAndNotificationTests"` | ✅ 7/7 passed (no regression) |
| 3 | `npx tsc --noEmit` | ✅ zero errors |
| 4 | `npx expo export --platform android` | ✅ 1235 modules, 3.5 MB HBC |
| 5 | Logger integration (PushNotificationService, DeviceTokensController, NotificationComputeService) | ✅ confirmed via grep |

## Requirements Advanced

- R019 — Fully implemented: backend device token storage, Expo Push API service, trigger endpoint, mobile push permission + registration + handlers. Moved to validated.
- R017 — Push notifications were the final missing piece. S04 (foundation) + S05 (all sub-pages) + S06 (push) complete the mobile app. Moved to validated.

## Requirements Validated

- R019 — Backend integration tests prove device token CRUD and push trigger flow. Mobile TypeScript compiles clean and Android bundle exports. Physical device UAT pending for end-to-end push delivery confirmation.
- R017 — All mobile features now build-verified across S04/S05/S06. The app covers login, dashboard, property list/detail, all sub-pages (tenants, short-term rentals, expenses, bills, documents, notifications), and push notifications.

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

- **NotificationBehavior API change (K027):** expo-notifications SDK 54 deprecated `shouldShowAlert`, requiring `shouldShowBanner` and `shouldShowList` instead. Both new properties added alongside shouldShowAlert for backward compatibility.
- **signOut made async:** Changed from `() => void` to `async () => Promise<void>` to properly await unregisterDeviceToken before clearing session. SessionContextType interface updated.

## Known Limitations

- **Physical device required:** Push notification delivery cannot be tested on simulator/emulator. Requires EAS build on physical device for full UAT.
- **EAS projectId placeholder:** app.config.ts uses `'your-eas-project-id'` fallback. User must run `eas init` and set `EXPO_PUBLIC_EAS_PROJECT_ID` for production push tokens.
- **No automatic scheduling:** Push notifications are sent only when POST /api/push/trigger is called — no background job or cron. Users must manually trigger or set up an external scheduler.
- **No push receipt checking:** The implementation sends push and parses ticket responses but does not poll Expo's receipt endpoint for final delivery confirmation.

## Follow-ups

- Add a scheduled background service (e.g., Hangfire, .NET HostedService) to call the push trigger on a daily/hourly basis
- Implement Expo Push receipt checking to detect and remove stale DeviceNotRegistered tokens
- Run `eas init` on the mobile project and set the EAS projectId for production builds
- Physical device UAT: login → push permission → token registration → trigger → notification delivery

## Files Created/Modified

- `GurkanApi/Entities/DeviceToken.cs` — new entity with Id, UserId, ExpoPushToken, Platform, CreatedAt
- `GurkanApi/Data/ApplicationDbContext.cs` — added DbSet<DeviceToken> + OnModelCreating config
- `GurkanApi/Migrations/20260318224044_AddDeviceTokens.cs` — migration creating DeviceTokens table
- `GurkanApi/Migrations/20260318224044_AddDeviceTokens.Designer.cs` — migration designer
- `GurkanApi/Controllers/DeviceTokensController.cs` — POST/DELETE /api/device-tokens
- `GurkanApi/Services/INotificationComputeService.cs` — interface for notification computation
- `GurkanApi/Services/NotificationComputeService.cs` — extracted notification logic from controller
- `GurkanApi/Controllers/NotificationsController.cs` — simplified to delegate to compute service
- `GurkanApi/Services/IPushNotificationService.cs` — interface + PushResult/PushTicket DTOs
- `GurkanApi/Services/PushNotificationService.cs` — Expo Push API client with batching
- `GurkanApi/Controllers/PushController.cs` — POST /api/push/trigger
- `GurkanApi/Program.cs` — registered INotificationComputeService, IPushNotificationService, HttpClient "ExpoPush"
- `GurkanApi.Tests/IntegrationTests/TestFixture.cs` — added DeviceTokens to TRUNCATE
- `GurkanApi.Tests/IntegrationTests/DeviceTokenAndPushTests.cs` — 7 integration tests
- `gurkan-mobile/package.json` — added expo-notifications ~0.32.16 and expo-device ~8.0.10
- `gurkan-mobile/app.config.ts` — added owner, expo-notifications plugin, eas.projectId
- `gurkan-mobile/src/notifications.ts` — push registration, channel setup, handler setup
- `gurkan-mobile/src/api/types.ts` — DeviceTokenRequest, PushTriggerResponse interfaces
- `gurkan-mobile/src/api/client.ts` — registerDeviceToken, unregisterDeviceToken, triggerPush functions
- `gurkan-mobile/src/ctx.tsx` — push registration in signIn, unregistration in signOut
- `gurkan-mobile/app/_layout.tsx` — notification handlers + tap routing in RootNavigator

## Forward Intelligence

### What the next slice should know
- S06 is the final slice of M003. The milestone is now complete. All 6 slices (S01–S06) delivered.
- The push notification pipeline is on-demand — there is no automatic scheduler. POST /api/push/trigger must be called externally or by the app user to generate pushes.
- NotificationComputeService is the single source of truth for all notification types. Any new notification type must be added there to appear in both in-app and push.

### What's fragile
- EAS projectId configuration — `getExpoPushTokenAsync()` requires a valid projectId in production EAS builds. The fallback placeholder will cause token acquisition to fail in release builds.
- Expo Push API is external — no retry logic or circuit breaker. If Expo's service is down, pushes are silently lost (logged but not retried).
- signOut async change — any callers of `signOut()` that don't await it could miss the unregister call. Currently only called from SessionProvider which handles it correctly.

### Authoritative diagnostics
- `DeviceTokenAndPushTests` (7 tests) — proves device token CRUD and push trigger backend flow. Run with `dotnet test --filter "DeviceTokenAndPushTests"`.
- `DashboardAndNotificationTests` (7 tests) — proves the NotificationComputeService extraction didn't break existing notification logic. Run with `dotnet test --filter "DashboardAndNotificationTests"`.
- `SELECT * FROM "DeviceTokens"` — shows all registered push tokens per user.
- POST /api/push/trigger response body — structured JSON with per-notification-type ticket counts and errors.

### What assumptions changed
- D013 assumed notifications would stay query-time only. S06 preserved query-time computation but added a push delivery layer on top via INotificationComputeService extraction. No persisted notification state was needed.
- expo-notifications SDK 54 changed NotificationBehavior API (K027) — shouldShowAlert deprecated, shouldShowBanner/shouldShowList required. Plan didn't anticipate this but the fix was straightforward.
