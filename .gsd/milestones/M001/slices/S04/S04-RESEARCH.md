# S04: Gider & Fatura Takibi — Research

**Date:** 2026-03-18
**Depth:** Light — straightforward CRUD following established S03 patterns to new entity types.

## Summary

S04 adds two new entity types — Expense (bakım, vergi, sigorta, etc.) and Bill (su, elektrik, doğalgaz, internet, aidat) — under the existing Property entity. Both follow the exact same controller pattern established in S03 (TenantsController, ShortTermRentalsController): nested routes under `/api/properties/{propertyId}/...`, property access check via `IGroupAccessService`, Currency field per record, standard CRUD endpoints.

The backend work is mechanical: two entities, two controllers, DTOs, EF Core Fluent API config, one migration, integration tests. The frontend work adds two new tabs to the existing PropertyLayout (which already uses React Router `<Outlet>` with tab navigation), two list pages (table-based like ShortTermRentalList), and two form pages (like ShortTermRentalForm). No new technology, no architectural decisions, no unknowns.

Requirements covered: R008 (expense tracking), R009 (bill tracking), R014 (multi-currency — supporting role).

## Recommendation

Follow the S03 pattern exactly. Build backend entities + controllers + tests first, then frontend pages. No new enums needed for Currency/PaymentStatus — reuse existing ones from `Enums.cs`. Add two new enums: `ExpenseCategory` (Maintenance, Repair, Tax, Insurance, Management, Other) and `BillType` (Water, Electric, Gas, Internet, Dues).

## Implementation Landscape

### Key Files

**Existing (read-only reference):**
- `GurkanApi/Controllers/TenantsController.cs` — pattern to copy: DI constructor, `CheckPropertyAccess` helper, nested route under `api/properties/{propertyId}/...`, structured log messages
- `GurkanApi/Controllers/ShortTermRentalsController.cs` — simpler CRUD pattern (no terminate logic), closest match for both Expense and Bill controllers
- `GurkanApi/Entities/ShortTermRental.cs` — entity pattern: Guid Id, Guid PropertyId, Currency, decimal amounts, DateTime, navigation property to Property
- `GurkanApi/Entities/Enums.cs` — add `ExpenseCategory` and `BillType` enums here
- `GurkanApi/Data/ApplicationDbContext.cs` — add `DbSet<Expense>`, `DbSet<Bill>`, Fluent API config following RentPayment/ShortTermRental patterns
- `GurkanApi.Tests/IntegrationTests/TenantTests.cs` — test setup pattern: `IClassFixture<CustomWebApplicationFactory>`, `IAsyncLifetime`, `ResetDatabaseAsync`, admin login, group/property setup
- `GurkanApi.Tests/IntegrationTests/TestFixture.cs` — must add `"Expenses", "Bills"` to the TRUNCATE statement
- `gurkan-ui/src/types/index.ts` — add Expense/Bill types + ExpenseCategory/BillType const objects with Turkish labels
- `gurkan-ui/src/api/client.ts` — add API functions for expenses and bills
- `gurkan-ui/src/App.tsx` — add expense/bill routes nested under PropertyLayout
- `gurkan-ui/src/pages/Properties/PropertyLayout.tsx` — add "Giderler" and "Faturalar" tabs

**New files to create:**
- `GurkanApi/Entities/Expense.cs` — Id, PropertyId, Category (ExpenseCategory enum), Description, Amount, Currency, Date, IsRecurring, RecurrenceInterval (string?, e.g. "Monthly"/"Yearly"), Notes, CreatedAt
- `GurkanApi/Entities/Bill.cs` — Id, PropertyId, Type (BillType enum), Amount, Currency, DueDate, PaidDate?, Status (BillPaymentStatus enum: Pending/Paid/Overdue), Notes, CreatedAt
- `GurkanApi/Controllers/ExpensesController.cs` — route `api/properties/{propertyId}/expenses`, endpoints: GET (list with optional ?category filter), GET/{id}, POST, PUT/{id}, DELETE/{id}
- `GurkanApi/Controllers/BillsController.cs` — route `api/properties/{propertyId}/bills`, endpoints: GET (list with optional ?status filter), GET/{id}, POST, PUT/{id}, DELETE/{id}, PATCH/{id}/pay (mark as paid)
- `GurkanApi/DTOs/Expenses/CreateExpenseRequest.cs`
- `GurkanApi/DTOs/Expenses/UpdateExpenseRequest.cs`
- `GurkanApi/DTOs/Expenses/ExpenseResponse.cs`
- `GurkanApi/DTOs/Bills/CreateBillRequest.cs`
- `GurkanApi/DTOs/Bills/UpdateBillRequest.cs`
- `GurkanApi/DTOs/Bills/BillResponse.cs`
- `GurkanApi/Migrations/...AddExpensesAndBills.cs` — EF migration creating Expenses and Bills tables
- `GurkanApi.Tests/IntegrationTests/ExpenseAndBillTests.cs` — integration tests with `[Trait("Category", "S04")]`
- `gurkan-ui/src/pages/Expenses/ExpenseList.tsx` — table-based list (like ShortTermRentalList)
- `gurkan-ui/src/pages/Expenses/ExpenseForm.tsx` — create/edit form (like ShortTermRentalForm)
- `gurkan-ui/src/pages/Expenses/Expenses.css` — minimal, reuse existing `.data-table`, `.section-header`, `.status-badge` classes from Tenants.css
- `gurkan-ui/src/pages/Bills/BillList.tsx` — table-based list with status badges
- `gurkan-ui/src/pages/Bills/BillForm.tsx` — create/edit form
- `gurkan-ui/src/pages/Bills/Bills.css` — minimal custom styles

