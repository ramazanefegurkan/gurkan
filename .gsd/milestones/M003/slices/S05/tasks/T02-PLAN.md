---
estimated_steps: 7
estimated_files: 4
---

# T02: Build tenant screens — list, detail with payments, and create/edit form

**Slice:** S05 — Mobil App Full Features
**Milestone:** M003

## Description

Tenants is the most complex sub-page in the mobile app. It exercises the full CRUD pattern plus nested data (rent payments, rent increases within a tenant). This task builds three screens:

1. **Tenant list** — shows active tenants and past tenants in separate sections, with name, monthly rent, lease dates, and status badge. "Yeni Kiracı" button navigates to the form.
2. **Tenant detail** — displays tenant info, a rent payments table (with mark-paid action for Pending/Late), rent increases list, and a terminate button.
3. **Tenant form** — create/edit form with all tenant fields, date inputs, currency picker, and save action.

All screens follow the established S04 pattern: `useState` for data/loading/error, `useCallback` for fetch, `ScrollView` with `RefreshControl`, `ActivityIndicator` loading, error with retry, `StyleSheet.create()` with theme tokens, `console.debug` logging.

**Relevant skills:** None specifically required — React Native screens with established patterns.

## Steps

1. **Create `gurkan-mobile/app/(tabs)/properties/tenants.tsx`** — Tenant list screen:
   - Read `propertyId` from `useLocalSearchParams<{ propertyId: string }>()`
   - Fetch all tenants via `getTenants(propertyId)` (no active filter — get all, split client-side)
   - Split into `activeTenants` (isActive=true) and `pastTenants` (isActive=false)
   - Render with `ScrollView` + `RefreshControl` (not FlatList, since we have two sections)
   - Active section: cards with fullName, monthlyRent + currency, leaseStart→leaseEnd, green "Aktif" badge
   - Past section: cards with same info but muted styling, red "Sonlanmış" badge
   - Each card is `Pressable` → `router.push({ pathname: '/(tabs)/properties/tenant-detail', params: { propertyId, tenantId: tenant.id } })`
   - "Yeni Kiracı" button at top → `router.push({ pathname: '/(tabs)/properties/tenant-form', params: { propertyId } })`
   - Empty state: centered icon + "Henüz kiracı bulunmuyor" message
   - Set `Stack.Screen options={{ title: 'Kiracılar' }}`
   - `console.debug('[tenants] fetching...')` / `'[tenants] loaded'` / `console.error('[tenants] error')`

2. **Create `gurkan-mobile/app/(tabs)/properties/tenant-detail.tsx`** — Tenant detail screen:
   - Read `propertyId` and `tenantId` from `useLocalSearchParams`
   - Fetch in parallel: `getTenant(propertyId, tenantId)`, `getRentPayments(propertyId, tenantId)`, `getRentIncreases(propertyId, tenantId)`
   - Info section: fullName, phone, email, identityNumber, leaseStart, leaseEnd, monthlyRent, deposit, currency, status badge
   - Rent Payments section: list with dueDate, amount, status badge (Paid=green, Pending=amber, Late=red, Cancelled=grey), paidDate if paid
     - For Pending/Late payments: "Ödendi İşaretle" button → calls `markPaymentPaid(propertyId, tenantId, paymentId, {})` → refresh data
   - Rent Increases section: list with effectiveDate, previousAmount→newAmount, increaseRate%, notes
   - Terminate button (only if `isActive`): red button, `Alert.alert` confirmation dialog ("Bu kiracıyı sonlandırmak istediğinize emin misiniz?"), calls `terminateTenant(propertyId, tenantId)`, navigate back on success
   - Edit button in header or top → `router.push({ pathname: '/(tabs)/properties/tenant-form', params: { propertyId, tenantId } })`
   - Set `Stack.Screen options={{ title: tenant.fullName }}`

3. **Create `gurkan-mobile/app/(tabs)/properties/tenant-form.tsx`** — Tenant create/edit form:
   - Read `propertyId` and optional `tenantId` from `useLocalSearchParams`
   - If `tenantId` present: fetch existing tenant via `getTenant()`, pre-fill form fields
   - Form fields (all with Turkish labels):
     - Ad Soyad (fullName) — required `TextInput`
     - Telefon (phone) — optional `TextInput`, `keyboardType="phone-pad"`
     - E-posta (email) — optional `TextInput`, `keyboardType="email-address"`
     - TC Kimlik No (identityNumber) — optional `TextInput`
     - Kira Başlangıcı (leaseStart) — `TextInput` with placeholder "YYYY-AA-GG"
     - Kira Bitişi (leaseEnd) — `TextInput` with placeholder "YYYY-AA-GG"
     - Aylık Kira (monthlyRent) — `TextInput`, `keyboardType="decimal-pad"`
     - Depozito (deposit) — `TextInput`, `keyboardType="decimal-pad"`
     - Para Birimi (currency) — pressable chips (TRY/USD/EUR) styled like the web's radio buttons
   - Submit: call `createTenant` or `updateTenant` based on whether `tenantId` exists
   - All date fields: append `T00:00:00Z` before sending (K012 UTC ISO rule)
   - On success: `router.back()` to navigate back to tenant list/detail
   - On error: show error message via `Alert.alert`
   - `KeyboardAvoidingView` wrapping the `ScrollView` for form usability
   - Set `Stack.Screen options={{ title: tenantId ? 'Kiracı Düzenle' : 'Yeni Kiracı' }}`
   - Add `console.debug('[tenant-form] submitting...')` / `'[tenant-form] saved'`

