---
estimated_steps: 8
estimated_files: 6
---

# T03: Build short-term rental, expense, and bill screens

**Slice:** S05 — Mobil App Full Features
**Milestone:** M003

## Description

Three sub-page categories that all follow the same list+form pattern: Short-Term Rentals, Expenses, and Bills. Each has a list screen (fetch data, show cards, delete action) and a form screen (create/edit). Bills additionally has a mark-paid action. All screens follow the established S04 pattern used in the property detail and notifications screens.

Grouping these three together is efficient because each individual screen is simpler than the tenant screens — no nested data fetching, no detail screens. The list screens show items in card format, the form screens are straightforward field collections.

**Relevant skills:** None specifically required.

## Steps

1. **Create `gurkan-mobile/app/(tabs)/properties/short-term-rentals.tsx`** — Short-term rental list:
   - Read `propertyId` from `useLocalSearchParams`
   - Fetch via `getShortTermRentals(propertyId)`
   - Cards: guestName (or "İsimsiz Misafir" if null), checkIn→checkOut, nightCount + "gece", platform badge (Airbnb=orange, Booking=blue, Direct=grey), netAmount + currency
   - Delete: `Alert.alert` confirmation → `deleteShortTermRental(propertyId, rentalId)` → refetch
   - "Yeni Kayıt" button at top → `router.push({ pathname: '/(tabs)/properties/short-term-rental-form', params: { propertyId } })`
   - Edit: tap card or edit icon → `router.push({ pathname: '/(tabs)/properties/short-term-rental-form', params: { propertyId, rentalId: item.id } })`
   - Empty state: "Henüz kısa dönem kiralama kaydı yok"
   - `ScrollView` with `RefreshControl`, loading/error/retry pattern

2. **Create `gurkan-mobile/app/(tabs)/properties/short-term-rental-form.tsx`** — Short-term rental form:
   - Read `propertyId` and optional `rentalId` from `useLocalSearchParams`
   - If `rentalId`: fetch existing via `getShortTermRental(propertyId, rentalId)`, pre-fill
   - Fields (Turkish labels):
     - Misafir Adı (guestName) — optional TextInput
     - Giriş Tarihi (checkIn) — TextInput, placeholder "YYYY-AA-GG"
     - Çıkış Tarihi (checkOut) — TextInput, placeholder "YYYY-AA-GG"
     - Gecelik Ücret (nightlyRate) — TextInput, decimal-pad
     - Toplam Tutar (totalAmount) — TextInput, decimal-pad
     - Platform Komisyonu (platformFee) — TextInput, decimal-pad
     - Net Tutar (netAmount) — TextInput, decimal-pad
     - Platform — pressable chips (Airbnb / Booking / Direkt)
     - Para Birimi — pressable chips (TRY / USD / EUR)
     - Notlar (notes) — optional TextInput, multiline
   - Submit: `createShortTermRental` or `updateShortTermRental`
   - Dates: append `T00:00:00Z` before sending (K012)
   - `KeyboardAvoidingView` + `ScrollView`

3. **Create `gurkan-mobile/app/(tabs)/properties/expenses.tsx`** — Expense list:
   - Read `propertyId` from `useLocalSearchParams`
   - Fetch via `getExpenses(propertyId)`
   - Cards: category badge (colored by category — use `ExpenseCategoryLabels`), description (truncated), amount + currency, date, recurring indicator if `isRecurring`
   - Delete: `Alert.alert` confirmation → `deleteExpense(propertyId, id)` → refetch
   - "Yeni Gider" button → expense-form
   - Edit: tap → expense-form with `expenseId`
   - Category badge colors:
     - Maintenance: blue
     - Repair: orange
     - Tax: red
     - Insurance: purple
     - Management: teal
     - Other: grey

