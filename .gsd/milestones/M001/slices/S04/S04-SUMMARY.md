---
id: S04
parent: M001
milestone: M001
provides:
  - Expense entity with CRUD API (category, amount, currency, recurring support)
  - Bill entity with CRUD API + PATCH pay endpoint (type, amount, due date, payment status)
  - ExpensesController: 5 endpoints nested under /api/properties/{propertyId}/expenses
  - BillsController: 6 endpoints nested under /api/properties/{propertyId}/bills (5 CRUD + PATCH pay)
  - 3 new enums (ExpenseCategory, BillType, BillPaymentStatus)
  - 6 DTOs for expense/bill create/update/response
  - EF Core migration AddExpensesAndBills
  - 8 S04 integration tests (CRUD, access control, filtering, multi-currency, mark-paid)
  - Frontend ExpenseList/ExpenseForm pages with category badges and recurring toggle
  - Frontend BillList/BillForm pages with status badges and "Ödendi" action button
  - "Giderler" and "Faturalar" tabs in PropertyLayout (5 tabs total)
  - 11 API client functions for expense/bill CRUD + mark-bill-paid
  - 6 TypeScript interfaces + 3 const enum objects with Turkish labels
requires:
  - slice: S01
    provides: JWT auth middleware, group membership
  - slice: S02
    provides: Property entity, IGroupAccessService, PropertyLayout, Currency enum
  - slice: S03
    provides: PropertyLayout tab navigation pattern, toUtcIso() helper
affects:
  - S06
key_files:
  - GurkanApi/Entities/Expense.cs
  - GurkanApi/Entities/Bill.cs
  - GurkanApi/Entities/Enums.cs
  - GurkanApi/Controllers/ExpensesController.cs
  - GurkanApi/Controllers/BillsController.cs
  - GurkanApi/DTOs/Expenses/CreateExpenseRequest.cs
  - GurkanApi/DTOs/Expenses/UpdateExpenseRequest.cs
  - GurkanApi/DTOs/Expenses/ExpenseResponse.cs
  - GurkanApi/DTOs/Bills/CreateBillRequest.cs
  - GurkanApi/DTOs/Bills/UpdateBillRequest.cs
  - GurkanApi/DTOs/Bills/BillResponse.cs
  - GurkanApi/Migrations/20260318164631_AddExpensesAndBills.cs
  - GurkanApi.Tests/IntegrationTests/ExpenseAndBillTests.cs
  - gurkan-ui/src/pages/Expenses/ExpenseList.tsx
  - gurkan-ui/src/pages/Expenses/ExpenseForm.tsx
  - gurkan-ui/src/pages/Expenses/Expenses.css
  - gurkan-ui/src/pages/Bills/BillList.tsx
  - gurkan-ui/src/pages/Bills/BillForm.tsx
  - gurkan-ui/src/pages/Bills/Bills.css
  - gurkan-ui/src/types/index.ts
  - gurkan-ui/src/api/client.ts
  - gurkan-ui/src/App.tsx
  - gurkan-ui/src/pages/Properties/PropertyLayout.tsx
key_decisions:
  - Fixed API client baseURL from port 5000 to 5039 matching launchSettings.json (K014)
patterns_established:
  - PATCH /{id}/pay pattern for marking bills as paid (sets Status=Paid + PaidDate=UtcNow)
  - Category and bill-type badges use separate CSS class families (.category-badge--, .bill-type-badge--) alongside existing .status-badge-- for payment status
  - Expense/bill controllers follow same nested-resource pattern as ShortTermRentalsController
observability_surfaces:
  - "Expense {action}: ExpenseId={ExpenseId}, PropertyId={PropertyId}, By={UserId}" structured logs on all CRUD
  - "Bill {action}: BillId={BillId}, PropertyId={PropertyId}, By={UserId}" structured logs on all CRUD
  - Swagger UI at /swagger/index.html shows all new endpoints
  - dotnet test --filter "Category=S04" runs all 8 S04 integration tests
  - Summary cards in UI display TOPLAM GİDER/FATURA totals and BEKLEYEN count
drill_down_paths:
  - .gsd/milestones/M001/slices/S04/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S04/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001/slices/S04/tasks/T03-SUMMARY.md
duration: 40m
verification_result: passed
completed_at: 2026-03-18T19:37:48+03:00
---

# S04: Gider & Fatura Takibi

**Property-scoped expense and bill tracking with full CRUD, category/status badges, recurring expense support, mark-bill-paid action, and group-based access control — 11 API endpoints, 8 integration tests, 4 frontend pages**

