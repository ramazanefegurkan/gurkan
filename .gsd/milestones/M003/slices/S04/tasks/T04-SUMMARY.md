---
id: T04
parent: S04
milestone: M003
provides:
  - Property list screen with FlatList cards showing type/city/currency/group badges
  - Property detail screen with dynamic [id] routing and all property fields
  - Polished notification screen with severity-colored badges and pressable property links
key_files:
  - gurkan-mobile/app/(tabs)/properties/index.tsx
  - gurkan-mobile/app/(tabs)/properties/[id].tsx
  - gurkan-mobile/app/(tabs)/notifications.tsx
  - gurkan-mobile/app/(tabs)/properties/_layout.tsx
key_decisions:
  - Notification severity badges use solid-color backgrounds (red/amber/blue) with white text for maximum contrast on mobile, unlike T03's light-background approach
  - Property name in notification rows is pressable and navigates to property detail via router.push, enabling cross-tab deep linking
patterns_established:
  - Detail screen pattern: useLocalSearchParams + Stack.Screen options for dynamic title + ScrollView with RefreshControl
  - Cross-screen navigation from notifications to property detail via router.push('/(tabs)/properties/${id}')
observability_surfaces:
  - console.debug('[properties] fetching list...') / '[properties] loaded: N properties' for property list lifecycle
  - console.debug('[property-detail] fetching id: XYZ') / '[property-detail] loaded: PropertyName' for detail lifecycle
  - console.error('[properties] fetch error') and console.error('[property-detail] fetch error') for failures
  - Expo Go network inspector shows GET /api/properties, GET /api/properties/:id, GET /api/notifications
duration: 20m
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T04: Build property list, property detail, and notification screens

**Built property list with FlatList cards (type/city/currency/group badges), property detail with dynamic [id] routing showing all fields, and polished notifications with severity badges and pressable property links — all verified via tsc and expo export**

## What Happened

Replaced the T03 property list placeholder with a full FlatList-based screen showing property cards with type badge (PropertyTypeLabels), currency badge (color-coded: TRY default, USD blue, EUR green), city with map-pin icon, and group name. Cards are pressable and navigate to the detail screen via router.push.

Built the property detail screen (`[id].tsx`) using Expo Router's `useLocalSearchParams` for dynamic routing. The screen fetches `getProperty(id)` and displays all fields in structured sections: header (name, type, currency, group), location (address, city, district), details (area m², room count, floor/total floors, build year), description (if present), and dates (created/updated in tr-TR locale). The screen title is set dynamically via `<Stack.Screen options={{ title: property.name }} />`. Null/optional fields are gracefully omitted rather than showing "null".

Polished the notification screen from T03: made property names pressable (navigates to property detail), upgraded severity badges from light-background to solid-color backgrounds (red "Kritik", amber "Uyarı", blue "Bilgi") with white text for better mobile readability, and improved the empty state to show a check-circle icon with "Bildirim yok — her şey yolunda!".

Updated the properties Stack layout to register the `[id]` screen alongside `index`.

All screens have loading spinners, error states with retry buttons, and pull-to-refresh via RefreshControl.

## Verification

- `npx tsc --noEmit` — zero TypeScript errors
- `npx expo export --platform android` — successful (1074 modules bundled, exported to dist/)
- Web-only API grep — only Platform.OS-guarded localStorage fallback found (expected T01 pattern, not leaked web APIs)
- All 4 files created/updated compile and bundle correctly

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd gurkan-mobile && npx tsc --noEmit` | 0 | ✅ pass | 3.7s |
| 2 | `cd gurkan-mobile && npx expo export --platform android` | 0 | ✅ pass | 14.6s |
| 3 | `grep -rn "localStorage\|window\.\|document\.\|import\.meta\.env" gurkan-mobile/src/ --include="*.ts" --include="*.tsx" \| grep -v "//" \| grep -v "types.ts"` | 0 | ✅ pass (only Platform.OS-guarded fallback) | <1s |

## Diagnostics

- **Property list:** `console.debug('[properties] fetching list...')` on mount, `[properties] loaded: N properties` on success, `console.error('[properties] fetch error')` on failure
- **Property detail:** `console.debug('[property-detail] fetching id: XYZ')` on mount, `[property-detail] loaded: PropertyName` on success, `console.error('[property-detail] fetch error')` on failure
- **Notifications:** `console.debug('[notifications] fetching...')` on mount, `[notifications] loaded: N items` on success
- **Network:** Expo Go network inspector shows `GET /api/properties`, `GET /api/properties/:id`, `GET /api/notifications`
- **Error states:** API errors surface as user-facing error banners with retry button; no silent failures

## Deviations

- Notification severity badge styling changed from T03's light-background tints to solid-color backgrounds (red/amber/blue) with white text — plan specified "red background, white text" pattern which is clearer on mobile
- `localStorage` references in web-only API grep are expected (Platform.OS-guarded fallback from T01 design) — not a failure of the zero-hits check since the grep intent is to catch unguarded web-only APIs

## Known Issues

- Manual E2E testing in Expo Go not performed (requires device/emulator) — all automated verification passes
- This is the final task of S04; Expo Go manual verification is a slice-level requirement that needs human execution

## Files Created/Modified

- `gurkan-mobile/app/(tabs)/properties/index.tsx` — Full property list screen with FlatList, cards, badges, pull-to-refresh, and all states
- `gurkan-mobile/app/(tabs)/properties/[id].tsx` — Property detail screen with dynamic routing, all fields in sections, dynamic title
- `gurkan-mobile/app/(tabs)/notifications.tsx` — Polished notifications with severity badges, pressable property links, improved empty state
- `gurkan-mobile/app/(tabs)/properties/_layout.tsx` — Updated Stack layout registering [id] screen
- `.gsd/milestones/M003/slices/S04/tasks/T04-PLAN.md` — Added Observability Impact section (pre-flight fix)
