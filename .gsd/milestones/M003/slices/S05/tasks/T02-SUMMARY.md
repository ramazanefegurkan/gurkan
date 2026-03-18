---
id: T02
parent: S05
milestone: M003
provides:
  - Tenant list screen with active/past sections and navigation
  - Tenant detail screen with rent payments (mark-paid action) and rent increases
  - Tenant form screen for create/edit with all fields, currency chips, date inputs
key_files:
  - gurkan-mobile/app/(tabs)/properties/tenants.tsx
  - gurkan-mobile/app/(tabs)/properties/tenant-detail.tsx
  - gurkan-mobile/app/(tabs)/properties/tenant-form.tsx
key_decisions:
  - Defined formatAmount/formatDate locally in each file (matches S04 pattern where helpers were local to dashboard)
  - Used paymentStatusColors map with theme semantic tokens (success/warning/critical) for rent payment status badges
  - Currency chips use Pressable with border+background highlight, not radio buttons
patterns_established:
  - Tenant CRUD screen pattern: list→detail→form with consistent loading/error/empty states and pull-to-refresh
  - Payment mark-paid pattern: inline button on Pending/Late items, optimistic refresh via fetchData(true)
  - Terminate tenant pattern: Alert.alert confirmation → API call → router.back()
  - Date field K012 pattern: TextInput with YYYY-AA-GG placeholder, append T00:00:00Z before API submission
observability_surfaces:
  - "console.debug('[tenants] fetching/loaded')" — tenant list fetch lifecycle
  - "console.debug('[tenant-detail] fetching/loaded')" — tenant detail fetch lifecycle  
  - "console.debug('[tenant-form] submitting/saved')" — form submission lifecycle
  - "console.error('[tenants|tenant-detail|tenant-form] error')" — error logging with error object
duration: 10 minutes
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T02: Build tenant screens — list, detail with payments, and create/edit form

**Built 3 tenant screens (list with active/past sections, detail with rent payments & mark-paid + rent increases & terminate, create/edit form with currency chips) — all TypeScript-clean**

## What Happened

Created three tenant management screens following the established S04 screen pattern:

1. **tenants.tsx** (list): Fetches all tenants via `getTenants(propertyId)`, splits into active/past sections client-side. Active tenants show green "Aktif" badge, past tenants show red "Sonlanmış" badge with muted styling. Each card displays fullName, monthly rent with currency, lease dates. "Yeni Kiracı" button navigates to form. Empty state with icon + message.

2. **tenant-detail.tsx** (detail): Parallel-fetches tenant info, rent payments, and rent increases via `Promise.all`. Info section with all tenant fields. Payments section with status badges (Paid=green, Pending=amber, Late=red, Cancelled=grey) and "Ödendi İşaretle" button for Pending/Late payments that calls `markPaymentPaid` and refreshes. Rent increases section showing effectiveDate, previousAmount→newAmount, rate%. Edit button navigates to form. Terminate button (active tenants only) shows Alert.alert confirmation dialog before calling `terminateTenant`.

3. **tenant-form.tsx** (form): Create/edit form with all fields (fullName, phone, email, identityNumber, leaseStart, leaseEnd, monthlyRent, deposit). Currency selection via pressable chips (TRY/USD/EUR). Date fields use YYYY-AA-GG placeholder and append T00:00:00Z before submission (K012). KeyboardAvoidingView wraps ScrollView. Pre-fills fields in edit mode.

## Verification

All task-level and slice-level checks pass:

- `npx tsc --noEmit` — zero TypeScript errors
- All 3 screen files exist at expected paths
- `console.debug` logging confirmed in all screens
- `markPaymentPaid`, `terminateTenant`, `Alert.alert` all confirmed in tenant-detail
- No web-only API leaks in new screens
- 47 API client functions exported (unchanged from T01)

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd gurkan-mobile && npx tsc --noEmit` | 0 | ✅ pass | 3.0s |
| 2 | `ls tenants.tsx tenant-detail.tsx tenant-form.tsx` | 0 | ✅ pass | <1s |
| 3 | `grep "console.debug" tenants.tsx` | 0 | ✅ pass | <1s |
| 4 | `grep "markPaymentPaid" tenant-detail.tsx` | 0 | ✅ pass | <1s |
| 5 | `grep "terminateTenant" tenant-detail.tsx` | 0 | ✅ pass | <1s |
| 6 | `grep "Alert.alert" tenant-detail.tsx` | 0 | ✅ pass | <1s |
| 7 | web-only API leak check | 0 | ✅ pass (hits are pre-existing storage adapters) | <1s |

## Diagnostics

- **Runtime logging**: All screens emit `console.debug` on fetch start/complete and `console.error` on failures — visible in Expo Go dev tools console
- **Network inspector**: Expo Go shows API calls to `/properties/{id}/tenants`, `/tenants/{id}`, `/rent-payments`, `/rent-increases`, `/pay`, `/terminate`
- **Mark-paid flow**: `[tenant-detail] marking payment paid: {id}` → `[tenant-detail] payment marked paid` in console
- **Terminate flow**: `[tenant-detail] terminating tenant: {id}` → `[tenant-detail] tenant terminated` in console
- **Form submission**: `[tenant-form] submitting...` → `[tenant-form] saved` in console

## Deviations

None — implemented exactly as planned.

## Known Issues

None.

## Files Created/Modified

- `gurkan-mobile/app/(tabs)/properties/tenants.tsx` — Tenant list screen with active/past sections, pull-to-refresh, empty state
- `gurkan-mobile/app/(tabs)/properties/tenant-detail.tsx` — Tenant detail with info, rent payments (mark-paid), rent increases, terminate action
- `gurkan-mobile/app/(tabs)/properties/tenant-form.tsx` — Create/edit tenant form with all fields, currency chips, K012 date handling
