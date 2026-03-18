---
id: T01
parent: S06
milestone: M003
provides:
  - DeviceToken entity with unique ExpoPushToken constraint and EF migration
  - POST/DELETE /api/device-tokens endpoints for token registration/unregistration
  - INotificationComputeService extracted from NotificationsController
  - IPushNotificationService for Expo Push API integration via IHttpClientFactory
  - POST /api/push/trigger endpoint that computes and sends push notifications
  - Integration tests for device token CRUD and push trigger
key_files:
  - GurkanApi/Entities/DeviceToken.cs
  - GurkanApi/Controllers/DeviceTokensController.cs
  - GurkanApi/Services/INotificationComputeService.cs
  - GurkanApi/Services/NotificationComputeService.cs
  - GurkanApi/Services/IPushNotificationService.cs
  - GurkanApi/Services/PushNotificationService.cs
  - GurkanApi/Controllers/PushController.cs
  - GurkanApi.Tests/IntegrationTests/DeviceTokenAndPushTests.cs
key_decisions:
  - Extracted notification computation into INotificationComputeService to share logic between GET /api/notifications and POST /api/push/trigger
  - PushNotificationService uses IHttpClientFactory named client "ExpoPush" with best-effort delivery (no throw on failure)
  - Push trigger groups notifications by type to send consolidated messages instead of one push per notification
patterns_established:
  - Service extraction pattern: controller delegates to scoped service for shared business logic
  - Expo Push API integration via IHttpClientFactory named client with batch support
observability_surfaces:
  - ILogger<PushNotificationService> logs push attempts, Expo API response status, ticket counts, errors
  - ILogger<DeviceTokensController> logs register/unregister with truncated token
  - ILogger<NotificationComputeService> logs notification count per computation
  - Push trigger response body includes per-type ticket results and errors
duration: 15m
verification_result: passed
completed_at: 2026-03-18T22:51:00Z
blocker_discovered: false
---

# T01: Backend device token storage, push notification service, and trigger endpoint

**Added DeviceToken entity, device token registration endpoints, extracted NotificationComputeService, Expo Push API service, and push trigger endpoint with 7 passing integration tests**

## What Happened

Built the complete backend push notification infrastructure in 9 steps:

1. Created `DeviceToken` entity (Id, UserId, ExpoPushToken, Platform, CreatedAt) with FK to User.
2. Registered `DbSet<DeviceToken>` in ApplicationDbContext with unique index on ExpoPushToken, max lengths, and UTC default timestamp.
3. Generated EF migration `20260318224044_AddDeviceTokens` — creates table with unique index and cascade-delete FK.
4. Created `DeviceTokensController` with POST (register/upsert) and DELETE (unregister) endpoints. Register validates token format (ExponentPushToken[/ExpoPushToken[ prefix) and platform (ios/android). Upsert reassigns token to current user if already registered by another user.
5. Extracted the entire notification computation logic from `NotificationsController.Get()` into `NotificationComputeService` implementing `INotificationComputeService`. Logic is identical — late rent, upcoming/overdue bills, lease expiry, rent increases — just moved to a shared service.
6. Simplified `NotificationsController` to a thin wrapper that calls the compute service.
7. Created `PushNotificationService` implementing `IPushNotificationService` — posts to Expo Push API via IHttpClientFactory named client, batches tokens (100 per request), parses ticket responses, logs errors. Best-effort: catches all exceptions and HTTP failures, returns structured PushResult.
8. Created `PushController` with POST /api/push/trigger — computes notifications, groups by type, sends consolidated pushes per type. Returns structured results with ticket counts and errors.
9. Registered all services in Program.cs (scoped DI + HttpClient), updated TRUNCATE in TestFixture, wrote 7 integration tests.

## Verification

- `dotnet test --filter "DeviceTokenAndPushTests"` — 7/7 passed (register, upsert, invalid format, unregister, unregister 404, push trigger no tokens, push trigger with token)
- `dotnet test --filter "DashboardAndNotificationTests"` — 7/7 passed (refactor regression-safe)
- `dotnet build` — 0 errors, 0 warnings

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd GurkanApi.Tests && dotnet test --filter "DeviceTokenAndPushTests"` | 0 | ✅ pass | 5.8s |
| 2 | `cd GurkanApi.Tests && dotnet test --filter "DashboardAndNotificationTests"` | 0 | ✅ pass | 8.2s |
| 3 | `cd GurkanApi && dotnet build` | 0 | ✅ pass | 0.9s |
| 4 | `cd gurkan-mobile && npx tsc --noEmit` | — | ⏳ T02 scope | — |
| 5 | `cd gurkan-mobile && npx expo export --platform android` | — | ⏳ T02 scope | — |

## Diagnostics

- **DB inspection:** `SELECT * FROM "DeviceTokens"` shows registered tokens with UserId, Platform, CreatedAt
- **Push trigger response:** POST /api/push/trigger returns JSON with `message`, `results[]` containing per-type `notificationType`, `notificationCount`, `ticketCount`, `errors[]`
- **Logs:** PushNotificationService logs HTTP status and error body on Expo API failure; DeviceTokensController logs register/unregister with truncated token; NotificationComputeService logs computation count
- **Failure shapes:** Expo API non-2xx → logged as error, included in PushResult.Errors; DeviceNotRegistered → surfaced in ticket errors array; No tokens → 200 with "No device tokens registered" message

## Deviations

None — implementation followed the task plan exactly.

## Known Issues

None.

## Files Created/Modified

- `GurkanApi/Entities/DeviceToken.cs` — new entity with Id, UserId, ExpoPushToken, Platform, CreatedAt
- `GurkanApi/Data/ApplicationDbContext.cs` — added DbSet<DeviceToken> + OnModelCreating config
- `GurkanApi/Migrations/20260318224044_AddDeviceTokens.cs` — migration creating DeviceTokens table
- `GurkanApi/Migrations/20260318224044_AddDeviceTokens.Designer.cs` — migration designer
- `GurkanApi/Controllers/DeviceTokensController.cs` — POST/DELETE /api/device-tokens
- `GurkanApi/Services/INotificationComputeService.cs` — interface for notification computation
- `GurkanApi/Services/NotificationComputeService.cs` — extracted notification logic from controller
- `GurkanApi/Controllers/NotificationsController.cs` — simplified to delegate to service
- `GurkanApi/Services/IPushNotificationService.cs` — interface + PushResult DTO
- `GurkanApi/Services/PushNotificationService.cs` — Expo Push API client
- `GurkanApi/Controllers/PushController.cs` — POST /api/push/trigger
- `GurkanApi/Program.cs` — registered INotificationComputeService, IPushNotificationService, HttpClient "ExpoPush"
- `GurkanApi.Tests/IntegrationTests/TestFixture.cs` — added DeviceTokens to TRUNCATE
- `GurkanApi.Tests/IntegrationTests/DeviceTokenAndPushTests.cs` — 7 integration tests
