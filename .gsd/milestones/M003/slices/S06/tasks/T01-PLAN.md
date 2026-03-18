---
estimated_steps: 9
estimated_files: 11
---

# T01: Backend device token storage, push notification service, and trigger endpoint

**Slice:** S06 — Push Notifications
**Milestone:** M003

## Description

Build the complete backend infrastructure for Expo Push Notifications: DeviceToken entity with EF migration, device token registration/unregistration endpoints, extract notification computation into a shared service (so both the existing GET endpoint and the push trigger use the same logic), create PushNotificationService to call the Expo Push API via IHttpClientFactory, and a PushController trigger endpoint. Integration tests cover device token CRUD and push trigger.

**Relevant skills:** None specific — standard ASP.NET Core controller/service/entity pattern.

## Steps

1. **Create DeviceToken entity** — `GurkanApi/Entities/DeviceToken.cs` with properties: `Id` (Guid), `UserId` (Guid), `ExpoPushToken` (string), `Platform` (string: "ios"/"android"), `CreatedAt` (DateTime). Add navigation property to User (optional — only if needed for queries). No enum for Platform — just a plain string since it's only "ios" or "android".

2. **Register DeviceToken in ApplicationDbContext** — Add `DbSet<DeviceToken> DeviceTokens` to `ApplicationDbContext.cs`. Add `OnModelCreating` configuration: HasKey, HasIndex on ExpoPushToken (unique), string max lengths (ExpoPushToken: 200, Platform: 20), CreatedAt default `now() at time zone 'utc'`. Foreign key to User with cascade delete.

3. **Generate EF Core migration** — Run `dotnet ef migrations add AddDeviceTokens --project GurkanApi`. Verify the migration creates the DeviceTokens table with the unique index. Do NOT run `dotnet ef database update` — the test fixture and Program.cs handle migration application.

4. **Create DeviceTokensController** — `GurkanApi/Controllers/DeviceTokensController.cs`:
   - `POST /api/device-tokens` [Authorize] — accepts `{ expoPushToken: string, platform: string }`. Validates token starts with "ExponentPushToken[" or "ExpoPushToken[". Upserts: if token already exists for this user, update CreatedAt; if token exists for different user, reassign to current user. Returns 200 with the token record.
   - `DELETE /api/device-tokens` [Authorize] — accepts `{ expoPushToken: string }` in body. Deletes the matching token for this user. Returns 204. Returns 404 if not found.
   - Use `User.GetUserId()` from ClaimsPrincipalExtensions. Inject `ApplicationDbContext` and `ILogger`.

5. **Extract NotificationComputeService** — Create `GurkanApi/Services/INotificationComputeService.cs` with `Task<List<NotificationItem>> ComputeNotificationsAsync(Guid userId, string role)`. Create `GurkanApi/Services/NotificationComputeService.cs` — move the entire notification computation logic from `NotificationsController.Get()` into this service. The service takes `ApplicationDbContext`, `IGroupAccessService`, `ILogger<NotificationComputeService>` via DI. The method signature accepts userId and role (as string, or better, accept a ClaimsPrincipal or just the userId + a bool isSuperAdmin to simplify). Actually, accept `Guid userId` and `UserRole role` — the controller already extracts these. The logic is identical to the current controller — late rent, upcoming/overdue bills, lease expiry, rent increases — just moved into the service.

6. **Refactor NotificationsController to use service** — Replace the inline computation in `NotificationsController.Get()` with a call to `_notificationComputeService.ComputeNotificationsAsync(userId, role)`. The controller becomes thin: extract userId + role, call service, return Ok(result). Inject `INotificationComputeService` instead of `ApplicationDbContext` and `IGroupAccessService`.

7. **Create PushNotificationService** — `GurkanApi/Services/IPushNotificationService.cs` with `Task<PushResult> SendPushAsync(IEnumerable<string> tokens, string title, string body, object? data = null)`. `GurkanApi/Services/PushNotificationService.cs`:
   - Inject `IHttpClientFactory` (named client "ExpoPush"), `ILogger<PushNotificationService>`.
   - `SendPushAsync` builds a JSON array of message objects `[{ "to": token, "title": title, "body": body, "sound": "default", "data": data }]` for each token.
   - POST to `https://exp.host/--/api/v2/push/send` with Content-Type application/json.
   - Parse the response for push tickets. Return a `PushResult` with `TicketCount`, `Errors` list.
   - Log the HTTP status, ticket count, and any errors. On HTTP failure (non-2xx), log error and return empty result — don't throw. Best-effort delivery.
   - Batch tokens (Expo allows up to 100 per request). For MVP with single user, a single batch is fine.
   - Use `System.Text.Json` for serialization (not Newtonsoft).

8. **Create PushController** — `GurkanApi/Controllers/PushController.cs`:
   - `POST /api/push/trigger` [Authorize] — computes notifications for the current user via INotificationComputeService, looks up the user's device tokens from DB, groups notifications by type and sends a push for each via IPushNotificationService. Returns the list of push tickets/results.
   - Notifications are grouped to avoid sending 20 separate pushes. E.g., if there are 3 late rents, send 1 push with title "3 gecikmiş kira ödemesi" and body listing them. For each notification type, send one consolidated push.
   - If the user has no device tokens, return 200 with a message "No device tokens registered".
   - If there are no pending notifications, return 200 with a message "No notifications to push".