## What Happened

S04 delivered property-scoped expense and bill management in three tasks:

**T01 (Backend)** built the complete API surface: 2 entities (Expense, Bill), 3 enums (ExpenseCategory with 6 values, BillType with 5, BillPaymentStatus with 3), 6 DTOs, and 2 controllers. ExpensesController provides 5 CRUD endpoints with category filtering (ordered by Date desc). BillsController provides 6 endpoints — 5 CRUD with status filtering (ordered by DueDate desc) plus a PATCH `{id}/pay` endpoint that atomically sets Status=Paid and PaidDate=UtcNow. Both controllers enforce group-based access via IGroupAccessService. EF migration `AddExpensesAndBills` creates both tables with decimal(18,2) amounts, string enum conversions, and cascade-delete FK to Property. 8 integration tests cover: CRUD lifecycle, cross-group access denial, category/status filtering, mark-bill-paid, and multi-currency (EUR expense + USD bill).

**T02 (Frontend Wiring)** added TypeScript types (3 const enum objects with Turkish labels, 6 interfaces), 11 API client functions following the established axios pattern, 6 React Router routes nested under PropertyLayout, and "Giderler" / "Faturalar" tab links — bringing PropertyLayout to 5 tabs total.

**T03 (Frontend Pages)** replaced the T02 placeholders with full implementations. ExpenseList shows a data table with category badges (6 color variants), summary card, and delete confirmation. ExpenseForm supports create/edit with category dropdown, currency, date, recurring toggle that conditionally reveals recurrence interval. BillList shows status badges (Bekliyor=yellow, Ödendi=green, Gecikmiş=red) with an "Ödendi" action button that calls markBillPaid and refreshes in-place. BillForm is a create/edit form with bill type, amount, currency, due date. T03 also fixed a latent port mismatch in the API client (5000→5039 per launchSettings.json, recorded as K014).

## Verification

| # | Check | Result |
|---|-------|--------|
| 1 | `dotnet test GurkanApi.Tests/ --filter "Category=S04"` | ✅ 8/8 pass |
| 2 | `dotnet test GurkanApi.Tests/` (full regression) | ✅ 53/53 pass (S01+S02+S03+S04) |
| 3 | `cd gurkan-ui && npm run build` | ✅ 0 errors, 99 modules |
| 4 | Browser: Expense add → edit → delete | ✅ pass |
| 5 | Browser: Bill add → mark paid → edit → delete | ✅ pass |
| 6 | Browser: 5 tabs visible in PropertyLayout | ✅ pass |
| 7 | Browser: Status badge transitions (pending → paid) | ✅ pass |

## Requirements Advanced

- R008 (Gider takibi) — Full expense CRUD with 6 categories, recurring support, multi-currency, group access control. All backend integration tests pass and frontend UI verified in browser.
- R009 (Fatura takibi) — Full bill CRUD with 5 bill types, due date tracking, payment status (Pending/Paid/Overdue), mark-as-paid action. Backend and frontend verified.
- R014 (Multi-currency) — Expenses and bills support TRY/USD/EUR currency selection, tested with EUR expense + USD bill in integration tests.

## Requirements Validated

- R008 — Expense CRUD works end-to-end: API endpoints tested (8 integration tests covering create, read, update, delete, category filter, cross-group denial, multi-currency), frontend pages browser-verified (add, edit, delete with category badges and summary card).
- R009 — Bill CRUD + payment tracking works end-to-end: API endpoints tested (CRUD, status filter, mark-paid, cross-group denial), frontend browser-verified (add, mark paid with status badge transition, edit, delete).

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

- Fixed API client `baseURL` port from 5000 to 5039 (K014). This was a latent bug from S02/T03 that only manifested when browser-verified CRUD was first attempted against the real backend. Not a plan deviation — it was a pre-existing defect fixed during execution.

## Known Limitations

- Overdue status is set at bill creation time — there is no background job that automatically transitions Pending bills to Overdue when DueDate passes. S06 notification logic could address this.
- Recurring expenses have an `IsRecurring` flag and `RecurrenceInterval` field but no automatic generation of future expense records. This is informational metadata only.
- No pagination on expense/bill list endpoints — adequate for family use but would need pagination for large datasets.

## Follow-ups

- S06 should consume Expense and Bill entities for dashboard aggregation (total expenses, pending bills) and notification generation (upcoming due dates).
- Overdue bill auto-detection could be added in S06's notification logic (query bills where DueDate < now AND Status == Pending).

