---
id: T03
parent: S06
milestone: M001
provides:
  - 7 integration tests covering dashboard aggregation, notification triggers, cross-group access denial, and Excel/PDF export
key_files:
  - GurkanApi.Tests/IntegrationTests/DashboardAndNotificationTests.cs
key_decisions:
  - Tenant LeaseStart set 3 months ago to guarantee multiple auto-generated rent payments with DueDate+5 in the past (triggering LateRent notifications)
  - LeaseEnd set 25 days from now to trigger Critical-severity LeaseExpiry notification (within 30-day threshold)
patterns_established:
  - Realistic test data setup pattern: single InitializeAsync creates property+tenant+STR+expense+bill covering all notification trigger types simultaneously
observability_surfaces:
  - dotnet test --filter "Category=S06" runs all 16 S06 tests (9 ReportsTests + 7 DashboardAndNotificationTests)
  - Test failure messages include expected vs actual values for amounts, notification types, content types
duration: 12m
verification_result: passed
completed_at: 2026-03-18T19:38:00+03:00
blocker_discovered: false
---

# T03: Write S06 integration tests for Dashboard, Notifications, and Reports

**Added 7 integration tests proving dashboard aggregation, notification trigger logic (LateRent/UpcomingBill/LeaseExpiry), cross-group access denial, and Excel/PDF export correctness — 77/77 tests pass**

## What Happened

Created `DashboardAndNotificationTests.cs` with `[Trait("Category", "S06")]` following the existing `ExpenseAndBillTests.cs` pattern. The test class sets up realistic data in `InitializeAsync()`: a property with a tenant whose lease started 3 months ago (generating 4 rent payments, 2-3 with DueDate+5 in the past → LateRent), lease ending in 25 days (→ LeaseExpiry Critical), a short-term rental (8,500 TRY net), an expense (3,000 TRY), and a bill due in 3 days (→ UpcomingBill). A second group+user pair tests cross-group isolation.

Seven tests verify:
1. **Dashboard_ReturnsCorrectAggregation** — income ≥ STR net amount, expenses ≥ expense amount, profit = income - expenses, UnpaidRentCount > 0
2. **Dashboard_CrossGroupAccess_ReturnsEmpty** — user in empty group sees no properties/summary
3. **Notifications_IncludesLateRent** — at least one LateRent notification with Critical severity
4. **Notifications_IncludesUpcomingBill** — UpcomingBill notification exists for the 3-day-due bill
5. **Notifications_IncludesLeaseExpiry** — LeaseExpiry notification with Critical severity (25 days ≤ 30)
6. **ExcelExport_ReturnsValidFile** — 200 status, correct MIME type, non-empty content
7. **PdfExport_ReturnsValidFile** — 200 status, correct MIME type, non-empty content

## Verification

- `dotnet test GurkanApi.Tests/ --filter "Category=S06"` → 16/16 passed (9 ReportsTests + 7 DashboardAndNotificationTests)
- `dotnet test GurkanApi.Tests/` → 77/77 passed, 0 failed, 0 errors — full regression clean

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `dotnet test GurkanApi.Tests/ --filter "Category=S06"` | 0 | ✅ pass | 10s |
| 2 | `dotnet test GurkanApi.Tests/` | 0 | ✅ pass | 24s |

## Diagnostics

- Run `dotnet test GurkanApi.Tests/ --filter "Category=S06" --verbosity normal` to see structured log output from Dashboard/Notifications/Reports controllers during test execution
- Test names encode the behavior being verified (e.g., `Notifications_IncludesLateRent` → LateRent notification present with Critical severity)
- Failed tests show assertion details with expected vs actual values (amounts, notification types, severities, content types)

## Deviations

None — the plan matched the implementation exactly.

## Known Issues

None.

## Files Created/Modified

- `GurkanApi.Tests/IntegrationTests/DashboardAndNotificationTests.cs` — 7 integration tests for dashboard, notifications, cross-group access, and Excel/PDF export
- `.gsd/milestones/M001/slices/S06/tasks/T03-PLAN.md` — added Observability Impact section (pre-flight fix)
- `.gsd/milestones/M001/slices/S06/S06-PLAN.md` — marked T03 as `[x]`
