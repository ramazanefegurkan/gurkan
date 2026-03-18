---
estimated_steps: 9
estimated_files: 12
---

# T01: Build Expense and Bill backend — entities, enums, DTOs, controllers, migration, and integration tests

**Slice:** S04 — Gider & Fatura Takibi
**Milestone:** M001

## Description

Create the complete backend for expense and bill tracking: two new entities, three new enums, six DTOs, two controllers with full CRUD, EF Core migration, and integration tests. This follows the exact same pattern as ShortTermRentalsController from S03 — nested routes under `/api/properties/{propertyId}/...`, property access check via `IGroupAccessService`, Currency field per record, structured log messages.

**Relevant skill:** Load `test` skill for integration test patterns if needed.

## Steps

1. **Add 3 new enums to `GurkanApi/Entities/Enums.cs`:**
   - `ExpenseCategory { Maintenance, Repair, Tax, Insurance, Management, Other }`
   - `BillType { Water, Electric, Gas, Internet, Dues }`
   - `BillPaymentStatus { Pending, Paid, Overdue }`

2. **Create `GurkanApi/Entities/Expense.cs`:**
   ```
   Id: Guid, PropertyId: Guid, Category: ExpenseCategory, Description: string (required, max 500),
   Amount: decimal, Currency: Currency, Date: DateTime, IsRecurring: bool,
   RecurrenceInterval: string? (max 50), Notes: string? (max 2000), CreatedAt: DateTime
   Navigation: Property Property
   ```

3. **Create `GurkanApi/Entities/Bill.cs`:**
   ```
   Id: Guid, PropertyId: Guid, Type: BillType, Amount: decimal, Currency: Currency,
   DueDate: DateTime, PaidDate: DateTime?, Status: BillPaymentStatus,
   Notes: string? (max 2000), CreatedAt: DateTime
   Navigation: Property Property
   ```

4. **Update `GurkanApi/Data/ApplicationDbContext.cs`:**
   - Add `DbSet<Expense> Expenses` and `DbSet<Bill> Bills`
   - Add Fluent API config in `OnModelCreating` following ShortTermRental pattern:
     - Expense: decimal(18,2) for Amount, string conversion for Category and Currency enums, FK to Property with Cascade delete, required Description with max length 500, optional Notes max 2000, optional RecurrenceInterval max 50
     - Bill: decimal(18,2) for Amount, string conversion for Type, Currency, and Status enums, FK to Property with Cascade delete, optional Notes max 2000

5. **Create DTOs in `GurkanApi/DTOs/Expenses/` and `GurkanApi/DTOs/Bills/`:**
   - `CreateExpenseRequest`: Category, Description (required), Amount, Currency, Date, IsRecurring, RecurrenceInterval, Notes
   - `UpdateExpenseRequest`: same fields as create
   - `ExpenseResponse`: all entity fields mapped
   - `CreateBillRequest`: Type, Amount, Currency, DueDate, Notes
   - `UpdateBillRequest`: Type, Amount, Currency, DueDate, Notes (not Status or PaidDate — those via pay endpoint)
   - `BillResponse`: all entity fields mapped

6. **Create `GurkanApi/Controllers/ExpensesController.cs`:**
   - Route: `api/properties/{propertyId:guid}/expenses`
   - Copy ShortTermRentalsController pattern exactly: constructor DI (DbContext, IGroupAccessService, ILogger), `CheckPropertyAccess` helper
   - GET list: query `_db.Expenses.Where(e => e.PropertyId == propertyId)`, optional `?category=` filter, order by Date descending
   - GET {id}: single expense by id, verify PropertyId matches
   - POST: create with `CreatedAt = DateTime.UtcNow`, return 201
   - PUT {id}: update all fields, return 200
   - DELETE {id}: remove, return 204
   - Structured logs: `"Expense {Action}: ExpenseId={ExpenseId}, PropertyId={PropertyId}, By={UserId}"`

7. **Create `GurkanApi/Controllers/BillsController.cs`:**
   - Route: `api/properties/{propertyId:guid}/bills`
   - Same pattern as ExpensesController
   - GET list: optional `?status=` filter, order by DueDate descending
   - GET {id}, POST, PUT {id}, DELETE {id}: standard CRUD
   - PATCH {id}/pay: set Status=Paid, PaidDate=DateTime.UtcNow, return 200
   - Structured logs: `"Bill {Action}: BillId={BillId}, PropertyId={PropertyId}, By={UserId}"`

8. **Generate EF migration:**
   - Run: `dotnet ef migrations add AddExpensesAndBills --project GurkanApi`
   - Verify migration creates Expenses and Bills tables with correct columns and FKs
   - Run: `dotnet build` to confirm everything compiles