## Files Created/Modified

- `GurkanApi/Entities/Expense.cs` — Expense entity with PropertyId, Category, Amount, Currency, IsRecurring, RecurrenceInterval
- `GurkanApi/Entities/Bill.cs` — Bill entity with PropertyId, Type, Amount, Currency, DueDate, PaidDate, Status
- `GurkanApi/Entities/Enums.cs` — added ExpenseCategory (6 values), BillType (5 values), BillPaymentStatus (3 values)
- `GurkanApi/Data/ApplicationDbContext.cs` — added DbSets + Fluent API for Expense and Bill
- `GurkanApi/Controllers/ExpensesController.cs` — 5 CRUD endpoints with category filter + group access
- `GurkanApi/Controllers/BillsController.cs` — 6 endpoints (5 CRUD + PATCH pay) with status filter + group access
- `GurkanApi/DTOs/Expenses/CreateExpenseRequest.cs` — create request DTO
- `GurkanApi/DTOs/Expenses/UpdateExpenseRequest.cs` — update request DTO
- `GurkanApi/DTOs/Expenses/ExpenseResponse.cs` — response DTO
- `GurkanApi/DTOs/Bills/CreateBillRequest.cs` — create request DTO
- `GurkanApi/DTOs/Bills/UpdateBillRequest.cs` — update request DTO
- `GurkanApi/DTOs/Bills/BillResponse.cs` — response DTO
- `GurkanApi/Migrations/20260318164631_AddExpensesAndBills.cs` — EF migration creating Expenses and Bills tables
- `GurkanApi.Tests/IntegrationTests/ExpenseAndBillTests.cs` — 8 integration tests for S04
- `GurkanApi.Tests/IntegrationTests/TestFixture.cs` — added Expenses, Bills to TRUNCATE
- `gurkan-ui/src/types/index.ts` — added 3 enum objects + 6 interfaces for expense/bill types
- `gurkan-ui/src/api/client.ts` — added 11 API functions + fixed baseURL port to 5039
- `gurkan-ui/src/App.tsx` — added 6 routes for expense/bill pages
- `gurkan-ui/src/pages/Properties/PropertyLayout.tsx` — added Giderler and Faturalar tabs
- `gurkan-ui/src/pages/Expenses/ExpenseList.tsx` — expense list with category badges, summary card, delete confirmation
- `gurkan-ui/src/pages/Expenses/ExpenseForm.tsx` — expense create/edit form with recurring toggle
- `gurkan-ui/src/pages/Expenses/Expenses.css` — category badge styles (6 color variants)
- `gurkan-ui/src/pages/Bills/BillList.tsx` — bill list with status badges, "Ödendi" action, delete confirmation
- `gurkan-ui/src/pages/Bills/BillForm.tsx` — bill create/edit form
- `gurkan-ui/src/pages/Bills/Bills.css` — bill type badges, status badge overrides, pay button style

## Forward Intelligence

### What the next slice should know
- S04 produces `Expense` and `Bill` entities with full CRUD endpoints at `/api/properties/{propertyId}/expenses` and `/api/properties/{propertyId}/bills`. S06 needs these for dashboard aggregation (total expenses by property, pending bills count) and notification generation (bills approaching due date).
- Bill entity has a `Status` field (Pending/Paid/Overdue) and `DueDate` — S06 can query `Status != Paid && DueDate < threshold` for due-date notifications.
- Expense entity has `Category` enum (Maintenance/Repair/Tax/Insurance/Management/Other) — useful for S06 expense breakdown charts.
- Both entities have `Currency` field — S06 must handle multi-currency aggregation (group by currency, no conversion).

### What's fragile
- The API client `baseURL` was silently wrong (port 5000 vs 5039) for two slices before T03 caught it — any future port changes in `launchSettings.json` won't be caught by `npm run build`, only by browser testing.
- Overdue detection is not automatic — bills created as Pending stay Pending forever unless manually marked paid or the frontend/backend adds a time-based check.

### Authoritative diagnostics
- `dotnet test GurkanApi.Tests/ --filter "Category=S04"` — 8 tests cover all S04 contract boundaries (CRUD, access control, filtering, pay, multi-currency)
- Swagger UI at `/swagger/index.html` — shows all 11 new endpoints under expenses and bills sections
- Browser: property detail → Giderler/Faturalar tabs — confirms end-to-end wiring

### What assumptions changed
- API client port assumption (5000) was wrong since S02 — actually 5039 per launchSettings.json (now fixed, K014)