4. **Create `gurkan-mobile/app/(tabs)/properties/expense-form.tsx`** — Expense form:
   - Read `propertyId` and optional `expenseId` from `useLocalSearchParams`
   - If `expenseId`: fetch via `getExpense(propertyId, expenseId)`, pre-fill
   - Fields:
     - Kategori (category) — pressable chips with `ExpenseCategoryLabels` values
     - Açıklama (description) — required TextInput
     - Tutar (amount) — TextInput, decimal-pad
     - Para Birimi (currency) — chips (TRY/USD/EUR)
     - Tarih (date) — TextInput, "YYYY-AA-GG"
     - Tekrarlayan mı? (isRecurring) — toggle/switch
     - Tekrar Aralığı (recurrenceInterval) — TextInput, shown only if isRecurring
     - Notlar (notes) — optional TextInput, multiline
   - Submit: `createExpense` or `updateExpense`
   - Dates: UTC ISO (K012)

5. **Create `gurkan-mobile/app/(tabs)/properties/bills.tsx`** — Bill list:
   - Read `propertyId` from `useLocalSearchParams`
   - Fetch via `getBills(propertyId)`
   - Cards: type badge (colored by type — Water=blue, Electric=yellow, Gas=orange, Internet=purple, Dues=teal with `BillTypeLabels`), amount + currency, dueDate, status badge (Paid=green, Pending=amber, Overdue=red with `BillPaymentStatusLabels`)
   - Mark paid: for Pending/Overdue bills, show "Ödendi" button → `markBillPaid(propertyId, id)` → refetch
   - Delete: `Alert.alert` confirmation → `deleteBill(propertyId, id)` → refetch
   - "Yeni Fatura" button → bill-form
   - Edit: tap → bill-form with `billId`

6. **Create `gurkan-mobile/app/(tabs)/properties/bill-form.tsx`** — Bill form:
   - Read `propertyId` and optional `billId` from `useLocalSearchParams`
   - If `billId`: fetch via `getBill(propertyId, billId)`, pre-fill
   - Fields:
     - Fatura Türü (type) — pressable chips with `BillTypeLabels` values
     - Tutar (amount) — TextInput, decimal-pad
     - Para Birimi (currency) — chips (TRY/USD/EUR)
     - Son Ödeme Tarihi (dueDate) — TextInput, "YYYY-AA-GG"
     - Notlar (notes) — optional TextInput, multiline
   - Submit: `createBill` or `updateBill`
   - Dates: UTC ISO (K012)

7. **Shared patterns across all 6 screens:**
   - `useLocalSearchParams` for route params
   - `Stack.Screen options={{ title: '...' }}` for screen title
   - `console.debug('[screen-name] fetching/loaded/error')` logging
   - `formatDate` and `formatAmount` helpers (define locally in each file, matching S04 pattern)
   - `StyleSheet.create()` at bottom with theme tokens
   - Loading: centered `ActivityIndicator` with `colors.accent`
   - Error: centered error icon + message + "Tekrar Dene" button
   - Delete: `Alert.alert('Silme Onayı', 'Bu kaydı silmek istediğinize emin misiniz?', [{ text: 'İptal', style: 'cancel' }, { text: 'Sil', style: 'destructive', onPress: handleDelete }])`
   - Form submit: show submitting state (disable button, show spinner), navigate back on success

8. **Verify:** Run `cd gurkan-mobile && npx tsc --noEmit` — zero errors.

## Must-Haves

- [ ] Short-term rental list displays rentals with platform badge, amounts, delete action
- [ ] Short-term rental form creates/edits with all fields
- [ ] Expense list displays expenses with category badge, amounts, delete action
- [ ] Expense form creates/edits with category picker, recurring toggle
- [ ] Bill list displays bills with type badge, status badge, mark-paid action, delete action
- [ ] Bill form creates/edits with type picker, amount, due date
- [ ] All dates sent as UTC ISO strings (K012)
- [ ] All enum values are strings matching backend (K011)
- [ ] Pull-to-refresh, loading state, error+retry on all list screens
- [ ] Turkish labels throughout
- [ ] `npx tsc --noEmit` passes with zero errors

