---
estimated_steps: 7
estimated_files: 7
---

# T02: Mobile push permission, token registration, and notification handlers

**Slice:** S06 — Push Notifications
**Milestone:** M003

## Description

Complete the mobile side of push notifications: install `expo-notifications` and `expo-device`, configure the Expo app for push, implement push permission request + token acquisition, register the device token with the backend on login, unregister on logout, and wire foreground/background notification handlers in the root layout.

**Relevant skills:** None specific — standard Expo SDK notifications pattern.

**Key constraint:** `getExpoPushTokenAsync()` requires a `projectId` from EAS. The app must have an EAS project ID configured in `app.config.ts`. Since the project may not have been linked to EAS yet, the `projectId` should be configurable — either from `Constants.expoConfig.extra.eas.projectId`, `Constants.easConfig.projectId`, or a hardcoded fallback in `app.config.ts` extra config. The executor should run `eas init` if possible, or document the need for it.

**Key constraint:** Push notifications don't work on simulators/emulators — the code must gracefully handle the case where a push token can't be acquired (e.g., on simulator, just log and skip registration).

**Key constraint:** Android 8+ requires a notification channel. Must call `Notifications.setNotificationChannelAsync()` before notifications will display on Android.

## Steps

1. **Install dependencies** — In `gurkan-mobile/`, run `npx expo install expo-notifications expo-device`. This installs SDK-compatible versions. Verify they appear in `package.json` dependencies.

2. **Update app.config.ts** — Add `expo-notifications` to the `plugins` array. For Android, include notification channel config:
   ```
   ['expo-notifications', { icon: './assets/images/icon.png', color: '#c4653a' }]
   ```
   Add an `eas` section under `extra` with `projectId` — use the value from `Constants.easConfig?.projectId` if available, or a placeholder string that the user can replace after running `eas init`. The config should look like:
   ```ts
   extra: {
     apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://gurkan.efegurkan.com/api',
     eas: {
       projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? 'your-eas-project-id',
     },
   },
   ```
   Also add the top-level `owner` field as `'efegurkan'` (needed for EAS).

3. **Add API functions and types** — In `gurkan-mobile/src/api/types.ts`, add:
   ```ts
   export interface DeviceTokenRequest {
     expoPushToken: string;
     platform: string;
   }
   
   export interface PushTriggerResponse {
     message?: string;
     results?: Array<{ token: string; status: string; ticketId?: string; error?: string }>;
   }
   ```
   In `gurkan-mobile/src/api/client.ts`, add three new API functions:
   - `registerDeviceToken(payload: DeviceTokenRequest): Promise<void>` — POST to `/device-tokens`
   - `unregisterDeviceToken(expoPushToken: string): Promise<void>` — DELETE to `/device-tokens` with body `{ expoPushToken }`
   - `triggerPush(): Promise<PushTriggerResponse>` — POST to `/push/trigger`

4. **Create notifications module** — `gurkan-mobile/src/notifications.ts`:
   - `registerForPushNotificationsAsync(): Promise<string | null>` — checks if running on physical device (using `expo-device`), requests permission via `Notifications.requestPermissionsAsync()`, gets push token via `Notifications.getExpoPushTokenAsync({ projectId })` where projectId comes from Constants. On simulator or permission denied, logs and returns null. Returns the token string on success.
   - `setupNotificationChannel(): Promise<void>` — on Android, creates default notification channel with `Notifications.setNotificationChannelAsync('default', { name: 'Bildirimler', importance: Notifications.AndroidImportance.MAX, vibrationPattern: [0, 250, 250, 250], lightColor: '#c4653a' })`.
   - `setupNotificationHandlers()` — calls `Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true }) })`. This configures foreground notification display.
   - Handle errors gracefully — wrap everything in try-catch, log errors, never throw. Push is best-effort.

5. **Wire registration into auth context** — In `gurkan-mobile/src/ctx.tsx`:
   - Import `registerForPushNotificationsAsync` from `./notifications` and `registerDeviceToken`, `unregisterDeviceToken` from `./api/client`.
   - In the `signIn` function, after successful login and token storage, call `registerForPushNotificationsAsync()`. If a push token is returned, call `registerDeviceToken({ expoPushToken: token, platform: Platform.OS })`. Wrap in try-catch — push registration failure should NOT prevent sign-in.
   - Store the push token in a ref or state so it's available for unregistration on sign-out.
   - In `signOut`, if a push token was stored, call `unregisterDeviceToken(pushToken)` before clearing the session. Wrap in try-catch — unregistration failure should NOT prevent sign-out.
   - Add `console.debug('[push] token registered: ExponentPushToken[...]')` and `console.debug('[push] token unregistered')` logging.

6. **Setup notification handlers in root layout** — In `gurkan-mobile/app/_layout.tsx`:
   - Import `setupNotificationHandlers` and `setupNotificationChannel` from `@/src/notifications`.
   - In the `RootLayout` component, add a `useEffect` that calls `setupNotificationHandlers()` and `setupNotificationChannel()` once on mount (before SessionProvider renders — this is fine because these are static config, not dependent on auth state).
   - Add a notification response listener (`Notifications.addNotificationResponseReceivedListener`) that navigates to the relevant property when a notification is tapped. The notification `data` field should contain `propertyId` — use `router.push` to navigate to the property detail. Import `useRouter` from `expo-router` — BUT since this is in RootLayout which wraps SessionProvider, the router may not be available. Instead, use `Notifications.addNotificationResponseReceivedListener` outside the component (module-level) or in RootNavigator which is inside the navigation tree. The safest approach: add the response listener in `RootNavigator` (which is inside both SessionProvider and the Stack), since it has access to navigation.