4. **Add formatAmount helper** if not already shared — create a small helper for Turkish money formatting: `formatAmount(amount: number, currency: string): string` using `toLocaleString('tr-TR', ...)` with currency symbol prefix. Can be added at the top of each file or in a shared utils file — keeping it in each file is fine for now (matches S04 pattern where `formatAmount` was defined locally in dashboard).

5. **Add formatDate helper** — same pattern as property detail screen. Date formatting: `new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })`.

6. **Add status badge color configs** — define `paymentStatusColors` map:
   - Paid: green (colors.success / colors.successLight)
   - Pending: amber (colors.warning / colors.warningLight)
   - Late: red (colors.critical / colors.criticalLight)
   - Cancelled: grey (colors.textTertiary / colors.surfaceElevated)
   These follow the severity badge pattern from notifications screen.

7. **Verify:** Run `cd gurkan-mobile && npx tsc --noEmit` — must pass with zero errors.

## Must-Haves

- [ ] Tenant list screen renders with active/past sections
- [ ] Tenant detail screen shows tenant info + rent payments with status badges
- [ ] Mark-paid action on Pending/Late payments calls API and refreshes data
- [ ] Terminate action shows Alert confirmation and calls terminateTenant API
- [ ] Tenant form creates new tenants and edits existing ones via API
- [ ] All date fields sent as UTC ISO strings (K012)
- [ ] Currency values are strings matching backend (K011)
- [ ] Pull-to-refresh, loading state, error+retry on all screens
- [ ] Turkish labels throughout
- [ ] `npx tsc --noEmit` passes with zero errors

## Verification

- `cd gurkan-mobile && npx tsc --noEmit` — zero errors
- `ls gurkan-mobile/app/\(tabs\)/properties/tenants.tsx gurkan-mobile/app/\(tabs\)/properties/tenant-detail.tsx gurkan-mobile/app/\(tabs\)/properties/tenant-form.tsx` — all 3 files exist
- `grep "console.debug" gurkan-mobile/app/\(tabs\)/properties/tenants.tsx` — logging present
- `grep "markPaymentPaid" gurkan-mobile/app/\(tabs\)/properties/tenant-detail.tsx` — mark-paid action present
- `grep "terminateTenant" gurkan-mobile/app/\(tabs\)/properties/tenant-detail.tsx` — terminate action present
- `grep "Alert.alert" gurkan-mobile/app/\(tabs\)/properties/tenant-detail.tsx` — confirmation dialog present

## Observability Impact

- Signals added: `console.debug('[tenants] fetching/loaded')`, `console.debug('[tenant-detail] fetching/loaded')`, `console.debug('[tenant-form] submitting/saved')`, `console.error('[tenants|tenant-detail|tenant-form] error')` — follows S04 logging convention
- How a future agent inspects this: Expo Go dev tools console shows fetch lifecycle and errors
- Failure state exposed: Error messages displayed in UI with retry button; console.error with error object on API failures

## Inputs

- `gurkan-mobile/src/api/client.ts` — T01 will have implemented `getTenants`, `getTenant`, `createTenant`, `updateTenant`, `terminateTenant`, `getRentPayments`, `markPaymentPaid`, `getRentIncreases`
- `gurkan-mobile/src/api/types.ts` — `TenantListItem`, `TenantResponse`, `CreateTenantRequest`, `UpdateTenantRequest`, `RentPaymentResponse`, `MarkPaymentPaidRequest`, `RentIncreaseResponse`, `RentPaymentStatusLabels`, `PaymentMethodLabels`, `CurrencyLabels`, `Currency`
- `gurkan-mobile/src/theme.ts` — all design tokens (colors, typography, spacing, borderRadius, shadows)
- `gurkan-mobile/app/(tabs)/properties/[id].tsx` — reference for screen pattern (loading/error/render), DetailRow component, StyleSheet structure
- `gurkan-mobile/app/(tabs)/properties/_layout.tsx` — T01 will have registered tenants, tenant-detail, tenant-form routes

## Expected Output

- `gurkan-mobile/app/(tabs)/properties/tenants.tsx` — tenant list screen with active/past sections
- `gurkan-mobile/app/(tabs)/properties/tenant-detail.tsx` — tenant detail with payments table, mark-paid, terminate
- `gurkan-mobile/app/(tabs)/properties/tenant-form.tsx` — create/edit tenant form with all fields
