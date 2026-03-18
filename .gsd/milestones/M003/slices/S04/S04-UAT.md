# S04: Mobil App Foundation — UAT

**Milestone:** M003
**Written:** 2026-03-18

## UAT Type

- UAT mode: mixed (artifact-driven verification complete; live-runtime human-experience testing required)
- Why this mode is sufficient: TypeScript type-checking and Expo bundle export prove structural correctness and RN compatibility. Runtime behavior (UI rendering, navigation, API calls, token refresh) requires manual testing in Expo Go on a physical device or emulator.

## Preconditions

1. **Backend running:** Production backend must be accessible at the configured API URL (`https://gurkan.efegurkan.com/api` or local IP for LAN testing)
2. **Test credentials:** `admin@gurkan.com` / `Admin123!` must be a valid superadmin account with existing properties, tenants, and financial data
3. **Expo Go installed:** Expo Go app installed on iOS or Android device (or emulator)
4. **Dev server running:** `cd gurkan-mobile && npx expo start` running on the development machine
5. **Same network:** Device and dev machine on the same Wi-Fi network (for Expo Go QR code connection)
6. **If testing against local backend:** Update `EXPO_PUBLIC_API_URL` env var to point to the LAN IP (e.g., `http://192.168.1.x:5039/api`)

## Smoke Test

Open Expo Go → scan QR code → login screen appears → enter `admin@gurkan.com` / `Admin123!` → tap "Giriş Yap" → dashboard loads with summary cards showing real financial data. If this works, the core integration (Expo → backend API → JWT auth → data rendering) is proven.

## Test Cases

### 1. Login — Valid Credentials

1. Open the app in Expo Go
2. Verify the login screen shows: email input, password input, "Giriş Yap" button, app title "Gürkan"
3. Enter `admin@gurkan.com` in email field
4. Enter `Admin123!` in password field
5. Tap "Giriş Yap"
6. **Expected:** Loading spinner appears briefly → dashboard screen loads → bottom tab bar shows 3 tabs (Dashboard, Mülkler, Bildirimler)

### 2. Login — Invalid Credentials

1. On the login screen, enter `admin@gurkan.com` / `wrongpassword`
2. Tap "Giriş Yap"
3. **Expected:** Error message appears in Turkish: "E-posta veya şifre hatalı" — login screen remains visible, no crash

### 3. Login — Empty Fields

1. On the login screen, leave both fields empty
2. Tap "Giriş Yap"
3. **Expected:** Error message appears — the app does not crash or navigate away

### 4. Dashboard — Summary Cards

1. After successful login, observe the dashboard screen
2. **Expected:** 
   - Greeting shows "Merhaba, [user name]"
   - Summary cards grouped by currency (TRY, USD, EUR — whichever exist)
   - Each card shows: Kâr/Zarar, Gelir, Gider values formatted in Turkish locale (e.g., "1.234,56")
   - If there are active notifications, a notification banner appears with count and severity breakdown

### 5. Dashboard — Notification Banner

1. On the dashboard, locate the notification banner (if notifications exist in the system)
2. Tap the notification banner
3. **Expected:** App navigates to the Bildirimler (Notifications) tab

### 6. Dashboard — Per-Property List

1. On the dashboard, scroll down past the summary cards
2. **Expected:** Per-property financial summary list visible — each item shows property name, type badge, income/expense/profit values

### 7. Dashboard — Pull to Refresh

1. On the dashboard, pull down from the top of the screen
2. **Expected:** Refresh indicator appears → data reloads → indicator disappears

### 8. Tab Navigation

1. Tap the "Mülkler" tab in the bottom bar
2. **Expected:** Property list screen appears
3. Tap the "Bildirimler" tab
4. **Expected:** Notifications list screen appears
5. Tap the "Dashboard" tab
6. **Expected:** Dashboard screen appears — all tabs switch correctly with no delay or flash

### 9. Property List — Card Display

1. Navigate to the Mülkler tab
2. **Expected:** 
   - FlatList of property cards appears
   - Each card shows: property name, type badge (e.g., "Daire", "Ev"), city with map pin icon, currency badge (TRY/USD/EUR with color coding), group name if assigned
   - Cards are pressable (touch feedback)

### 10. Property Detail — Navigation and Content

1. On the property list, tap any property card
2. **Expected:**
   - Detail screen opens with back arrow in header
   - Header shows property name as title
   - Sections displayed: type/currency/group badges, location (address, city, district), details (area m², rooms, floor, build year), description (if exists), dates (created, updated)
   - All non-null fields are displayed; null fields are omitted (no "null" text)
3. Tap the back arrow
4. **Expected:** Returns to property list with scroll position preserved

### 11. Notifications — Severity Badges

1. Navigate to the Bildirimler tab
2. **Expected:**
   - List of notification items with severity badges
   - "Kritik" badges are red with white text
   - "Uyarı" badges are amber/yellow with white text
   - "Bilgi" badges are blue with white text
   - Each item shows: severity badge, notification type, message, property name, date

