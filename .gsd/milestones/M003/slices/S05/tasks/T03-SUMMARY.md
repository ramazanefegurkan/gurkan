---
id: T03
parent: S05
milestone: M003
provides:
  - Short-term rental list screen with platform badges (Airbnb/Booking/Direct) and delete action
  - Short-term rental create/edit form with platform and currency chips
  - Expense list screen with category badges and recurring indicator
  - Expense create/edit form with category picker and recurring toggle
  - Bill list screen with type badge, status badge, and mark-paid action
  - Bill create/edit form with type picker
key_files:
  - gurkan-mobile/app/(tabs)/properties/short-term-rentals.tsx
  - gurkan-mobile/app/(tabs)/properties/short-term-rental-form.tsx
  - gurkan-mobile/app/(tabs)/properties/expenses.tsx
  - gurkan-mobile/app/(tabs)/properties/expense-form.tsx
  - gurkan-mobile/app/(tabs)/properties/bills.tsx
  - gurkan-mobile/app/(tabs)/properties/bill-form.tsx
key_decisions:
  - Used local formatAmount/formatDate helpers per file (matches S04/T02 pattern — no shared util module)
  - Platform badge colors: Airbnb=#FF5A5F, Booking=#003580, Direct=grey (matches real brand colors)
  - Category/type badge colors use hex+20 opacity suffix for backgrounds (consistent with tenant status badges)
patterns_established:
  - List+form CRUD screen pattern: list screen with cards, delete via Alert.alert, add/edit navigation; form screen with chips for enums, date as text input with YYYY-AA-GG placeholder, UTC ISO append on submit
  - Mark-paid action pattern: inline button on Pending/Overdue items, direct API call without confirmation dialog (quick action)
  - Recurring expense toggle: Switch component with conditional recurrenceInterval field visibility
observability_surfaces:
  - console.debug('[short-term-rentals]') — fetch/loaded/error/delete lifecycle
  - console.debug('[expenses]') — fetch/loaded/error/delete lifecycle
  - console.debug('[bills]') — fetch/loaded/error/delete/mark-paid lifecycle
  - console.debug('[short-term-rental-form]') — fetch/submit/saved lifecycle
  - console.debug('[expense-form]') — fetch/submit/saved lifecycle
  - console.debug('[bill-form]') — fetch/submit/saved lifecycle
duration: 15m
verification_result: passed
completed_at: 2026-03-18T22:51:00Z
blocker_discovered: false
---

# T03: Build short-term rental, expense, and bill screens

**Built 6 screens (3 list + 3 form) for short-term rentals, expenses, and bills — all TypeScript-clean with platform/category/status badges, delete actions, mark-paid for bills, and consistent CRUD patterns**

## What Happened

Created all 6 screens following the established list+form pattern from T02's tenant screens:

1. **short-term-rentals.tsx** — List screen with guest name (or "İsimsiz Misafir" fallback), check-in→check-out dates, night count badge, platform badge (Airbnb=red, Booking=blue, Direct=grey), net amount, and delete with Alert.alert confirmation. "Yeni Kayıt" button navigates to form.

2. **short-term-rental-form.tsx** — Create/edit form with fields for guest name, check-in/check-out dates, nightly rate, total amount, platform fee, net amount, platform chips (Airbnb/Booking/Direkt), currency chips (TRY/USD/EUR), and notes. Dates appended with `T00:00:00Z` per K012.

3. **expenses.tsx** — List screen with category badge (Maintenance=blue, Repair=orange, Tax=red, Insurance=purple, Management=teal, Other=grey), description (truncated), amount, date, and recurring indicator with repeat icon. Delete with confirmation.

4. **expense-form.tsx** — Create/edit form with category chips from ExpenseCategoryLabels, description, amount, currency, date, recurring toggle (Switch), conditional recurrence interval field, and notes.

5. **bills.tsx** — List screen with type badge (Water=blue, Electric=yellow, Gas=orange, Internet=purple, Dues=teal), status badge (Paid=green, Pending=amber, Overdue=red), amount, due date. Mark-paid "Ödendi" button on Pending/Overdue bills calls markBillPaid API. Delete with confirmation.

