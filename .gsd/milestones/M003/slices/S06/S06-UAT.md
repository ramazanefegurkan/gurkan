# S06: Push Notifications — UAT

**Milestone:** M003
**Written:** 2026-03-18

## UAT Type

- UAT mode: mixed (artifact-driven for backend + build verification, live-runtime for push delivery on physical device)
- Why this mode is sufficient: Backend endpoints are fully tested via 14 integration tests (7 DeviceTokenAndPush + 7 DashboardAndNotification). Mobile TypeScript and bundle export verify code correctness. But actual push delivery requires a physical device with Expo push token — no way to simulate this in CI.

## Preconditions

- Backend running (local Docker or production VPS): `docker compose -f docker-compose.prod.yml up -d` or `cd GurkanApi && dotnet run`
- PostgreSQL accessible with migrations applied (DeviceTokens table exists)
- Mobile app built via EAS: `eas build --platform android --profile preview` (or iOS equivalent)
- EAS project initialized: `eas init` run, `EXPO_PUBLIC_EAS_PROJECT_ID` set in environment
- Physical Android or iOS device with the built app installed
- A user account exists with at least one property that has: an active tenant with overdue rent, an upcoming bill within 7 days, and/or a lease expiring within 90 days

## Smoke Test

Login on the physical device → grant push notification permission → check backend DB (`SELECT * FROM "DeviceTokens"`) for a row matching the logged-in user → POST /api/push/trigger via curl or API client → notification appears on the device.

## Test Cases

### 1. Push Permission Request on First Login

1. Install the app fresh on a physical device (or clear app data).
2. Launch the app and log in with valid credentials.
3. The OS push permission dialog should appear (Android: automatic, iOS: explicit dialog).
4. Grant permission.
5. **Expected:** Console log `[push] token registered: ExponentPushToken[...]`. Backend DB `SELECT * FROM "DeviceTokens" WHERE "UserId" = '<user-id>'` returns one row with Platform matching the device OS.

### 2. Device Token Registration (Upsert)

1. Login on the same device with the same account.
2. **Expected:** The DeviceTokens table still has exactly one row for this user (upsert, not duplicate). The ExpoPushToken value and CreatedAt may be updated.

### 3. Device Token Upsert Across Users

1. Login as User A on the device → token registered for User A.
2. Sign out → sign in as User B on the same device.
3. **Expected:** The DeviceTokens row for this push token now has User B's UserId. User A no longer has this token.

### 4. Push Trigger with Notifications

1. Ensure the logged-in user has properties with at least one late rent payment (DueDate + 5 days passed, not paid).
2. Send: `POST /api/push/trigger` with the user's auth token (via curl, Postman, or the app's trigger mechanism).
3. **Expected:** Response JSON includes `results` array with at least one entry for `"notificationType": "LateRent"`, `ticketCount >= 1`, and no errors. A push notification arrives on the device with title "Gecikmiş Kira" (or equivalent) and body containing the property name.

### 5. Push Trigger with No Notifications

1. Ensure the logged-in user's properties have no overdue rent, no upcoming bills within 7 days, no expiring leases.
2. Send: `POST /api/push/trigger`.
3. **Expected:** Response JSON message says "No notifications to send" or results array is empty. No push notification arrives on the device.

### 6. Push Trigger with No Device Tokens

1. Sign out from the device (which unregisters the token).
2. Call `POST /api/push/trigger` using the same user's auth token (e.g., via curl with a valid JWT).
3. **Expected:** Response 200 with message "No device tokens registered for this user". No push sent.

### 7. Foreground Notification Display

1. Keep the app in the foreground (any screen).
2. From another client (curl/Postman), call `POST /api/push/trigger` for the same user.
3. **Expected:** A notification banner appears at the top of the screen while the app is in the foreground. Sound plays. Badge count may update.

### 8. Notification Tap Navigation

1. Receive a push notification (app in background or closed).
2. Tap the notification in the system notification tray.
3. **Expected:** The app opens and navigates to the property detail screen for the property mentioned in the notification. Console log: `[push] notification tapped, navigating to property: <propertyId>`.

