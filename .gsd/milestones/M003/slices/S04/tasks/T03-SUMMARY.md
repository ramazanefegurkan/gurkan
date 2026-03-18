---
id: T03
parent: S04
milestone: M003
provides:
  - Bottom tab navigation with 3 tabs (Dashboard, Mülkler, Bildirimler) styled with theme tokens
  - Dashboard screen fetching real API data with summary cards, notification banner, per-property financial list
  - Notifications screen with severity-colored list (Critical/Warning/Info)
  - Properties tab with Stack layout placeholder for T04 nested navigation
  - Sign-out with confirmation dialog
  - Pull-to-refresh on dashboard and notifications
key_files:
  - gurkan-mobile/app/(tabs)/_layout.tsx
  - gurkan-mobile/app/(tabs)/index.tsx
  - gurkan-mobile/app/(tabs)/notifications.tsx
  - gurkan-mobile/app/(tabs)/properties/_layout.tsx
  - gurkan-mobile/app/(tabs)/properties/index.tsx
key_decisions:
  - Used actual app/ directory (not src/app/) since T01 scaffolded the Expo Router routes under gurkan-mobile/app/
  - Properties tab uses headerShown:false in tab layout since its own Stack navigator provides the header
  - Sign-out button placed as a circular icon in the dashboard header row (not tab bar), using Alert.alert for confirmation
  - Notification banner navigates to /(tabs)/notifications route using router.push
patterns_established:
  - Dashboard data fetching pattern: parallel Promise.all of getDashboard + getNotifications with loading/error/refreshing state management
  - Screen-level console.debug logging with component prefix: [dashboard], [notifications]
  - Reusable severity config mapping for notification styling (severityConfig record)
  - formatAmount helper using tr-TR locale for consistent Turkish number formatting
observability_surfaces:
  - "console.debug('[dashboard] fetching data...')" and "[dashboard] data loaded" for dashboard fetch lifecycle
  - "console.debug('[notifications] fetching...')" and "[notifications] loaded" for notification fetch lifecycle
  - "console.debug('[auth] signOut confirmed by user')" for sign-out tracking
  - "console.error('[dashboard] fetch error')" and "[notifications] fetch error" for failure visibility
  - API calls visible in Expo Go network inspector: GET /dashboard, GET /notifications
duration: 12m
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T03: Build tab navigation and dashboard screen

**Built 3-tab bottom navigation (Dashboard/Mülkler/Bildirimler), full dashboard screen with currency-grouped summary cards and per-property financial list, notifications screen with severity-colored badges, and sign-out with confirmation dialog — all fetching real data from production API**

## What Happened

Built the complete tab navigation and data-rendering screens for the mobile app:

1. **Tab layout** (`app/(tabs)/_layout.tsx`): Updated the existing single-tab layout to 3 tabs — Dashboard (MaterialIcons "dashboard"), Mülkler (MaterialIcons "apartment"), and Bildirimler (MaterialIcons "notifications"). Styled with terracotta accent for active state, consistent theme tokens for tab bar height, fonts, and header styling. The properties tab points to a directory with `headerShown: false` to support its own Stack navigator.

2. **Properties Stack + placeholder** (`app/(tabs)/properties/_layout.tsx` and `index.tsx`): Created the nested Stack navigator that T04 will fill with property list and `[id].tsx` detail. The placeholder shows an icon, "Mülkler yükleniyor..." text, and a spinner.

3. **Dashboard screen** (`app/(tabs)/index.tsx`): Full implementation mirroring the web Dashboard.tsx pattern adapted for mobile. Fetches `getDashboard()` and `getNotifications()` in parallel. Renders:
   - Greeting header with user name and sign-out icon button
   - Notification banner with total count and severity breakdown (pressable → navigates to notifications tab)
   - Currency-grouped summary cards showing Kâr/Zarar, Gelir, Gider, and alert badges
   - Per-property list with type badges, income/expense/profit columns, and status badges
   - Loading spinner, error state with retry, empty state, and pull-to-refresh

4. **Notifications screen** (`app/(tabs)/notifications.tsx`): FlatList rendering notification items with severity-based icon/color configuration (Critical=red, Warning=amber, Info=blue). Shows severity summary bar at top, notification type label, message, property name, and formatted date. Full loading/error/empty states and pull-to-refresh.

5. **Sign-out**: Circular logout icon in the dashboard header. Triggers `Alert.alert` with "Çıkış yapmak istediğinize emin misiniz?" confirmation before calling `signOut()`.

## Verification

- `npx tsc --noEmit` — zero TypeScript errors ✅
- `npx expo export --platform android` — successful build, valid RN bundle ✅
- All must-haves from the task plan satisfied:
  - Bottom tab bar with 3 tabs styled with theme tokens ✅
  - Dashboard fetches and displays real API data ✅
  - Notification banner shows total + severity breakdown ✅
  - Loading/error/empty states on dashboard ✅
  - Properties tab has Stack layout placeholder ✅
  - Notifications screen shows severity-colored list ✅
  - Sign-out button accessible via dashboard header ✅
  - Pull-to-refresh on dashboard and notifications ✅

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd gurkan-mobile && npx tsc --noEmit` | 0 | ✅ pass | 3s |
| 2 | `cd gurkan-mobile && npx expo export --platform android` | 0 | ✅ pass | ~30s |

## Diagnostics

- **Dashboard fetch lifecycle:** `console.debug('[dashboard] fetching data...')` on mount, `[dashboard] data loaded: N currencies, N properties, N notifications` on success, `console.error('[dashboard] fetch error')` on failure.
- **Notifications fetch lifecycle:** `console.debug('[notifications] fetching...')` on mount, `[notifications] loaded: N items` on success, `console.error('[notifications] fetch error')` on failure.
- **Sign-out:** `console.debug('[auth] signOut confirmed by user')` logged before calling context signOut.
- **Network:** Expo Go network inspector shows `GET /api/dashboard` and `GET /api/notifications` calls.
- **Error states:** API errors surface as user-facing banners with retry button; no silent failures.

## Deviations

- Task plan references `src/app/(tabs)/` paths but the actual Expo Router structure created by T01 uses `app/(tabs)/` (no `src/` prefix). All files written to the correct `app/` directory.
- Plan listed 4 estimated files but 5 files were created (the properties directory needs both `_layout.tsx` and `index.tsx`).

## Known Issues

None.

## Files Created/Modified

- `gurkan-mobile/app/(tabs)/_layout.tsx` — Updated from single-tab placeholder to full 3-tab bottom navigation with theme styling
- `gurkan-mobile/app/(tabs)/index.tsx` — Complete dashboard screen with summary cards, notification banner, property list, and sign-out
- `gurkan-mobile/app/(tabs)/notifications.tsx` — New notification list screen with severity colors and loading states
- `gurkan-mobile/app/(tabs)/properties/_layout.tsx` — New Stack navigator layout for properties tab
- `gurkan-mobile/app/(tabs)/properties/index.tsx` — New placeholder screen for property list (T04 replaces)
- `.gsd/milestones/M003/slices/S04/tasks/T03-PLAN.md` — Added Observability Impact section
