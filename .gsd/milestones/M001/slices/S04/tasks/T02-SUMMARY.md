---
id: T02
parent: S04
milestone: M001
provides:
  - TypeScript types and const label objects for Expense and Bill entities (3 enum objects, 6 interfaces)
  - 11 API client functions for expense/bill CRUD + mark-bill-paid
  - 6 new React Router routes for expense/bill pages (with placeholder components)
  - "Giderler" and "Faturalar" tabs in PropertyLayout (5 tabs total)
key_files:
  - gurkan-ui/src/types/index.ts
  - gurkan-ui/src/api/client.ts
  - gurkan-ui/src/App.tsx
  - gurkan-ui/src/pages/Properties/PropertyLayout.tsx
  - gurkan-ui/src/pages/Expenses/ExpenseList.tsx
  - gurkan-ui/src/pages/Expenses/ExpenseForm.tsx
  - gurkan-ui/src/pages/Bills/BillList.tsx
  - gurkan-ui/src/pages/Bills/BillForm.tsx
key_decisions:
  - Created minimal placeholder components (ExpenseList, ExpenseForm, BillList, BillForm) to keep npm run build passing; T03 will replace them with full implementations
patterns_established:
  - Expense/bill API functions follow the same axios pattern as short-term-rentals (nested under propertyId, typed returns)
  - Tab detection uses location.pathname.includes() consistent with existing tabs
observability_surfaces:
  - PropertyLayout tabs visually confirm "Giderler" and "Faturalar" are wired at /properties/:id routes
  - Network requests to /api/properties/{id}/expenses and /api/properties/{id}/bills confirm client wiring
  - npm run build catches type mismatches between frontend types and backend DTOs
duration: 12m
verification_result: passed
completed_at: 2026-03-18T19:37Z
blocker_discovered: false
---

# T02: Wire frontend types, API client, routes, and PropertyLayout tabs

**Added TypeScript types, 11 API client functions, 6 routes, and Giderler/Faturalar tabs to PropertyLayout for expense and bill management**

## What Happened

Extended the frontend wiring layer to connect to the T01 backend:

1. **Types (`types/index.ts`):** Added 3 const enum objects (`ExpenseCategory`, `BillType`, `BillPaymentStatus`) with Turkish label records, plus 6 interfaces (`ExpenseResponse`, `CreateExpenseRequest`, `UpdateExpenseRequest`, `BillResponse`, `CreateBillRequest`, `UpdateBillRequest`). All follow the existing pattern with `as const` objects and bracket-notation label records.

2. **API client (`client.ts`):** Added 11 functions — 5 for expenses (get list with category filter, get by id, create, update, delete) and 6 for bills (get list with status filter, get by id, create, update, delete, mark paid via PATCH). All follow the existing axios pattern with typed returns.

3. **Routes (`App.tsx`):** Added 6 routes nested under the PropertyLayout wrapper — expenses (list, new, edit) and bills (list, new, edit). Created minimal placeholder components in `pages/Expenses/` and `pages/Bills/` to keep the build green until T03 replaces them.

4. **Tabs (`PropertyLayout.tsx`):** Added `isExpenses` and `isBills` route detection variables, plus two new `<Link>` elements in the tab nav bar. PropertyLayout now shows 5 tabs: Detaylar, Kiracılar, Kısa Dönem, Giderler, Faturalar.

## Verification

- `cd gurkan-ui && npm run build` — TypeScript compiles with zero errors (97 modules transformed)
- `dotnet test GurkanApi.Tests/ --filter "Category=S04"` — all 8 S04 tests pass
- `dotnet test GurkanApi.Tests/` — full regression 53/53 tests pass
- Browser: navigated to property detail → all 5 tabs visible → clicked "Giderler" → URL updated to `/expenses`, placeholder rendered → clicked "Faturalar" → URL updated to `/bills`, placeholder rendered
- `browser_assert` confirmed all 5 tab labels visible: Detaylar, Kiracılar, Kısa Dönem, Giderler, Faturalar

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `cd gurkan-ui && npm run build` | 0 | ✅ pass | 3.2s |
| 2 | `dotnet test GurkanApi.Tests/ --filter "Category=S04"` | 0 | ✅ pass | 8.1s |
| 3 | `dotnet test GurkanApi.Tests/` | 0 | ✅ pass | 15.2s |
| 4 | Browser: 5 tabs visible assertion | PASS | ✅ pass | — |
| 5 | Browser: Giderler tab navigation + placeholder | PASS | ✅ pass | — |
| 6 | Browser: Faturalar tab navigation + placeholder | PASS | ✅ pass | — |

## Diagnostics

- **Tab presence:** Navigate to any `/properties/:id` route — 5 tabs should render in `<nav class="property-tabs">`
- **API wiring:** Open browser dev tools Network tab, navigate to `/properties/:id/expenses` — should see GET request to `/api/properties/{id}/expenses`
- **Type correctness:** `npm run build` will fail if frontend types diverge from backend DTO shapes
- **Placeholder components:** `ExpenseList.tsx`, `ExpenseForm.tsx`, `BillList.tsx`, `BillForm.tsx` are minimal placeholders — T03 replaces them

## Deviations

- Created placeholder components instead of commenting out routes (plan offered both options). Chose placeholders because they keep `npm run build` clean and allow browser verification of tab navigation.

## Known Issues

None.

## Files Created/Modified

- `gurkan-ui/src/types/index.ts` — added ExpenseCategory, BillType, BillPaymentStatus enums with labels + 6 interfaces
- `gurkan-ui/src/api/client.ts` — added 11 API functions for expense and bill CRUD
- `gurkan-ui/src/App.tsx` — added 6 routes for expense/bill pages with imports
- `gurkan-ui/src/pages/Properties/PropertyLayout.tsx` — added Giderler and Faturalar tabs (5 total)
- `gurkan-ui/src/pages/Expenses/ExpenseList.tsx` — placeholder component (T03 replaces)
- `gurkan-ui/src/pages/Expenses/ExpenseForm.tsx` — placeholder component (T03 replaces)
- `gurkan-ui/src/pages/Bills/BillList.tsx` — placeholder component (T03 replaces)
- `gurkan-ui/src/pages/Bills/BillForm.tsx` — placeholder component (T03 replaces)
- `.gsd/milestones/M001/slices/S04/tasks/T02-PLAN.md` — added Observability Impact section
