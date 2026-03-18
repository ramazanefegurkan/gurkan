# S06 (Push Notifications) — Research

**Date:** 2026-03-18

## Summary

S06 wires Expo Push Notifications end-to-end: the mobile app requests permission and registers its push token with the backend, the backend stores device tokens and sends push notifications via the Expo Push API (`https://exp.host/--/api/v2/push/send`), and the mobile app handles foreground/background notifications.

The existing notification system (`NotificationsController.cs`) computes notifications at query time — late rent, upcoming bills, lease expiry, rent increases. S06 reuses this same logic on the backend to determine *what* to push, adds a `DeviceToken` entity for token storage, a `PushNotificationService` to call the Expo Push API, a `DeviceTokensController` for token registration/unregistration, and a `PushController` (or endpoint on existing controller) that triggers push sending. On the mobile side, `expo-notifications` and `expo-device` are needed for permission + token acquisition, and notification handlers for foreground display.

The Expo Push API is a simple HTTP POST accepting JSON — no authentication required by default (optional access token). The API returns push tickets and supports batch sending (up to 100 messages per request). Given the simplicity (single HTTP POST with `HttpClient`), hand-rolling the Expo Push API call is preferable to adding a community NuGet package (the available .NET SDKs have low downloads, questionable maintenance, and add unnecessary dependencies).

## Recommendation

**Direct `HttpClient` for Expo Push API** — the Expo Push API is a single POST endpoint with a simple JSON payload (`to`, `title`, `body`, `data`, `sound`, `priority`). A typed `PushNotificationService` with `IHttpClientFactory`-registered `HttpClient` is cleaner than pulling in a community package. This matches the project's pattern of minimal dependencies (D021: parsers as plain classes, not over-DI'd).

**Login-triggered push** — rather than a background cron job, push notifications are triggered when a user logs in or when a dedicated "send push" admin endpoint is called. This avoids the complexity of `IHostedService` timers for MVP while still delivering notifications. The `NotificationsController.Get()` logic can be extracted into a shared `NotificationComputeService` that both the query endpoint and the push sender call.

**EAS project ID required** — `getExpoPushTokenAsync` requires a `projectId` from EAS. The app needs to be linked to an EAS project. This is a prerequisite that must be handled during implementation (either `eas init` or manual project ID in `app.config.ts`).

## Implementation Landscape

### Key Files

**Backend — new:**
- `GurkanApi/Entities/DeviceToken.cs` — new entity: `Id`, `UserId`, `ExpoPushToken` (string), `Platform` (string: ios/android), `CreatedAt`. Unique constraint on `ExpoPushToken`.
- `GurkanApi/Data/ApplicationDbContext.cs` — add `DbSet<DeviceToken>`, configure in `OnModelCreating`
- `GurkanApi/Migrations/XXXXX_AddDeviceTokens.cs` — EF Core migration
- `GurkanApi/Controllers/DeviceTokensController.cs` — `POST /api/device-tokens` (register), `DELETE /api/device-tokens` (unregister by token value). Both [Authorize].
- `GurkanApi/Services/PushNotificationService.cs` — `IPushNotificationService` interface + implementation. Methods: `SendPushAsync(IEnumerable<string> tokens, string title, string body, object? data)`. Uses `IHttpClientFactory` to POST to `https://exp.host/--/api/v2/push/send`.
- `GurkanApi/Services/NotificationComputeService.cs` — extract the notification computation logic from `NotificationsController.Get()` into a reusable service. Both the GET endpoint and push trigger call this.
- `GurkanApi/Controllers/PushController.cs` — `POST /api/push/trigger` (admin/authenticated endpoint). Computes pending notifications for the user, looks up their device tokens, sends push via `PushNotificationService`.

**Backend — modified:**
- `GurkanApi/Program.cs` — register `IHttpClientFactory`, `IPushNotificationService`, `INotificationComputeService` in DI
- `GurkanApi/Controllers/NotificationsController.cs` — refactor to use `INotificationComputeService` instead of inline logic

**Mobile — new:**
- `gurkan-mobile/src/notifications.ts` — `registerForPushNotificationsAsync()` function: request permission, get Expo push token, register with backend via API. `setupNotificationHandlers()` for foreground display.

**Mobile — modified:**
- `gurkan-mobile/package.json` — add `expo-notifications`, `expo-device` dependencies
- `gurkan-mobile/app.config.ts` — add `expo-notifications` to plugins array (for Android channel config), add EAS project ID
- `gurkan-mobile/src/api/client.ts` — add `registerDeviceToken(token, platform)`, `unregisterDeviceToken(token)`, `triggerPush()` functions
- `gurkan-mobile/src/api/types.ts` — add `DeviceTokenRequest`, `PushTriggerResponse` types
- `gurkan-mobile/src/ctx.tsx` — call `registerForPushNotificationsAsync()` after successful sign-in (in the `signIn` function), call unregister on sign-out
- `gurkan-mobile/app/_layout.tsx` — setup notification handlers in `RootLayout` (foreground notification display, notification response handler for deep linking)

### Build Order

1. **Backend DeviceToken entity + migration + controller** — this is the foundation. Create entity, migration, register/unregister endpoints. Verify with curl/Swagger. This unblocks mobile token registration.

2. **Backend PushNotificationService + NotificationComputeService + PushController** — extract notification logic, build Expo Push API client, create trigger endpoint. Test with a mock token or real token from step 3.

