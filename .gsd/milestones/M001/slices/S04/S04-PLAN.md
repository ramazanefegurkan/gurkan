# S04: Gider & Fatura Takibi

**Goal:** Mülk bazlı gider (bakım, vergi, sigorta vs.) ve fatura (su, elektrik, doğalgaz, internet, aidat) kaydedilir, ödeme durumu takip edilir.
**Demo:** Bir mülkün Giderler sekmesinde gider ekle/düzenle/sil, Faturalar sekmesinde fatura ekle/düzenle/sil ve "ödendi" olarak işaretle. Tüm veriler grup erişim kontrolü altında çalışır.

## Must-Haves

- Expense entity: PropertyId, Category (Maintenance/Repair/Tax/Insurance/Management/Other), Description, Amount, Currency, Date, IsRecurring, RecurrenceInterval, Notes, CreatedAt
- Bill entity: PropertyId, Type (Water/Electric/Gas/Internet/Dues), Amount, Currency, DueDate, PaidDate, Status (Pending/Paid/Overdue), Notes, CreatedAt
- ExpensesController: GET (list + category filter), GET/{id}, POST, PUT/{id}, DELETE/{id} — nested under `/api/properties/{propertyId}/expenses`
- BillsController: GET (list + status filter), GET/{id}, POST, PUT/{id}, DELETE/{id}, PATCH/{id}/pay — nested under `/api/properties/{propertyId}/bills`
- Group-based access control (IGroupAccessService) on all endpoints
- Multi-currency support (TRY/USD/EUR) on both Expense and Bill
- Integration tests proving CRUD, access control, filtering, mark-bill-paid
- Frontend: "Giderler" and "Faturalar" tabs in PropertyLayout
- Frontend: ExpenseList, ExpenseForm, BillList, BillForm pages
- All dates sent as UTC ISO strings from frontend (K012)

## Proof Level

- This slice proves: contract + integration
- Real runtime required: yes (PostgreSQL, browser)
- Human/UAT required: no

## Verification

- `dotnet test GurkanApi.Tests/ --filter "Category=S04"` — all S04 integration tests pass
- `dotnet test GurkanApi.Tests/` — full regression (S01+S02+S03+S04) passes
- `cd gurkan-ui && npm run build` — TypeScript compiles without errors
- Browser: navigate to property → Giderler tab → add expense → verify in list → edit → delete
- Browser: navigate to property → Faturalar tab → add bill → mark as paid → verify status change

## Observability / Diagnostics

- Runtime signals: "Expense {action}: ExpenseId={ExpenseId}, PropertyId={PropertyId}, By={UserId}" and "Bill {action}: BillId={BillId}, PropertyId={PropertyId}, By={UserId}" structured logs on all CRUD
- Inspection surfaces: Swagger UI at /swagger/index.html shows all new endpoints; `dotnet test --filter "Category=S04"` runs S04 tests
- Failure visibility: 403 with `{ error: "forbidden" }` on cross-group access; 404 with `{ error: "not_found" }` on missing entity; 400 on validation errors
- Redaction constraints: none

## Integration Closure

- Upstream surfaces consumed: `Property` entity + `IGroupAccessService` (from S02), JWT auth middleware (from S01), PropertyLayout tab navigation (from S03), `toUtcIso()` helper (from S03), `Currency` enum (from S02)
- New wiring introduced: ExpensesController + BillsController registered via `[ApiController]`, two new tabs in PropertyLayout, expense/bill routes in App.tsx
- What remains before the milestone is truly usable end-to-end: S05 (documents), S06 (dashboard/notifications/reports)

## Tasks

- [x] **T01: Build Expense and Bill backend — entities, enums, DTOs, controllers, migration, and integration tests** `est:45m`
  - Why: Creates the entire backend surface for S04 — entities, database schema, API endpoints, and tests. This is the foundation that unblocks frontend work.
  - Files: `GurkanApi/Entities/Expense.cs`, `GurkanApi/Entities/Bill.cs`, `GurkanApi/Entities/Enums.cs`, `GurkanApi/Data/ApplicationDbContext.cs`, `GurkanApi/Controllers/ExpensesController.cs`, `GurkanApi/Controllers/BillsController.cs`, `GurkanApi/DTOs/Expenses/*.cs`, `GurkanApi/DTOs/Bills/*.cs`, `GurkanApi.Tests/IntegrationTests/ExpenseAndBillTests.cs`, `GurkanApi.Tests/IntegrationTests/TestFixture.cs`
  - Do: Add 3 new enums (ExpenseCategory, BillType, BillPaymentStatus) to Enums.cs. Create Expense and Bill entities. Add DbSets and Fluent API config to ApplicationDbContext. Create DTOs (Create/Update/Response for each). Build ExpensesController and BillsController following ShortTermRentalsController pattern. Generate EF migration. Add "Expenses", "Bills" to TestFixture TRUNCATE (before "Properties"). Write integration tests with `[Trait("Category", "S04")]`.
  - Verify: `dotnet test GurkanApi.Tests/ --filter "Category=S04"` passes AND `dotnet test GurkanApi.Tests/` full regression passes
  - Done when: All S04 tests pass, all existing S01/S02/S03 tests still pass, `dotnet build` clean

