---
estimated_steps: 6
estimated_files: 5
---

# T04: Build property list, property detail, and finalize notification screen

**Slice:** S04 — Mobil App Foundation
**Milestone:** M003

## Description

Complete the remaining screens: property list with card grid and group filtering, property detail showing all fields, and polish the notification screen. This task proves dynamic routing (`[id].tsx`) works with Expo Router and completes the full user journey: login → dashboard → property list → property detail → back → notifications.

Run the final verification: `npx tsc --noEmit` and `npx expo export --platform android` must both succeed, proving no web-only APIs leaked into the codebase.

**Relevant skills:** Load `frontend-design` skill for polished mobile UI.

## Steps

1. **Build `src/app/(tabs)/properties/index.tsx` — Property list screen:**
   - Replace the T03 placeholder.
   - Fetch `getProperties()` on mount.
   - Render with `FlatList` for performance (not ScrollView — property lists can be long).
   - Each card shows: property name, type badge (PropertyTypeLabels), city with map-pin icon, currency badge (styled by currency: TRY default, USD blue, EUR green), group name if present.
   - Cards are pressable — navigate to `/(tabs)/properties/${id}` (pushes onto the Stack navigator).
   - **Pull-to-refresh:** `RefreshControl` on FlatList.
   - **Empty state:** "Henüz mülk yok" message with house icon.
   - **Error state:** Error message with retry button.
   - **Loading state:** Spinner.
   - Style: cards with subtle shadow/elevation, rounded corners (theme.radius.md), padding (theme.spacing.md).

2. **Build `src/app/(tabs)/properties/[id].tsx` — Property detail screen:**
   - Read `id` from route params: `const { id } = useLocalSearchParams<{ id: string }>()`.
   - Fetch `getProperty(id)` on mount.
   - Set screen title dynamically: use `<Stack.Screen options={{ title: property.name }} />` from expo-router.
   - Display all property fields in a structured layout:
     - **Header section:** Property name (large), type badge, group name if present
     - **Location section:** Address, city, district (with map-pin icon)
     - **Details section:** Area (m²), room count, floor/total floors, build year
     - **Financial:** Currency badge
     - **Description:** If present, show in a text block
     - **Created/Updated dates:** Formatted with `tr-TR` locale
   - Use labeled rows: "Adres", "Şehir", "İlçe", "Alan", "Oda Sayısı", "Kat", "Yapım Yılı", "Para Birimi", "Açıklama"
   - Handle null/optional fields gracefully — don't show "null", show "—" or omit the row.
   - **Loading state:** Spinner.
   - **Error state:** Error message with retry button.
   - Back navigation should work automatically via Stack navigator's header back button.

3. **Polish `src/app/(tabs)/notifications.tsx` — Final notification screen:**
   - If T03 already created a functional notification screen, polish it. If it was minimal, build it out fully.
   - Fetch `getNotifications()` on mount.
   - Render with `FlatList`.
   - Each notification item shows:
     - Severity badge: Critical (red background, white text "Kritik"), Warning (amber, "Uyarı"), Info (blue, "Bilgi")
     - Notification type label (from `NotificationTypeLabels`: "Kira Gecikmesi", "Fatura Hatırlatması", "Sözleşme Bitişi", "Kira Artışı")
     - Message text
     - Property name (link-styled, pressable → navigates to property detail)
     - Date formatted in tr-TR locale
   - **Pull-to-refresh.**
   - **Empty state:** "Bildirim yok — her şey yolunda!" with check icon.
   - **Loading/error states.**

4. **Update Properties Stack layout** if needed:
   - Ensure `src/app/(tabs)/properties/_layout.tsx` properly configures the Stack:
     - `index` screen: title "Mülkler"
     - `[id]` screen: title dynamically set by the detail screen
     - Header styled consistently with theme tokens (terracotta accent in header, white background).

5. **Final type-check and export verification:**
   - Run `npx tsc --noEmit` — fix any TypeScript errors.
   - Run `npx expo export --platform android` — fix any build errors.
   - Verify no web-only APIs: `grep -r "localStorage\|window\.\|document\.\|import\.meta\.env" gurkan-mobile/src/` should return zero results (excluding comments/type definitions).