### 12. Notifications — Property Deep Link

1. On the notifications list, tap a property name (it should appear as a pressable link)
2. **Expected:** App navigates to the property detail screen for that property

### 13. Notifications — Pull to Refresh

1. On the notifications list, pull down from the top
2. **Expected:** Refresh indicator appears → notification list reloads

### 14. Sign Out

1. On the dashboard screen, locate the sign-out icon (circular button in the header area)
2. Tap the sign-out icon
3. **Expected:** Confirmation dialog appears: "Çıkış yapmak istediğinize emin misiniz?"
4. Tap "Evet" (or the confirm option)
5. **Expected:** App returns to the login screen. Navigating back should not show the dashboard.

### 15. Session Persistence

1. Login successfully → dashboard loads
2. Close Expo Go completely (swipe away from recent apps)
3. Reopen Expo Go and the app
4. **Expected:** Dashboard loads directly without showing the login screen (session restored from SecureStore)

### 16. Token Refresh (requires short TTL configuration)

1. Temporarily set backend JWT access token TTL to 1 minute (in `appsettings.json` or env var)
2. Login in the app → dashboard loads
3. Wait 2 minutes
4. Pull to refresh on the dashboard (or navigate to a different tab)
5. **Expected:** Data loads successfully — the token was silently refreshed. No redirect to login screen.
6. Check Expo Go console logs for: `[auth] Token refreshed successfully`
7. Restore backend TTL to normal

## Edge Cases

### Network Error During Login

1. Disconnect the device from Wi-Fi
2. Attempt to login
3. **Expected:** Error message appears (network error) — app does not crash. Reconnecting and retrying works.

### Network Error During Data Fetch

1. Login successfully
2. Disconnect Wi-Fi
3. Pull to refresh on the dashboard
4. **Expected:** Error banner appears with retry button. Tapping retry after reconnecting loads the data.

### Empty Notifications

1. If the system has no active notifications (all payments up to date, no expiring leases, no overdue bills)
2. Navigate to Bildirimler tab
3. **Expected:** Empty state message "Bildirim yok — her şey yolunda!" with check-circle icon

### Property with Minimal Data

1. Create a property in the web app with only required fields (name, type, currency, group)
2. View that property's detail in the mobile app
3. **Expected:** Detail screen shows available fields. Optional fields (district, area, rooms, floor, buildYear, description) are simply not shown — no "null" or "undefined" text.

### Rapid Tab Switching

1. Quickly tap between all 3 tabs multiple times
2. **Expected:** No crashes, no stale data, no UI glitches. Each tab shows its correct content.

## Failure Signals

- Login button shows spinner indefinitely — backend unreachable or CORS misconfigured
- Dashboard shows "Veri yüklenemedi" (error state) — API URL incorrect or backend down
- Property list is empty when properties exist — auth token not attached to requests
- Notification badges are all gray/unstyled — severity config mapping broken
- Tapping a property card does nothing — router.push navigation broken
- App crashes on launch — font loading failure or missing dependency
- "Token refresh failed" in console after 15 minutes — refresh interceptor broken, user will be logged out
- Back navigation from property detail shows blank screen — Stack navigator configuration issue

## Requirements Proved By This UAT

- R017 (partial) — Mobile app login, dashboard, property list/detail, and notifications are functional. Sub-pages (tenants, expenses, bills, documents) deferred to S05.
- R026 (mobile portion) — Token refresh interceptor on mobile works with same pattern as web (test case 16).

## Not Proven By This UAT

- R017 full scope — Sub-pages (tenants, short-term rentals, expenses, bills, documents) are S05 scope
- R019 — Push notifications are S06 scope
- Production backend connectivity — This UAT can run against local or production backend. VPS-deployed backend connectivity tested separately in S01.
- iOS-specific behavior — If only testing on Android, iOS-specific rendering differences are not covered
- EAS Build — This UAT tests via Expo Go development mode, not a production build via EAS

## Notes for Tester

- **API URL:** If the production backend at `gurkan.efegurkan.com` is not yet deployed, test against the local backend. Set `EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:5039/api` before starting the dev server. Do NOT use `localhost` — the mobile device can't reach it.
- **Expo Go version:** Ensure Expo Go matches the SDK version (54). Mismatched versions show a red error screen on launch.
- **Console logs:** Open Expo Go developer menu (shake device or Ctrl+M in emulator) → select "Debug Remote JS" or check the terminal running `npx expo start` for `[auth]`, `[dashboard]`, `[properties]`, `[notifications]` debug logs.
- **Known rough edge:** Password input doesn't auto-focus after email input. You need to tap the password field manually.
- **Font loading:** The first launch may show a brief splash screen while DM Sans fonts download. Subsequent launches are cached.
- **Token refresh test (case 16):** This requires backend configuration change. Skip if not feasible — the interceptor code is structurally identical to the web version (S02) which was already verified.