## Verification

- `cd gurkan-mobile && npx tsc --noEmit` — zero errors
- All 6 files exist: `ls gurkan-mobile/app/(tabs)/properties/{short-term-rentals,short-term-rental-form,expenses,expense-form,bills,bill-form}.tsx`
- `grep "markBillPaid" gurkan-mobile/app/\(tabs\)/properties/bills.tsx` — mark-paid action present
- `grep "deleteExpense\|deleteShortTermRental\|deleteBill" gurkan-mobile/app/\(tabs\)/properties/*.tsx` — delete actions present
- `grep "Alert.alert" gurkan-mobile/app/\(tabs\)/properties/bills.tsx` — confirmation dialogs present
- `grep "console.debug" gurkan-mobile/app/\(tabs\)/properties/expenses.tsx` — logging present

## Inputs

- `gurkan-mobile/src/api/client.ts` — T01 implemented all API functions: `getShortTermRentals`, `getShortTermRental`, `createShortTermRental`, `updateShortTermRental`, `deleteShortTermRental`, `getExpenses`, `getExpense`, `createExpense`, `updateExpense`, `deleteExpense`, `getBills`, `getBill`, `createBill`, `updateBill`, `deleteBill`, `markBillPaid`
- `gurkan-mobile/src/api/types.ts` — `ShortTermRentalResponse`, `CreateShortTermRentalRequest`, `UpdateShortTermRentalRequest`, `RentalPlatformLabels`, `ExpenseResponse`, `CreateExpenseRequest`, `UpdateExpenseRequest`, `ExpenseCategoryLabels`, `BillResponse`, `CreateBillRequest`, `UpdateBillRequest`, `BillTypeLabels`, `BillPaymentStatusLabels`, `CurrencyLabels`, `Currency`
- `gurkan-mobile/src/theme.ts` — design tokens
- `gurkan-mobile/app/(tabs)/properties/[id].tsx` — reference for screen pattern, DetailRow component
- `gurkan-mobile/app/(tabs)/properties/tenants.tsx` — T02's tenant list as reference for list screen pattern
- `gurkan-mobile/app/(tabs)/properties/tenant-form.tsx` — T02's tenant form as reference for form screen pattern

## Observability Impact

- **New console.debug signals:** `[short-term-rentals]`, `[short-term-rental-form]`, `[expenses]`, `[expense-form]`, `[bills]`, `[bill-form]` — each screen emits fetch/loaded/error lifecycle events plus action-specific logs (delete, mark-paid, submit)
- **Inspection:** Expo Go console shows all debug messages; network inspector shows API calls to `/properties/{id}/short-term-rentals`, `/properties/{id}/expenses`, `/properties/{id}/bills` endpoints
- **Failure visibility:** `console.error('[screen] error/delete error/mark paid error', err)` on all API failures; user-facing Turkish error messages with Alert.alert and retry buttons
- **Delete flow:** `[short-term-rentals] deleting: {id}` → `[short-term-rentals] deleted` (same pattern for expenses, bills)
- **Mark-paid flow:** `[bills] marking paid: {id}` → `[bills] marked paid`
- **Form submission:** `[expense-form] submitting...` → `[expense-form] saved` (same pattern for short-term-rental-form, bill-form)

## Expected Output

- `gurkan-mobile/app/(tabs)/properties/short-term-rentals.tsx` — rental list with platform badges
- `gurkan-mobile/app/(tabs)/properties/short-term-rental-form.tsx` — rental create/edit form
- `gurkan-mobile/app/(tabs)/properties/expenses.tsx` — expense list with category badges
- `gurkan-mobile/app/(tabs)/properties/expense-form.tsx` — expense create/edit form
- `gurkan-mobile/app/(tabs)/properties/bills.tsx` — bill list with mark-paid action
- `gurkan-mobile/app/(tabs)/properties/bill-form.tsx` — bill create/edit form
