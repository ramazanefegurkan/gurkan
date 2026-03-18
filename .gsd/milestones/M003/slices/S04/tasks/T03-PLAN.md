---
estimated_steps: 5
estimated_files: 4
---

# T03: Build tab navigation and dashboard screen

**Slice:** S04 — Mobil App Foundation
**Milestone:** M003

## Description

Set up the bottom tab navigation with 3 tabs (Dashboard, Mülkler, Bildirimler) and build the dashboard screen that displays real data from the API. This proves the end-to-end data flow: mobile API client → production backend → rendered React Native UI.

The dashboard mirrors the web's `Dashboard.tsx` layout adapted for mobile: summary cards per currency showing income/expense/profit, a notification banner with severity counts, and a per-property financial summary list. The Properties tab uses a nested Stack navigator so that list → detail push navigation works within the tab (T04 creates the actual screens).

**Relevant skills:** Load `frontend-design` skill for polished mobile UI design. Avoid generic React Native styling — use the terracotta accent, DM Sans font, and consistent design tokens from `theme.ts`.

## Steps

1. **Update `src/app/(tabs)/_layout.tsx` — Bottom tab navigator:**
   - Use Expo Router `Tabs` component with 3 tabs:
     - `index` → Dashboard (icon: MaterialIcons "dashboard", label: "Dashboard")
     - `properties` → Mülkler (icon: MaterialIcons "home-work" or "apartment", label: "Mülkler")
     - `notifications` → Bildirimler (icon: MaterialIcons "notifications", label: "Bildirimler")
   - Style tab bar: white background, terracotta accent for active tab, grey for inactive.
   - Add badge on notifications tab if there are critical notifications (optional enhancement).
   - The `properties` entry should point to a directory (`properties/`) to support nested Stack routing in T04.

2. **Create `src/app/(tabs)/properties/_layout.tsx` — Properties Stack:**
   - Simple Stack navigator layout that wraps the properties tab content.
   - This allows T04 to add `index.tsx` (list) and `[id].tsx` (detail) as stack screens.
   - For now, create a minimal placeholder screen (`index.tsx`) with text "Mülkler yükleniyor..." that T04 will replace.

3. **Build `src/app/(tabs)/index.tsx` — Dashboard screen:**
   - On mount, fetch `getDashboard()` and `getNotifications()` in parallel (same pattern as web `Dashboard.tsx`).
   - **Loading state:** Full-screen spinner with "Yükleniyor..." text.
   - **Error state:** Error message with retry button.
   - **Notification banner:** If notifications exist, show a pressable banner at top with bell icon, total count, critical count (red), warning count (amber). Pressing navigates to notifications tab.
   - **Summary cards:** For each currency in `dashboard.summary`, render a card showing:
     - Currency label (₺ TRY, $ USD, € EUR)
     - Kâr/Zarar amount (green if positive, red if negative)
     - Gelir (income) and Gider (expense) in a row
     - Alert badges: "X ödenmemiş kira" (red), "X yaklaşan fatura" (amber), or "Sorun yok" (green)
   - **Per-property list:** ScrollView or FlatList showing each property with:
     - Property name (pressable → navigates to property detail)
     - Type badge
     - Income / Expense / Profit amounts
     - Unpaid rent count badge / upcoming bill count badge
   - **Empty state:** If no properties, show friendly message with icon.
   - **Pull to refresh:** `RefreshControl` on the ScrollView/FlatList.
   - Use `formatAmount()` helper: `amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })`.

4. **Create `src/app/(tabs)/notifications.tsx` — Notification screen placeholder:**
   - Fetch `getNotifications()` on mount.
   - Render a FlatList with basic notification items (severity, message, property name, date).
   - Use severity-based colors: Critical → red badge, Warning → amber badge, Info → blue badge.
   - T04 will polish this screen further, but it should be functional here.
   - Loading/error/empty states.

5. **Add sign-out functionality:**
   - Add a sign-out button or icon in the dashboard header (or as a settings icon in the tab bar).
   - Calls `signOut()` from session context.
   - Confirm: "Çıkış yapmak istediğinize emin misiniz?" alert before signing out.

## Must-Haves

- [ ] Bottom tab bar with 3 tabs (Dashboard, Mülkler, Bildirimler) styled with theme tokens
- [ ] Dashboard screen fetches and displays real API data (summary cards, property list)
- [ ] Notification banner shows total + severity breakdown
- [ ] Loading spinner, error state with retry, and empty state on dashboard
- [ ] Properties tab has a Stack layout placeholder for T04 to fill
- [ ] Notifications screen shows basic list with severity colors
- [ ] Sign-out button accessible from within the app
- [ ] Pull-to-refresh on dashboard

## Verification

- `cd gurkan-mobile && npx tsc --noEmit` — zero TypeScript errors
- Manual in Expo Go:
  - Login → dashboard loads → summary cards display currency-grouped financials
  - Bottom tabs show Dashboard / Mülkler / Bildirimler with icons
  - Tapping Mülkler tab shows placeholder (T04 fills in)
  - Tapping Bildirimler tab shows notification list
  - Pull-to-refresh on dashboard reloads data
  - Sign-out button triggers logout → returns to sign-in screen

## Inputs

- `gurkan-mobile/src/api/client.ts` — API functions: `getDashboard()`, `getNotifications()` (from T02)
- `gurkan-mobile/src/api/types.ts` — TypeScript types: `DashboardResponse`, `NotificationItem`, `CurrencyLabels`, etc. (from T02)
- `gurkan-mobile/src/ctx.tsx` — `useSession()` hook for auth state and `signOut` (from T01)
- `gurkan-mobile/src/theme.ts` — Design tokens (from T01)
- `gurkan-ui/src/pages/Dashboard/Dashboard.tsx` — Web dashboard layout reference (adapt for mobile)

## Expected Output

- `gurkan-mobile/src/app/(tabs)/_layout.tsx` — Bottom tab navigator with 3 styled tabs
- `gurkan-mobile/src/app/(tabs)/index.tsx` — Dashboard screen with summary cards, notification banner, property list
- `gurkan-mobile/src/app/(tabs)/properties/_layout.tsx` — Stack layout for properties tab
- `gurkan-mobile/src/app/(tabs)/properties/index.tsx` — Placeholder property list (T04 replaces)
- `gurkan-mobile/src/app/(tabs)/notifications.tsx` — Notification list screen with severity colors

## Observability Impact

- **Console signals:** `console.debug('[dashboard] ...')` messages for data fetch lifecycle (start, success, error, refresh). `console.debug('[notifications] ...')` for notification fetch lifecycle.
- **Inspection surfaces:** Expo Go developer menu → network inspector shows `GET /dashboard` and `GET /notifications` API calls. React DevTools shows dashboard state (loading, data, error) and notification counts.
- **Failure visibility:** API errors surface as user-facing error banners on dashboard and notification screens with a retry button. Network failures logged to `console.error`. Sign-out confirmation alert logged via `console.debug('[auth] signOut')`.
- **What future agents should check:** Dashboard data loads → summary cards render with real currency amounts. Notification banner shows severity counts. Pull-to-refresh triggers re-fetch. Tab navigation switches between all three screens. Sign-out returns to login.