7. **Verify static analysis** — Run `npx tsc --noEmit` in `gurkan-mobile/` to verify zero TypeScript errors. Run `npx expo export --platform android` to verify the bundle builds with new dependencies. Grep for any leaked web-only APIs (`localStorage` usage outside Platform.OS guard, `window.` or `document.` usage).

## Must-Haves

- [ ] `expo-notifications` and `expo-device` installed and in package.json
- [ ] `expo-notifications` added to app.config.ts plugins array
- [ ] EAS projectId configured in app.config.ts extra (with env var fallback)
- [ ] `src/notifications.ts` module with registerForPushNotificationsAsync(), setupNotificationChannel(), setupNotificationHandlers()
- [ ] Push token registered with backend after successful signIn
- [ ] Push token unregistered from backend on signOut
- [ ] Foreground notification display configured via setNotificationHandler
- [ ] Android notification channel created
- [ ] All push code wrapped in try-catch (best-effort, never blocks auth flow)
- [ ] TypeScript compiles clean, Android bundle exports successfully

## Verification

- `cd gurkan-mobile && npx tsc --noEmit` — zero errors
- `cd gurkan-mobile && npx expo export --platform android` — successful bundle (check output for "Exporting was successful")
- `grep -r "localStorage" gurkan-mobile/src/ --include="*.ts" --include="*.tsx"` — only in Platform.OS === 'web' guards
- Manual UAT on physical device: login → permission prompt → console shows "[push] token registered" → check backend DB for token → trigger push → notification appears

## Inputs

- `gurkan-mobile/src/ctx.tsx` — SessionProvider with signIn/signOut (need to add push registration/unregistration)
- `gurkan-mobile/src/api/client.ts` — API client with auth interceptor (need to add registerDeviceToken/unregisterDeviceToken/triggerPush functions)
- `gurkan-mobile/src/api/types.ts` — TypeScript types (need to add DeviceTokenRequest, PushTriggerResponse)
- `gurkan-mobile/app/_layout.tsx` — Root layout (need to add notification handler setup)
- `gurkan-mobile/app.config.ts` — Expo config (need to add expo-notifications plugin + EAS projectId)
- `gurkan-mobile/package.json` — dependencies (expo-notifications + expo-device will be added)

**From T01:** Backend endpoints are available:
- `POST /api/device-tokens` — register device token (body: `{ expoPushToken, platform }`)
- `DELETE /api/device-tokens` — unregister device token (body: `{ expoPushToken }`)
- `POST /api/push/trigger` — trigger push notifications for current user

**Key knowledge from S04 summary:**
- Expo Router routes live under `gurkan-mobile/app/` (not `src/app/`). Non-route code under `src/`.
- Auth context uses `useStorageState` hook with SecureStore. `setSession` is synchronous from React's perspective.
- Cross-tab navigation pattern: `router.push('/(tabs)/properties/${id}')` — use same pattern for notification taps.
- `Constants.expoConfig?.extra?.apiUrl` pattern for reading config values.
- `Platform.OS` used for platform detection (web/ios/android).
- Design tokens in `src/theme.ts` — use `colors.accent` (#c4653a) for notification channel color.

## Observability Impact

- **New console signals:** `[push] token registered: ExponentPushToken[...]` on successful signIn + push registration; `[push] token unregistered` on signOut; `[push]` prefixed warnings on permission denial, simulator detection, or registration errors.
- **Foreground notification handling:** `Notifications.setNotificationHandler` configured — foreground notifications display as alerts with sound and badge. Observable via system notification tray.
- **Android notification channel:** `Bildirimler` channel created with MAX importance — inspectable in Android system notification settings for the app.
- **Failure shapes:** Push registration errors are caught and logged but never block auth flow. On simulator/emulator, `registerForPushNotificationsAsync()` returns null and logs `[push] must use physical device`. Permission denial logs `[push] permission not granted`. Token acquisition failure logs `[push] error: <message>`.
- **Inspection surfaces:** Backend `DeviceTokens` table shows registered tokens per user. Push token is stored in auth context ref for unregistration on sign-out.
- **Notification tap routing:** Notification response listener navigates to property detail via `router.push('/(tabs)/properties/${propertyId}')` when notification data includes `propertyId`.

## Expected Output

- `gurkan-mobile/package.json` — modified with expo-notifications + expo-device dependencies
- `gurkan-mobile/app.config.ts` — modified with expo-notifications plugin + EAS projectId
- `gurkan-mobile/src/notifications.ts` — new module with push registration + handler setup
- `gurkan-mobile/src/api/client.ts` — modified with registerDeviceToken/unregisterDeviceToken/triggerPush functions
- `gurkan-mobile/src/api/types.ts` — modified with DeviceTokenRequest/PushTriggerResponse types
- `gurkan-mobile/src/ctx.tsx` — modified with push registration in signIn, unregistration in signOut
- `gurkan-mobile/app/_layout.tsx` — modified with notification handler setup + notification response listener