6. **bill-form.tsx** — Create/edit form with bill type chips from BillTypeLabels, amount, currency, due date, and notes.

All screens follow shared patterns: `useLocalSearchParams` for route params, `Stack.Screen` title, console.debug lifecycle logging, formatDate/formatAmount local helpers, StyleSheet with theme tokens, loading/error/empty states, and pull-to-refresh on list screens.

## Verification

- `npx tsc --noEmit` — zero errors (all 6 new files type-check clean)
- All 6 files exist at expected paths
- `markBillPaid` imported and called in bills.tsx
- `deleteExpense`, `deleteShortTermRental`, `deleteBill` all present in respective list screens
- `Alert.alert` confirmation dialogs present in all list screens
- `console.debug` lifecycle logging present in all 6 screens
- Web-only API leak check: only pre-existing localStorage refs in storage helpers (inside Platform.OS === 'web' guards), no new leaks
- 47 API client functions exported (unchanged from T01)

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd gurkan-mobile && npx tsc --noEmit` | 0 | ✅ pass | 14.8s |
| 2 | `ls gurkan-mobile/app/(tabs)/properties/{short-term-rentals,short-term-rental-form,expenses,expense-form,bills,bill-form}.tsx` | 0 | ✅ pass | <1s |
| 3 | `grep "markBillPaid" gurkan-mobile/app/(tabs)/properties/bills.tsx` | 0 | ✅ pass | <1s |
| 4 | `grep "deleteExpense\|deleteShortTermRental\|deleteBill" gurkan-mobile/app/(tabs)/properties/*.tsx` | 0 | ✅ pass | <1s |
| 5 | `grep "Alert.alert" gurkan-mobile/app/(tabs)/properties/bills.tsx` | 0 | ✅ pass | <1s |
| 6 | `grep "console.debug" gurkan-mobile/app/(tabs)/properties/expenses.tsx` | 0 | ✅ pass | <1s |
| 7 | Web-only API leak grep (slice-level) | 0 | ✅ pass (only pre-existing localStorage in Platform.OS==='web' guards) | <1s |
| 8 | API function count: 47 | 0 | ✅ pass | <1s |

## Diagnostics

- **Runtime logging**: All 6 screens emit `console.debug` on fetch start/complete/error and action events — visible in Expo Go dev tools console
- **Network inspector**: Expo Go shows API calls to `/properties/{id}/short-term-rentals`, `/properties/{id}/expenses`, `/properties/{id}/bills` endpoints
- **Delete flow**: `[short-term-rentals] deleting: {id}` → `[short-term-rentals] deleted` in console (same for expenses, bills)
- **Mark-paid flow**: `[bills] marking paid: {id}` → `[bills] marked paid` in console
- **Form submission**: `[expense-form] submitting...` → `[expense-form] saved` in console (same for short-term-rental-form, bill-form)
- **Error visibility**: `console.error('[screen] error', err)` on all API failures with full error object

## Deviations

None — all 6 screens built exactly as specified in the task plan.

## Known Issues

None.

## Files Created/Modified

- `gurkan-mobile/app/(tabs)/properties/short-term-rentals.tsx` — Short-term rental list with platform badges, delete action, pull-to-refresh
- `gurkan-mobile/app/(tabs)/properties/short-term-rental-form.tsx` — Short-term rental create/edit form with platform and currency chips
- `gurkan-mobile/app/(tabs)/properties/expenses.tsx` — Expense list with category badges, recurring indicator, delete action
- `gurkan-mobile/app/(tabs)/properties/expense-form.tsx` — Expense create/edit form with category chips and recurring toggle
- `gurkan-mobile/app/(tabs)/properties/bills.tsx` — Bill list with type/status badges, mark-paid action, delete action
- `gurkan-mobile/app/(tabs)/properties/bill-form.tsx` — Bill create/edit form with type chips
- `.gsd/milestones/M003/slices/S05/tasks/T03-PLAN.md` — Added Observability Impact section (pre-flight fix)
