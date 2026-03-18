---
estimated_steps: 6
estimated_files: 1
---

# T03: Write S06 integration tests for Dashboard, Notifications, and Reports

**Slice:** S06 — Dashboard, Bildirimler & Raporlama
**Milestone:** M001

## Description

Write integration tests proving dashboard aggregation correctness, notification trigger logic, cross-group access denial, and export file generation. Uses the existing `CustomWebApplicationFactory` test fixture pattern. Tests set up realistic data (property with tenant, rent payments including overdue, short-term rental, expenses, bills with upcoming due dates) and verify the API responses contain correct aggregated values.

**Relevant skills:** `test` skill may be loaded for test patterns, but the existing test pattern in `ExpenseAndBillTests.cs` / `TenantTests.cs` is the primary reference.

## Steps

1. **Create test file** `GurkanApi.Tests/IntegrationTests/DashboardAndNotificationTests.cs`:
   - Class: `DashboardAndNotificationTests`
   - Attributes: `[Trait("Category", "S06")]`, `IClassFixture<CustomWebApplicationFactory>`, `IAsyncLifetime`
   - Follow the exact same pattern as `ExpenseAndBillTests.cs` for setup

2. **Test data setup in `InitializeAsync()`:**
   - Reset database via `_factory.ResetDatabaseAsync()`
   - Create admin client, login as admin
   - Register a test user, create a group, add user to group
   - Create a property in the group (Currency = TRY)
   - Create a tenant with lease ending in 25 days from now (for lease expiry notification)
   - The tenant creation auto-generates rent payments — some will have DueDate in the past
   - To guarantee a late payment: create a tenant whose LeaseStart is at least 2 months ago so generated payments have DueDates well past +5 days. Alternatively, since the controller auto-generates payments, find one that's past DueDate+5 and leave it as Pending.
   - Create a short-term rental (for income aggregation)
   - Create an expense (for expense aggregation)
   - Create a bill with DueDate = 3 days from now, Status = Pending (for upcoming bill notification)
   - Create a second group + user for cross-group access denial test
   - Login as the test user (group member) to get a user client

3. **Test: Dashboard returns correct aggregation** (`Dashboard_ReturnsCorrectAggregation`):
   - GET /api/dashboard with admin client
   - Assert response contains the test property
   - Assert income includes paid rent payment amounts + short-term rental NetAmount
   - Assert expenses include expense amount + paid bill amounts
   - Assert profit = income - expenses (per currency)
   - Assert UnpaidRentCount > 0 (from auto-generated pending payments)

4. **Test: Notifications include late rent** (`Notifications_IncludesLateRent`):
   - GET /api/notifications with admin client
   - Assert at least one notification with Type="LateRent" and Severity="Critical"
   - Assert the notification's PropertyId matches the test property

5. **Test: Notifications include upcoming bill** (`Notifications_IncludesUpcomingBill`):
   - GET /api/notifications with admin client  
   - Assert at least one notification with Type="UpcomingBill"

6. **Test: Notifications include lease expiry** (`Notifications_IncludesLeaseExpiry`):
   - GET /api/notifications with admin client
   - Assert at least one notification with Type="LeaseExpiry" (tenant lease ends in 25 days → within 30-day threshold → Critical)

7. **Test: Cross-group user sees empty dashboard** (`Dashboard_CrossGroupAccess_ReturnsEmpty`):
   - Login as user2 (in group B, which has no properties)
   - GET /api/dashboard
   - Assert response has empty Properties array and zero totals

8. **Test: Excel export returns valid file** (`ExcelExport_ReturnsValidFile`):
   - GET /api/reports/export/excel with admin client
   - Assert response status 200
   - Assert Content-Type is `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
   - Assert response content length > 0

9. **Test: PDF export returns valid file** (`PdfExport_ReturnsValidFile`):
   - GET /api/reports/export/pdf with admin client
   - Assert response status 200
   - Assert Content-Type is `application/pdf`
   - Assert response content length > 0

10. **Run full regression:** `dotnet test GurkanApi.Tests/` — all existing 53 tests + new S06 tests must pass.

## Must-Haves

- [ ] Test class with `[Trait("Category", "S06")]` and proper fixture setup
- [ ] Test data includes property + tenant (with auto-generated payments including overdue) + short-term rental + expense + bill (upcoming due date)
- [ ] Dashboard aggregation test verifies income/expense/profit values
- [ ] Late rent notification test verifies Critical severity notification exists
- [ ] Upcoming bill notification test verifies notification exists
- [ ] Lease expiry notification test verifies notification exists
- [ ] Cross-group access denial test verifies empty dashboard for unauthorized user
- [ ] Excel export test verifies valid file download
- [ ] PDF export test verifies valid file download
- [ ] Full regression passes (53 existing + new tests)

## Verification

- `dotnet test GurkanApi.Tests/ --filter "Category=S06"` — all S06 tests pass
- `dotnet test GurkanApi.Tests/` — full regression passes with zero failures (53 existing + ~7 new S06 tests)

## Inputs

- `GurkanApi.Tests/IntegrationTests/TestFixture.cs` — CustomWebApplicationFactory with ResetDatabaseAsync
- `GurkanApi.Tests/IntegrationTests/HttpClientExtensions.cs` — LoginAsAsync, RegisterUserAsync, ReadAsApiJsonAsync, ApiJsonOptions
- `GurkanApi.Tests/IntegrationTests/ExpenseAndBillTests.cs` — reference pattern for test setup (group/user/property creation, assertion style)
- `GurkanApi/Controllers/DashboardController.cs` (from T01) — endpoint: GET /api/dashboard
- `GurkanApi/Controllers/NotificationsController.cs` (from T01) — endpoint: GET /api/notifications
- `GurkanApi/Controllers/ReportsController.cs` (from T02) — endpoints: GET /api/reports/export/excel, GET /api/reports/export/pdf
- `GurkanApi/DTOs/Dashboard/DashboardResponse.cs` (from T01) — response DTO structure for deserialization
- `GurkanApi/DTOs/Notifications/NotificationResponse.cs` (from T01) — notification DTO structure
- `GurkanApi/DTOs/Reports/ReportResponse.cs` (from T02) — report DTO structure

## Observability Impact

- **Test signals:** `dotnet test --filter "Category=S06"` runs all S06 integration tests (DashboardAndNotificationTests + ReportsTests). A passing suite confirms dashboard aggregation, notification generation, cross-group access control, and Excel/PDF export all function correctly end-to-end.
- **Inspection:** Test output includes structured log lines from DashboardController ("Dashboard requested"), NotificationsController ("Notifications requested"), and ReportsController ("Report exported") — visible in `--verbosity normal` output for tracing request flow through the test host.
- **Failure visibility:** xUnit failure messages include expected vs. actual values for aggregation amounts, notification types/severities, content types, and response codes. Test names encode the behavior under test (e.g., `Notifications_IncludesLateRent`, `Dashboard_CrossGroupAccess_ReturnsEmpty`).

## Expected Output

- `GurkanApi.Tests/IntegrationTests/DashboardAndNotificationTests.cs` — ~7 integration tests tagged S06, all passing alongside 53 existing tests