3. **Mobile push permission + token registration** — install `expo-notifications` + `expo-device`, implement token acquisition, register on login, setup foreground notification handler. This is the integration point — proves end-to-end flow.

4. **Mobile notification handler + deep linking** — handle notification taps to navigate to relevant property detail screen. Polish: Android notification channel, notification sound.

### Verification Approach

- **Backend unit:** Integration test for `POST /api/device-tokens` (register, duplicate handling, unregister). Integration test for `NotificationComputeService` (extraced logic produces same results as current controller).
- **Backend push:** Manual test: register a real Expo push token, call `POST /api/push/trigger`, verify push ticket response from Expo API. Can also test with curl directly to `https://exp.host/--/api/v2/push/send`.
- **Mobile:** Expo Go on physical device — login → permission prompt → token registered in backend DB → trigger push → notification appears on device. This is UAT-class verification.
- **TypeScript:** `npx tsc --noEmit` in `gurkan-mobile/` — zero errors after all changes.
- **Bundle:** `npx expo export --platform android` — successful build with new dependencies.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Push token acquisition + permission | `expo-notifications` + `expo-device` | Official Expo SDK — handles iOS/Android permission differences, token format, project ID binding |
| Foreground notification display | `Notifications.setNotificationHandler()` | Built into expo-notifications — configures whether to show banner/sound/badge when app is foregrounded |

**Explicitly DO hand-roll:** Expo Push API HTTP calls. The community .NET SDKs (`Community.Expo.Server.SDK`, `Expo.Server.SDK`, `ExpoServerSdk`) all have low download counts (<20K), inconsistent maintenance, and some depend on `Newtonsoft.Json` (project uses `System.Text.Json`). The API is a single POST endpoint — a typed `HttpClient` service is ~50 lines.

## Constraints

- **EAS project ID required:** `getExpoPushTokenAsync()` requires a `projectId`. The app must be linked to an EAS project (`eas init` or manual ID in `app.config.ts`). Without this, token acquisition fails.
- **Physical device required:** Push notifications don't work on iOS Simulator or Android Emulator (no push token). Must test on a physical device via Expo Go.
- **Expo Push token format:** Tokens look like `ExponentPushToken[xxxx]`. Backend must validate this format on registration.
- **No background job for MVP:** The push trigger is manual (login-triggered or admin endpoint). A cron-based `IHostedService` that periodically checks and sends is a nice-to-have but adds complexity. Can be added later.
- **Existing notification logic is query-time:** `NotificationsController.Get()` computes notifications on every request (no DB persistence). The push trigger reuses this computation — it's idempotent but may re-send notifications the user has already seen. For MVP this is acceptable.

## Common Pitfalls

- **`getExpoPushTokenAsync` without projectId** — silently fails or throws. Must pass `projectId` from `Constants.expoConfig.extra.eas.projectId` or `Constants.easConfig.projectId`. If neither exists, throw a clear error.
- **Android notification channel required** — Android 8+ requires a notification channel. Must call `Notifications.setNotificationChannelAsync()` before notifications will display. Without it, notifications are silently dropped on Android.
- **SecureStore async in notification registration** — the push token registration happens after login. The access token may not yet be in SecureStore when the registration API call fires. Ensure the token is available in the request interceptor (it should be, since `signIn` stores it before calling register).
- **Duplicate device token registration** — user logs in on same device multiple times → same push token sent. Backend must upsert (ignore duplicate `ExpoPushToken`), not create duplicates.
- **Expo Push API 429/5xx** — the Expo Push API can rate-limit. `PushNotificationService` should log errors but not fail the trigger endpoint. Best-effort delivery.

## Open Risks

- **EAS project linking:** The app currently has no EAS config (`eas.json` not found). Running `eas init` requires an Expo account and creates a project ID. This is a manual step that must happen before push tokens can be acquired. The executor will need guidance on how to handle this (can hardcode a project ID in `app.config.ts` for now).
- **Re-notification spam:** Since notifications are computed at query time (not persisted), every push trigger re-computes and re-sends all active notifications. For MVP with a single user this is fine, but at scale this needs a "last pushed" timestamp per notification type per user to deduplicate.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Expo Push Notifications | `clix-so/skills@push-notification-best-practices` | available (69 installs) |
| Expo Mobile | `oimiragieo/agent-studio@expo-mobile-app-rule` | available (66 installs) |
| React Native | `travisjneuman/.claude@react-native` | available (32 installs) |

## Sources

- Expo Push API format: POST to `https://exp.host/--/api/v2/push/send` with JSON body containing `to`, `title`, `body`, `data`, `sound`, `priority` fields (source: [Expo Push Notifications docs](https://docs.expo.dev/push-notifications/sending-notifications/))
- Push tickets/receipts: API returns tickets with `status` + `id`; receipts checked via POST to `/getReceipts`; `DeviceNotRegistered` error means stop sending (source: [Expo Push docs](https://docs.expo.dev/push-notifications/sending-notifications/#push-receipts))
- `expo-notifications` API: `getExpoPushTokenAsync({projectId})`, `setNotificationHandler()`, `addNotificationReceivedListener()`, `addNotificationResponseReceivedListener()`, `setNotificationChannelAsync()` for Android (source: [Expo Notifications SDK](https://docs.expo.dev/versions/latest/sdk/notifications/))
- Expo Push rate limit: 600 notifications/second/project; batch up to 100 per request (source: [Expo Push errors docs](https://docs.expo.dev/push-notifications/sending-notifications/#request-errors))