6. **End-to-end manual test checklist** (document results):
   - [ ] Login with admin@gurkan.com / Admin123!
   - [ ] Dashboard shows summary cards
   - [ ] Bottom tabs switch correctly
   - [ ] Property list shows cards with type/city/currency/group
   - [ ] Tap property card → detail screen opens with all fields
   - [ ] Back button returns to property list
   - [ ] Notifications tab shows severity-colored badges
   - [ ] Tap property name in notification → navigates to property detail
   - [ ] Pull-to-refresh works on all list screens
   - [ ] Sign out returns to login screen
   - [ ] Re-login works after sign out

## Must-Haves

- [ ] Property list screen renders cards with type badge, city, currency, group name
- [ ] Property detail screen displays all fields (name, type, address, city, district, area, rooms, floor, buildYear, currency, description, group)
- [ ] Dynamic route `[id].tsx` works with Expo Router
- [ ] Notification screen shows severity badges with correct colors and type labels
- [ ] Pull-to-refresh on all list screens (dashboard, properties, notifications)
- [ ] Loading, error, and empty states on all screens
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npx expo export --platform android` succeeds

## Verification

- `cd gurkan-mobile && npx tsc --noEmit` — zero TypeScript errors
- `cd gurkan-mobile && npx expo export --platform android` — export succeeds
- `grep -rn "localStorage\|window\.\|document\.\|import\.meta\.env" gurkan-mobile/src/ --include="*.ts" --include="*.tsx" | grep -v "\/\/" | grep -v "types.ts"` — zero hits
- Manual in Expo Go: complete flow from login → dashboard → properties → detail → back → notifications → sign out

## Observability Impact

- **Property list lifecycle:** `console.debug('[properties] fetching list...')` on mount, `[properties] loaded: N properties` on success, `console.error('[properties] fetch error')` on failure.
- **Property detail lifecycle:** `console.debug('[property-detail] fetching id: XYZ')` on mount, `[property-detail] loaded: PropertyName` on success, `console.error('[property-detail] fetch error')` on failure.
- **Notifications lifecycle:** Unchanged from T03 — `console.debug('[notifications] fetching...')` on mount, `[notifications] loaded: N items` on success, `console.error('[notifications] fetch error')` on failure.
- **Network:** Expo Go network inspector shows `GET /api/properties`, `GET /api/properties/:id`, and `GET /api/notifications` calls.
- **Navigation signals:** Property card press and notification property link press trigger `router.push()` — visible in React Navigation devtools as screen push events.
- **Error states:** API errors surface as user-facing error banners with retry button on each screen; no silent failures.

## Inputs

- `gurkan-mobile/src/api/client.ts` — API functions: `getProperties()`, `getProperty(id)`, `getNotifications()` (from T02)
- `gurkan-mobile/src/api/types.ts` — Types: `PropertyListResponse`, `PropertyResponse`, `PropertyTypeLabels`, `CurrencyLabels`, `NotificationItem`, `NotificationTypeLabels`, `NotificationSeverity` (from T02)
- `gurkan-mobile/src/theme.ts` — Design tokens (from T01)
- `gurkan-mobile/src/app/(tabs)/properties/_layout.tsx` — Stack layout placeholder (from T03)
- `gurkan-mobile/src/app/(tabs)/notifications.tsx` — Notification placeholder (from T03)
- `gurkan-ui/src/pages/Properties/PropertyList.tsx` — Web property list layout reference
- `gurkan-ui/src/pages/Properties/PropertyDetail.tsx` — Web property detail layout reference

## Expected Output

- `gurkan-mobile/src/app/(tabs)/properties/index.tsx` — Property list screen (replaces placeholder)
- `gurkan-mobile/src/app/(tabs)/properties/[id].tsx` — Property detail screen
- `gurkan-mobile/src/app/(tabs)/notifications.tsx` — Polished notification screen
- `gurkan-mobile/src/app/(tabs)/properties/_layout.tsx` — Updated Stack layout with screen options
- All verification checks pass: `tsc --noEmit`, `expo export`, no web-only APIs, manual E2E test