- [x] **T02: Wire frontend types, API client, routes, and PropertyLayout tabs** `est:20m`
  - Why: Connects the frontend to the new backend endpoints and adds navigation for expense/bill pages. Unblocks T03 page development.
  - Files: `gurkan-ui/src/types/index.ts`, `gurkan-ui/src/api/client.ts`, `gurkan-ui/src/App.tsx`, `gurkan-ui/src/pages/Properties/PropertyLayout.tsx`
  - Do: Add TypeScript types (ExpenseResponse, BillResponse, CreateExpenseRequest, etc.) and const label objects (ExpenseCategoryLabels, BillTypeLabels, BillPaymentStatusLabels) with Turkish labels to types/index.ts. Add API functions (getExpenses, createExpense, updateExpense, deleteExpense, getBills, createBill, updateBill, deleteBill, markBillPaid) to client.ts. Add expense/bill routes nested under PropertyLayout in App.tsx. Add "Giderler" and "Faturalar" tab links to PropertyLayout.tsx.
  - Verify: `cd gurkan-ui && npm run build` — TypeScript compiles with zero errors
  - Done when: `npm run build` succeeds, new types/API functions/routes/tabs are in place

- [ ] **T03: Build expense and bill frontend pages with browser verification** `est:40m`
  - Why: Delivers the user-facing UI for expense and bill management — the final piece that makes S04's demo true.
  - Files: `gurkan-ui/src/pages/Expenses/ExpenseList.tsx`, `gurkan-ui/src/pages/Expenses/ExpenseForm.tsx`, `gurkan-ui/src/pages/Expenses/Expenses.css`, `gurkan-ui/src/pages/Bills/BillList.tsx`, `gurkan-ui/src/pages/Bills/BillForm.tsx`, `gurkan-ui/src/pages/Bills/Bills.css`
  - Do: Build ExpenseList (table with category badges, delete confirmation) and ExpenseForm (create/edit dual mode with category dropdown, currency, date, recurring toggle). Build BillList (table with status badges, "Ödendi" action button) and BillForm (create/edit with bill type dropdown, currency, due date). Follow ShortTermRentalList/Form patterns. Use toUtcIso() for all date fields. Reuse existing CSS classes (.data-table, .status-badge, .section-header). Browser-verify all CRUD flows.
  - Verify: Browser verification — add/edit/delete expense, add/edit/delete bill, mark bill paid; `npm run build` still passes
  - Done when: All expense and bill CRUD flows work in the browser, status badges display correctly, `npm run build` clean

## Files Likely Touched

- `GurkanApi/Entities/Enums.cs`
- `GurkanApi/Entities/Expense.cs`
- `GurkanApi/Entities/Bill.cs`
- `GurkanApi/Data/ApplicationDbContext.cs`
- `GurkanApi/Controllers/ExpensesController.cs`
- `GurkanApi/Controllers/BillsController.cs`
- `GurkanApi/DTOs/Expenses/CreateExpenseRequest.cs`
- `GurkanApi/DTOs/Expenses/UpdateExpenseRequest.cs`
- `GurkanApi/DTOs/Expenses/ExpenseResponse.cs`
- `GurkanApi/DTOs/Bills/CreateBillRequest.cs`
- `GurkanApi/DTOs/Bills/UpdateBillRequest.cs`
- `GurkanApi/DTOs/Bills/BillResponse.cs`
- `GurkanApi/Migrations/...AddExpensesAndBills.cs`
- `GurkanApi.Tests/IntegrationTests/ExpenseAndBillTests.cs`
- `GurkanApi.Tests/IntegrationTests/TestFixture.cs`
- `gurkan-ui/src/types/index.ts`
- `gurkan-ui/src/api/client.ts`
- `gurkan-ui/src/App.tsx`
- `gurkan-ui/src/pages/Properties/PropertyLayout.tsx`
- `gurkan-ui/src/pages/Expenses/ExpenseList.tsx`
- `gurkan-ui/src/pages/Expenses/ExpenseForm.tsx`
- `gurkan-ui/src/pages/Expenses/Expenses.css`
- `gurkan-ui/src/pages/Bills/BillList.tsx`
- `gurkan-ui/src/pages/Bills/BillForm.tsx`
- `gurkan-ui/src/pages/Bills/Bills.css`