### 9. Sign-Out Unregisters Token

1. While logged in on the device, verify the DeviceTokens table has a row for this user.
2. Sign out from the app.
3. **Expected:** The DeviceTokens table no longer has a row with this user's push token. Console log: `[push] token unregistered`.

### 10. Notification Types Coverage

1. Set up test data: one property with late rent (overdue > 5 days), one with a bill due within 7 days, one with lease expiring within 30 days, one with rent increase within 30 days.
2. Call `POST /api/push/trigger`.
3. **Expected:** Response includes results for multiple notification types: LateRent, UpcomingBill (or OverdueBill), LeaseExpiry, RentIncreaseApproaching. Device receives consolidated push messages (one per type, not one per notification).

### 11. Android Notification Channel

1. On Android, go to System Settings → Apps → [App Name] → Notifications.
2. **Expected:** A channel named "Bildirimler" exists with importance set to High/Max.

## Edge Cases

### Simulator/Emulator Push Request

1. Run the app on a simulator/emulator and log in.
2. **Expected:** No crash. Console log: `[push] must use physical device`. No push token registered. App functions normally without push.

### Permission Denied

1. On a physical device, deny the push permission when prompted (or revoke it in settings).
2. Login again.
3. **Expected:** Console log: `[push] permission not granted`. No token registered. Auth flow completes successfully — login is not blocked.

### Invalid Push Token Format via API

1. Call `POST /api/device-tokens` with body `{ "token": "invalid-token", "platform": "android" }`.
2. **Expected:** 400 Bad Request with message about invalid Expo push token format (must start with `ExponentPushToken[` or `ExpoPushToken[`).

### Network Failure During Push Registration

1. Login on the device with backend unreachable (e.g., airplane mode after JWT cached).
2. **Expected:** Push registration fails silently. Console warns `[push] ...` error. Auth flow completes — user is logged in and can use the app. Push will re-register on next login.

## Failure Signals

- Login succeeds but no row appears in DeviceTokens table → push registration failed silently (check mobile logs for `[push]` prefix)
- POST /api/push/trigger returns 200 but no notification arrives → check Expo Push API response for DeviceNotRegistered errors or invalid token
- App crashes on login → signIn async/push registration may have thrown unhandled error (should be caught)
- Foreground notification not showing → setupNotificationHandlers() may not have been called (check `[push] notification handler configured` log)
- Notification tap doesn't navigate → RootNavigator notification response listener may not have router context

## Requirements Proved By This UAT

- R019 — End-to-end push notification: device token registration, backend trigger computation, Expo Push API delivery, device notification receipt
- R017 — Push notifications complete the mobile app feature set (all screens + push)
- R012 — In-app notification logic preserved after extraction to NotificationComputeService (regression tested)

## Not Proven By This UAT

- Automatic/scheduled push delivery — trigger is manual only
- Push receipt verification — Expo Push receipts are not polled
- Multi-device push — testing with multiple devices registered to the same user
- iOS-specific push behavior — requires separate iOS build and device
- Production VPS push delivery — requires deployed backend with real domain

## Notes for Tester

- You **must** use a physical device — simulators cannot receive push notifications.
- Run `eas init` and set `EXPO_PUBLIC_EAS_PROJECT_ID` before building. Without this, `getExpoPushTokenAsync()` will fail in EAS builds.
- For quick backend testing, use curl: `curl -X POST https://your-domain/api/push/trigger -H "Authorization: Bearer <jwt>" -H "Content-Type: application/json"`.
- The DeviceTokens table is the source of truth for registered tokens: `SELECT * FROM "DeviceTokens"`.
- Push errors are best-effort — check PushNotificationService logs in the backend console for Expo API response details.
- K027 applies: the app uses both `shouldShowBanner` and `shouldShowList` (SDK 54 requirement) alongside deprecated `shouldShowAlert` for compatibility.