9. **Update TestFixture and write integration tests:**
   - In `GurkanApi.Tests/IntegrationTests/TestFixture.cs`: add `"Expenses", "Bills"` to the TRUNCATE statement — insert them BEFORE `"PropertyNotes"` (they reference Properties, so must be truncated before Properties)
   - Create `GurkanApi.Tests/IntegrationTests/ExpenseAndBillTests.cs` with `[Trait("Category", "S04")]`:
     - Test expense CRUD (create 201, get 200, update 200, delete 204)
     - Test bill CRUD (create 201, get 200, update 200, delete 204)
     - Test cross-group access denial (403) for both expense and bill
     - Test expense category filter (`?category=Tax` returns only Tax expenses)
     - Test bill status filter (`?status=Pending` returns only pending bills)
     - Test mark-bill-paid (PATCH returns 200, PaidDate set, Status=Paid)
     - Test multi-currency (create expense with EUR, bill with USD, verify currency in response)
   - Test setup follows TenantTests pattern: `IClassFixture<CustomWebApplicationFactory>`, `IAsyncLifetime`, login as admin, create group + property before each test class

## Must-Haves

- [ ] ExpenseCategory, BillType, BillPaymentStatus enums added to Enums.cs
- [ ] Expense and Bill entities with all specified fields and navigation properties
- [ ] ApplicationDbContext has DbSets and Fluent API config for both entities
- [ ] ExpensesController with 5 CRUD endpoints + category filter
- [ ] BillsController with 5 CRUD endpoints + status filter + PATCH pay
- [ ] All endpoints enforce group-based access control via IGroupAccessService
- [ ] EF Core migration generated and `dotnet build` passes
- [ ] TestFixture TRUNCATE updated with new tables
- [ ] Integration tests pass with `dotnet test --filter "Category=S04"`
- [ ] Full regression passes with `dotnet test GurkanApi.Tests/`

## Verification

- `dotnet build GurkanApi/` — compiles clean
- `dotnet test GurkanApi.Tests/ --filter "Category=S04"` — all S04 tests pass
- `dotnet test GurkanApi.Tests/` — all tests pass (S01+S02+S03+S04, expect ~52+)

## Observability Impact

- Signals added: structured log messages for Expense and Bill CRUD operations with entity IDs and UserId
- How a future agent inspects: Swagger UI at `/swagger/index.html` shows all new endpoints; `dotnet test --filter "Category=S04"` runs targeted tests
- Failure state exposed: 403 `{ error: "forbidden" }` on cross-group access; 404 `{ error: "not_found" }` on missing entity

## Inputs

- `GurkanApi/Controllers/ShortTermRentalsController.cs` — pattern to copy for both new controllers
- `GurkanApi/Entities/ShortTermRental.cs` — entity pattern (Guid Id, PropertyId, Currency, decimal, DateTime, nav property)
- `GurkanApi/Entities/Enums.cs` — append new enums
- `GurkanApi/Data/ApplicationDbContext.cs` — add DbSets and Fluent API config
- `GurkanApi.Tests/IntegrationTests/TenantTests.cs` — test setup pattern
- `GurkanApi.Tests/IntegrationTests/TestFixture.cs` — add tables to TRUNCATE

## Expected Output

- `GurkanApi/Entities/Expense.cs` — new entity
- `GurkanApi/Entities/Bill.cs` — new entity
- `GurkanApi/Entities/Enums.cs` — 3 new enums added
- `GurkanApi/Data/ApplicationDbContext.cs` — 2 new DbSets + Fluent API config
- `GurkanApi/Controllers/ExpensesController.cs` — 5 CRUD endpoints
- `GurkanApi/Controllers/BillsController.cs` — 6 endpoints (5 CRUD + pay)
- `GurkanApi/DTOs/Expenses/CreateExpenseRequest.cs` — DTO
- `GurkanApi/DTOs/Expenses/UpdateExpenseRequest.cs` — DTO
- `GurkanApi/DTOs/Expenses/ExpenseResponse.cs` — DTO
- `GurkanApi/DTOs/Bills/CreateBillRequest.cs` — DTO
- `GurkanApi/DTOs/Bills/UpdateBillRequest.cs` — DTO
- `GurkanApi/DTOs/Bills/BillResponse.cs` — DTO
- `GurkanApi/Migrations/...AddExpensesAndBills.cs` — EF migration
- `GurkanApi.Tests/IntegrationTests/ExpenseAndBillTests.cs` — integration tests
- `GurkanApi.Tests/IntegrationTests/TestFixture.cs` — updated TRUNCATE
