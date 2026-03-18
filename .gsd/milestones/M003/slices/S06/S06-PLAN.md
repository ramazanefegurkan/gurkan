# S06: Push Notifications

**Goal:** Expo Push Notifications ile kira gecikme, fatura yaklaşma, sözleşme bitiş bildirimleri mobil cihaza push olarak gönderilir. Backend'de device token kayıt, push gönderme servisi, ve tetikleme endpoint'i çalışır.
**Demo:** Login sonrası cihaz push token'ı backend'e kaydedilir. `POST /api/push/trigger` çağrıldığında mevcut notification logic (late rent, upcoming bill, lease expiry, rent increase) hesaplanır ve Expo Push API üzerinden telefona bildirim gönderilir.

## Must-Haves

- `DeviceToken` entity + EF migration — stores UserId, ExpoPushToken, Platform, CreatedAt with unique constraint on ExpoPushToken
- `DeviceTokensController` — POST /api/device-tokens (register/upsert) + DELETE /api/device-tokens (unregister by token value), both [Authorize]
- `INotificationComputeService` + implementation — extracted from NotificationsController.Get() so both query endpoint and push trigger share same logic
- `NotificationsController` refactored to use INotificationComputeService
- `IPushNotificationService` + implementation — sends push via Expo Push API (POST https://exp.host/--/api/v2/push/send) using IHttpClientFactory
- `PushController` — POST /api/push/trigger [Authorize] — computes notifications for user, looks up device tokens, sends push
- Mobile: `expo-notifications` + `expo-device` installed, push permission request, token acquisition, registration on login
- Mobile: notification handlers (foreground display + notification response listener) wired in root layout
- Mobile: unregister device token on sign-out

## Proof Level

- This slice proves: integration
- Real runtime required: yes (Expo Push API is external, device testing is UAT)
- Human/UAT required: yes (push notifications require physical device)

## Verification

- `cd GurkanApi.Tests && dotnet test --filter "DeviceTokenAndPushTests"` — integration tests for device token CRUD (register, duplicate upsert, unregister) and push trigger endpoint
- `cd GurkanApi.Tests && dotnet test --filter "DashboardAndNotificationTests"` — existing notification tests still pass after refactoring to INotificationComputeService
- `cd gurkan-mobile && npx tsc --noEmit` — zero TypeScript errors
- `cd gurkan-mobile && npx expo export --platform android` — successful bundle with expo-notifications dependency
- Manual UAT: login on physical device → push permission granted → token appears in DeviceTokens table → POST /api/push/trigger → notification arrives on device

## Observability / Diagnostics

- Runtime signals: `ILogger<PushNotificationService>` logs push attempts with token count, Expo API response status, ticket IDs; `ILogger<DeviceTokensController>` logs register/unregister operations with UserId
- Inspection surfaces: `DeviceTokens` DB table (query with `SELECT * FROM "DeviceTokens"`), Expo Push API ticket response in push trigger response body
- Failure visibility: PushNotificationService logs HTTP status and error body on Expo API failure; push trigger endpoint returns ticket results including any `DeviceNotRegistered` errors
- Redaction constraints: ExpoPushToken values are not secrets but should not be logged in full in production (truncate in logs)

## Integration Closure

- Upstream surfaces consumed: `gurkan-mobile/src/ctx.tsx` (auth context — signIn/signOut hooks), `gurkan-mobile/src/api/client.ts` (API client with auth interceptor), `gurkan-mobile/app/_layout.tsx` (root layout for notification handlers), `GurkanApi/Controllers/NotificationsController.cs` (notification computation logic to extract), `GurkanApi/Program.cs` (DI registration), `GurkanApi/Data/ApplicationDbContext.cs` (DbSet registration)
- New wiring introduced in this slice: IHttpClientFactory + IPushNotificationService + INotificationComputeService registered in DI (Program.cs); expo-notifications plugin in app.config.ts; notification handler setup in _layout.tsx; push token registration call in signIn flow (ctx.tsx)
- What remains before the milestone is truly usable end-to-end: nothing — S06 is the final slice in M003

## Tasks

- [x] **T01: Backend device token storage, push notification service, and trigger endpoint** `est:1h30m`
  - Why: Provides the entire backend infrastructure for push notifications — entity, migration, registration endpoints, notification computation extraction, Expo Push API integration, and trigger endpoint. This unblocks mobile token registration and push delivery.
  - Files: `GurkanApi/Entities/DeviceToken.cs`, `GurkanApi/Data/ApplicationDbContext.cs`, `GurkanApi/Controllers/DeviceTokensController.cs`, `GurkanApi/Services/INotificationComputeService.cs`, `GurkanApi/Services/NotificationComputeService.cs`, `GurkanApi/Controllers/NotificationsController.cs`, `GurkanApi/Services/IPushNotificationService.cs`, `GurkanApi/Services/PushNotificationService.cs`, `GurkanApi/Controllers/PushController.cs`, `GurkanApi/Program.cs`, `GurkanApi.Tests/IntegrationTests/DeviceTokenAndPushTests.cs`
  - Do: Create DeviceToken entity with unique constraint on ExpoPushToken. Add DbSet + OnModelCreating config. Generate EF migration. Create DeviceTokensController with register (upsert) and unregister endpoints. Extract NotificationsController.Get() logic into NotificationComputeService (both the controller and push trigger consume it). Create PushNotificationService using IHttpClientFactory to POST to Expo Push API. Create PushController with trigger endpoint. Register all services in Program.cs. Write integration tests for device token CRUD and push trigger. Update TRUNCATE in TestFixture to include DeviceTokens table.
  - Verify: `dotnet test --filter "DeviceTokenAndPushTests"` passes; `dotnet test --filter "DashboardAndNotificationTests"` still passes (refactor didn't break existing behavior); `dotnet build` clean
  - Done when: All new integration tests pass, existing notification tests pass, migration applies cleanly

- [x] **T02: Mobile push permission, token registration, and notification handlers** `est:1h`
  - Why: Completes the end-to-end push notification flow — mobile app requests permission, acquires Expo push token, registers with backend on login, unregisters on logout, and displays foreground notifications.
  - Files: `gurkan-mobile/package.json`, `gurkan-mobile/app.config.ts`, `gurkan-mobile/src/notifications.ts`, `gurkan-mobile/src/api/client.ts`, `gurkan-mobile/src/api/types.ts`, `gurkan-mobile/src/ctx.tsx`, `gurkan-mobile/app/_layout.tsx`
  - Do: Install expo-notifications + expo-device. Add expo-notifications to plugins in app.config.ts (with Android notification channel config). Add EAS projectId to app.config.ts extra (required for getExpoPushTokenAsync). Create src/notifications.ts with registerForPushNotificationsAsync() and setupNotificationHandlers(). Add registerDeviceToken/unregisterDeviceToken/triggerPush API functions to client.ts. Add DeviceTokenRequest/PushTriggerResponse types. Call registerForPushNotificationsAsync() after successful signIn in ctx.tsx. Call unregisterDeviceToken on signOut. Setup notification handlers in _layout.tsx RootLayout. Create Android notification channel for default notifications.
  - Verify: `npx tsc --noEmit` zero errors; `npx expo export --platform android` bundles successfully with new dependencies; grep confirms no web-only APIs leaked
  - Done when: TypeScript compiles clean, Android bundle exports successfully, push registration is wired into signIn/signOut, notification handlers are active in root layout

## Files Likely Touched

- `GurkanApi/Entities/DeviceToken.cs`
- `GurkanApi/Data/ApplicationDbContext.cs`
- `GurkanApi/Migrations/XXXXX_AddDeviceTokens.cs`
- `GurkanApi/Controllers/DeviceTokensController.cs`
- `GurkanApi/Services/INotificationComputeService.cs`
- `GurkanApi/Services/NotificationComputeService.cs`
- `GurkanApi/Controllers/NotificationsController.cs`
- `GurkanApi/Services/IPushNotificationService.cs`
- `GurkanApi/Services/PushNotificationService.cs`
- `GurkanApi/Controllers/PushController.cs`
- `GurkanApi/Program.cs`
- `GurkanApi.Tests/IntegrationTests/TestFixture.cs`
- `GurkanApi.Tests/IntegrationTests/DeviceTokenAndPushTests.cs`
- `gurkan-mobile/package.json`
- `gurkan-mobile/app.config.ts`
- `gurkan-mobile/src/notifications.ts`
- `gurkan-mobile/src/api/client.ts`
- `gurkan-mobile/src/api/types.ts`
- `gurkan-mobile/src/ctx.tsx`
- `gurkan-mobile/app/_layout.tsx`