### Entity Shapes (from boundary map + requirements)

**Expense:**
```
Id: Guid
PropertyId: Guid (FK → Property, Cascade delete)
Category: ExpenseCategory (Maintenance, Repair, Tax, Insurance, Management, Other)
Description: string (required, max 500)
Amount: decimal(18,2)
Currency: Currency (TRY/USD/EUR)
Date: DateTime
IsRecurring: bool
RecurrenceInterval: string? ("Monthly", "Quarterly", "Yearly", null for one-time)
Notes: string? (max 2000)
CreatedAt: DateTime
```

**Bill:**
```
Id: Guid
PropertyId: Guid (FK → Property, Cascade delete)
Type: BillType (Water, Electric, Gas, Internet, Dues)
Amount: decimal(18,2)
Currency: Currency (TRY/USD/EUR)
DueDate: DateTime
PaidDate: DateTime?
Status: BillPaymentStatus (Pending, Paid, Overdue)
Notes: string? (max 2000)
CreatedAt: DateTime
```

### New Enums (add to Enums.cs)

```csharp
public enum ExpenseCategory { Maintenance, Repair, Tax, Insurance, Management, Other }
public enum BillType { Water, Electric, Gas, Internet, Dues }
public enum BillPaymentStatus { Pending, Paid, Overdue }
```

### Build Order

1. **T01: Backend entities + controllers + migration** — Create Expense and Bill entities, new enums, DTOs, ExpensesController and BillsController, EF Core Fluent API config, generate migration, verify `dotnet build` passes. This unblocks everything else.

2. **T02: Integration tests** — Write `ExpenseAndBillTests.cs` with `[Trait("Category", "S04")]`. Tests: CRUD for both entities, cross-group access denial (403), category/status filtering, multi-currency, mark-bill-paid endpoint. Update TestFixture TRUNCATE. Verify with `dotnet test --filter "Category=S04"`.

3. **T03: Frontend types + API client + routes** — Add TypeScript types, const objects with Turkish labels (ExpenseCategory, BillType, BillPaymentStatus), API functions in client.ts. Add routes in App.tsx nested under PropertyLayout. Add new tabs ("Giderler", "Faturalar") to PropertyLayout.tsx.

4. **T04: Frontend expense/bill pages** — Build ExpenseList, ExpenseForm, BillList, BillForm components. Follow ShortTermRentalList table pattern. Add status badges for bill payment status (reuse `.status-badge--pending`, `.status-badge--paid` classes). Add expense category badges. Browser-verify all flows.

### Verification Approach

- **Backend:** `dotnet test GurkanApi.Tests/ --filter "Category=S04"` — all integration tests pass
- **Backend regression:** `dotnet test GurkanApi.Tests/` — all S01/S02/S03 tests still pass
- **Frontend build:** `cd gurkan-ui && npm run build` — TypeScript compiles without errors
- **Browser verification:** Navigate to a property → Giderler tab → add expense → verify in list; Faturalar tab → add bill → mark as paid → verify status change

## Constraints

- Dates must be sent as UTC ISO strings from frontend (`toUtcIso()` helper from K012) — PostgreSQL/Npgsql rejects `DateTime.Kind = Unspecified`
- Frontend enum types must use string values matching backend `JsonStringEnumConverter` output (K011) — e.g., `"Maintenance"` not `0`
- TypeScript must use `as const` objects, not `enum` declarations (K009 — Vite `erasableSyntaxOnly`)
- TRUNCATE in TestFixture must list new tables before tables they reference (Expenses and Bills before Properties)

## Common Pitfalls

- **Forgetting to add tables to TestFixture TRUNCATE** — tests will fail with FK violations or stale data between test classes. Add `"Expenses", "Bills"` to the existing TRUNCATE statement.
- **BillPaymentStatus vs RentPaymentStatus confusion** — Bills use `Overdue` (not `Late`) to distinguish from rent payment terminology. Keep the enum names distinct.
- **PropertyLayout tab detection** — current code uses `location.pathname.includes('/tenants')` etc. New tabs need `location.pathname.includes('/expenses')` and `location.pathname.includes('/bills')`. Ensure these don't false-match other routes.
