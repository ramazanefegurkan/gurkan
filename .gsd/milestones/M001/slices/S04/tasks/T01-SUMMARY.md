---
id: T01
parent: S04
milestone: M001
provides:
  - Expense and Bill entities with full EF Core schema
  - ExpensesController with 5 CRUD endpoints + category filter
  - BillsController with 6 endpoints (5 CRUD + PATCH pay) + status filter
  - 3 new enums (ExpenseCategory, BillType, BillPaymentStatus)
  - 6 DTOs for expense/bill create/update/response
  - EF Core migration AddExpensesAndBills
  - 8 integration tests for S04
key_files:
  - GurkanApi/Entities/Expense.cs
  - GurkanApi/Entities/Bill.cs
  - GurkanApi/Entities/Enums.cs
  - GurkanApi/Data/ApplicationDbContext.cs
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
  - GurkanApi.Tests/IntegrationTests/TestFixture.cs
key_decisions: []
patterns_established:
  - PATCH /{id}/pay pattern for marking bills as paid (sets Status=Paid + PaidDate=UtcNow)
observability_surfaces:
  - "Expense {action}: ExpenseId={ExpenseId}, PropertyId={PropertyId}, By={UserId}" structured logs on all CRUD
  - "Bill {action}: BillId={BillId}, PropertyId={PropertyId}, By={UserId}" structured logs on all CRUD
duration: 10m
verification_result: passed
completed_at: 2026-03-18T19:47:00+03:00
blocker_discovered: false
---

# T01: Build Expense and Bill backend — entities, enums, DTOs, controllers, migration, and integration tests

**Add complete Expense and Bill backend: 2 entities, 3 enums, 6 DTOs, 2 controllers (11 endpoints total), EF migration, and 8 integration tests — all passing with full regression green at 53 tests**

## What Happened

Implemented the full backend surface for S04 expense and bill tracking, following the established ShortTermRentalsController pattern exactly:

1. Added `ExpenseCategory`, `BillType`, and `BillPaymentStatus` enums to `Enums.cs`.
2. Created `Expense` and `Bill` entities with all specified fields, navigation properties, and data annotations.
3. Updated `ApplicationDbContext` with `DbSet<Expense>` and `DbSet<Bill>` plus Fluent API configuration (decimal(18,2) for amounts, string conversions for enums, FK to Property with Cascade delete, max lengths on all string fields).
4. Created 6 DTOs: `CreateExpenseRequest`, `UpdateExpenseRequest`, `ExpenseResponse`, `CreateBillRequest`, `UpdateBillRequest`, `BillResponse`.
5. Built `ExpensesController` with 5 endpoints: GET list (with `?category=` filter, ordered by Date desc), GET by ID, POST, PUT, DELETE. All endpoints enforce group-based access via `IGroupAccessService`.
6. Built `BillsController` with 6 endpoints: GET list (with `?status=` filter, ordered by DueDate desc), GET by ID, POST, PUT, DELETE, and PATCH `{id}/pay` to mark a bill as paid. The pay endpoint sets `Status=Paid` and `PaidDate=DateTime.UtcNow`.
7. Generated EF Core migration `AddExpensesAndBills` which creates both tables with correct columns, FKs, and indexes.
8. Updated `TestFixture.cs` TRUNCATE statement to include `"Expenses"` and `"Bills"` before `"Tenants"`.
9. Wrote 8 integration tests covering: expense CRUD lifecycle, bill CRUD lifecycle, cross-group access denial for both expenses and bills, expense category filtering, bill status filtering, mark-bill-paid, and multi-currency support (EUR expense + USD bill).

## Verification

- `dotnet build GurkanApi/` — compiles clean with 0 errors
- `dotnet test GurkanApi.Tests/ --filter "Category=S04"` — all 8 S04 tests pass
- `dotnet test GurkanApi.Tests/` — all 53 tests pass (S01+S02+S03+S04), 0 failures

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `dotnet build GurkanApi/` | 0 | ✅ pass | 3.0s |
| 2 | `dotnet test GurkanApi.Tests/ --filter "Category=S04"` | 0 | ✅ pass (8/8) | 6.1s |
| 3 | `dotnet test GurkanApi.Tests/` | 0 | ✅ pass (53/53) | 15.2s |

## Slice-Level Verification Status

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | `dotnet test --filter "Category=S04"` | ✅ pass | 8/8 S04 tests pass |
| 2 | `dotnet test GurkanApi.Tests/` | ✅ pass | 53/53 full regression |
| 3 | `cd gurkan-ui && npm run build` | ⏳ pending | Frontend work in T02/T03 |
| 4 | Browser: Giderler tab | ⏳ pending | Frontend work in T03 |
| 5 | Browser: Faturalar tab | ⏳ pending | Frontend work in T03 |

## Diagnostics

- **Swagger UI**: All new endpoints visible at `/swagger/index.html` under `properties/{propertyId}/expenses` and `properties/{propertyId}/bills`
- **Structured logs**: Expense and Bill CRUD operations emit structured log messages with entity IDs and UserId
- **Error responses**: 403 `{ error: "forbidden" }` on cross-group access; 404 `{ error: "not_found" }` on missing entity
- **Test command**: `dotnet test GurkanApi.Tests/ --filter "Category=S04"` runs all S04 tests

## Deviations

None. Implementation followed the task plan exactly.

## Known Issues

None.

## Files Created/Modified

- `GurkanApi/Entities/Enums.cs` — added ExpenseCategory, BillType, BillPaymentStatus enums
- `GurkanApi/Entities/Expense.cs` — new entity with all specified fields
- `GurkanApi/Entities/Bill.cs` — new entity with all specified fields
- `GurkanApi/Data/ApplicationDbContext.cs` — added DbSets + Fluent API config for Expense and Bill
- `GurkanApi/Controllers/ExpensesController.cs` — 5 CRUD endpoints with category filter
- `GurkanApi/Controllers/BillsController.cs` — 6 endpoints (5 CRUD + PATCH pay) with status filter
- `GurkanApi/DTOs/Expenses/CreateExpenseRequest.cs` — create request DTO
- `GurkanApi/DTOs/Expenses/UpdateExpenseRequest.cs` — update request DTO
- `GurkanApi/DTOs/Expenses/ExpenseResponse.cs` — response DTO
- `GurkanApi/DTOs/Bills/CreateBillRequest.cs` — create request DTO
- `GurkanApi/DTOs/Bills/UpdateBillRequest.cs` — update request DTO
- `GurkanApi/DTOs/Bills/BillResponse.cs` — response DTO
- `GurkanApi/Migrations/20260318164631_AddExpensesAndBills.cs` — EF migration creating Expenses and Bills tables
- `GurkanApi/Migrations/20260318164631_AddExpensesAndBills.Designer.cs` — migration designer file
- `GurkanApi.Tests/IntegrationTests/ExpenseAndBillTests.cs` — 8 integration tests for S04
- `GurkanApi.Tests/IntegrationTests/TestFixture.cs` — added Expenses, Bills to TRUNCATE statement