9. **Register services in Program.cs and write integration tests**:
   - In `Program.cs`: Register `INotificationComputeService` as scoped, `IPushNotificationService` as scoped, and add `builder.Services.AddHttpClient("ExpoPush")` with the base address `https://exp.host/--/api/v2/push/`.
   - Update `TestFixture.cs`: Add `"DeviceTokens"` to the TRUNCATE statement.
   - Create `GurkanApi.Tests/IntegrationTests/DeviceTokenAndPushTests.cs`:
     - Test: Register device token → returns 200, token stored in DB
     - Test: Register same token twice → upsert, only 1 record
     - Test: Unregister token → returns 204, token removed from DB
     - Test: Unregister non-existent → returns 404
     - Test: Push trigger with no tokens → returns 200 with "no tokens" message
     - Test: Push trigger with registered token → returns 200 (actual push sending to Expo API may fail with fake token, but the endpoint should not throw; assert response structure)
   - Run all existing tests to verify no regressions.

## Must-Haves

- [ ] DeviceToken entity with unique constraint on ExpoPushToken, stored in DB via migration
- [ ] POST /api/device-tokens registers token (upsert behavior for duplicate tokens)
- [ ] DELETE /api/device-tokens removes token
- [ ] NotificationComputeService extracts existing notification logic; NotificationsController delegates to it
- [ ] PushNotificationService calls Expo Push API via HttpClient (best-effort, no throw on failure)
- [ ] POST /api/push/trigger computes notifications and sends push to user's registered devices
- [ ] Integration tests pass for device token CRUD + push trigger
- [ ] Existing DashboardAndNotificationTests still pass after refactoring

## Verification

- `cd GurkanApi.Tests && dotnet test --filter "DeviceTokenAndPushTests"` — all pass
- `cd GurkanApi.Tests && dotnet test --filter "DashboardAndNotificationTests"` — still all pass (refactor safe)
- `cd GurkanApi && dotnet build` — no warnings or errors
- The migration is generated and applies cleanly (verified by test fixture)

## Observability Impact

- Signals added: `ILogger<PushNotificationService>` — logs push attempt (token count), Expo API response status, ticket results, errors. `ILogger<DeviceTokensController>` — logs register/unregister with UserId. `ILogger<NotificationComputeService>` — logs notification count (moved from controller).
- How a future agent inspects this: Query `SELECT * FROM "DeviceTokens"` to see registered tokens. Check push trigger response body for ticket results. Check application logs for push delivery errors.
- Failure state exposed: PushNotificationService logs non-2xx Expo API responses with body. DeviceNotRegistered errors from Expo are surfaced in the trigger response. NotificationComputeService logs computation errors.

## Inputs

- `GurkanApi/Controllers/NotificationsController.cs` — contains the notification computation logic to extract (the entire Get() method body)
- `GurkanApi/DTOs/Notifications/NotificationResponse.cs` — existing NotificationItem DTO (reused by both query and push)
- `GurkanApi/Data/ApplicationDbContext.cs` — needs DbSet + OnModelCreating additions
- `GurkanApi/Program.cs` — needs DI registrations for new services + IHttpClientFactory
- `GurkanApi/Extensions/ClaimsPrincipalExtensions.cs` — `GetUserId()` and `GetRole()` used in controllers
- `GurkanApi.Tests/IntegrationTests/TestFixture.cs` — TRUNCATE list needs DeviceTokens added
- `GurkanApi.Tests/IntegrationTests/DashboardAndNotificationTests.cs` — existing tests that must not break (these test the notification computation via the GET /api/notifications endpoint)

**Key patterns from codebase:**
- Controllers use `[ApiController]`, `[Route("api/[controller]")]`, `[Authorize]`
- User ID extracted via `User.GetUserId()` extension method
- DB entities use `Guid` primary keys
- All DateTime defaults use `now() at time zone 'utc'`
- JSON serialization uses `System.Text.Json` with `JsonStringEnumConverter` + camelCase
- Integration tests use `CustomWebApplicationFactory`, `IAsyncLifetime`, login helper from `HttpClientExtensions`
- Enums stored as strings with `.HasConversion<string>()` in OnModelCreating
- Test TRUNCATE order matters — FK constraints require child tables first

## Expected Output

- `GurkanApi/Entities/DeviceToken.cs` — new entity
- `GurkanApi/Data/ApplicationDbContext.cs` — modified with DbSet + OnModelCreating config for DeviceToken
- `GurkanApi/Migrations/XXXXXXXXXX_AddDeviceTokens.cs` — new EF migration
- `GurkanApi/Controllers/DeviceTokensController.cs` — new controller with register/unregister
- `GurkanApi/Services/INotificationComputeService.cs` — new interface
- `GurkanApi/Services/NotificationComputeService.cs` — extracted notification logic
- `GurkanApi/Controllers/NotificationsController.cs` — simplified to delegate to service
- `GurkanApi/Services/IPushNotificationService.cs` — new interface
- `GurkanApi/Services/PushNotificationService.cs` — Expo Push API client
- `GurkanApi/Controllers/PushController.cs` — trigger endpoint
- `GurkanApi/Program.cs` — DI registrations added
- `GurkanApi.Tests/IntegrationTests/TestFixture.cs` — TRUNCATE updated
- `GurkanApi.Tests/IntegrationTests/DeviceTokenAndPushTests.cs` — new integration tests
