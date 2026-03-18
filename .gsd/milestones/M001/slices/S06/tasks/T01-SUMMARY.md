---
id: T01
parent: S06
milestone: M001
provides:
  - GET /api/dashboard endpoint with multi-currency financial aggregation
  - GET /api/notifications endpoint with query-time notification generation
  - Dashboard DTOs (DashboardResponse, CurrencySummary, PropertyFinancials, CurrencyAmount)
  - Notification DTO (NotificationItem)
key_files:
  - GurkanApi/Controllers/DashboardController.cs
  - GurkanApi/Controllers/NotificationsController.cs
  - GurkanApi/DTOs/Dashboard/DashboardResponse.cs
  - GurkanApi/DTOs/Notifications/NotificationResponse.cs
key_decisions:
  - Bulk-load all financial data in-memory then group in C# rather than N+1 per-property DB queries
  - RentIncrease notifications use Tenant.Currency since RentIncrease entity has no Currency field
patterns_established:
  - Dashboard group-based access pattern: SuperAdmin → all properties, else → GetUserGroupIdsAsync() filtered
  - MergeCurrencyAmounts helper for safely combining multi-currency amounts without cross-currency summing
  - Severity-ordered notification sorting via static dictionary lookup
observability_surfaces:
  - Structured log: "Dashboard requested: UserId={UserId}, PropertyCount={Count}"
  - Structured log: "Notifications requested: UserId={UserId}, Count={Count}"
  - 401 on unauthenticated access, 403 on cross-group access denial
duration: 15m
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T01: Build Dashboard and Notifications API endpoints

**Added Dashboard and Notifications API endpoints with multi-currency aggregation, query-time notification generation, and group-based access control**

## What Happened

Created four files implementing the Dashboard and Notifications backend:

1. **Dashboard DTOs** — `DashboardResponse` wraps a per-currency `Summary` list and per-property `Properties` list. `CurrencySummary` aggregates income/expenses/profit per currency across the portfolio. `PropertyFinancials` breaks down income/expenses/profit per property with multi-currency `CurrencyAmount` lists. Currencies are never mixed.

2. **Notification DTO** — `NotificationItem` carries type, severity, Turkish message, propertyId, propertyName, relatedEntityId, and date.

3. **DashboardController** — GET /api/dashboard bulk-loads all financial data for accessible properties in 4 queries (rent payments via Tenant join, short-term rentals, expenses, bills), then groups in-memory by currency. Income = paid rent amounts + short-term NetAmount. Expenses = expense amounts + paid bill amounts. UnpaidRentCount uses DueDate+5 threshold matching S03. UpcomingBillCount = not-Paid bills due within 7 days. Portfolio summary aggregates across all properties per currency.

4. **NotificationsController** — GET /api/notifications generates notifications at query time with no DB persistence. Covers: late rent (Critical, DueDate+5 < now matching S03), upcoming bills (Warning, due within 7 days), overdue bills (Critical, past due), lease expiry (severity tiered: ≤30d Critical, ≤60d Warning, ≤90d Info), rent increases (Info, within 30 days). Sorted by severity then date.

Both controllers enforce group-based access control using `IGroupAccessService.GetUserGroupIdsAsync()`.

**Side fix:** Added `[Consumes("multipart/form-data")]` to DocumentsController.Upload to unblock Swagger JSON generation (pre-existing Swashbuckle issue from S05).

## Verification

- `dotnet build GurkanApi/` — 0 warnings, 0 errors
- `dotnet test GurkanApi.Tests/` — 61 tests pass (full regression, zero failures)
- Swagger UI loads at /swagger/index.html showing both GET /api/Dashboard and GET /api/Notifications
- Manual curl test with authenticated token: GET /api/dashboard returns JSON with summary (1 currency) and properties (1 property with income/expenses/profit arrays)
- Manual curl test: GET /api/notifications returns sorted notification list with LateRent Critical alerts
- Both endpoints return 401 without auth token (correct)

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `dotnet build GurkanApi/` | 0 | ✅ pass | 1s |
| 2 | `dotnet test GurkanApi.Tests/` | 0 | ✅ pass | 28s |
| 3 | `curl GET /api/dashboard (authenticated)` | 0 | ✅ pass | <1s |
| 4 | `curl GET /api/notifications (authenticated)` | 0 | ✅ pass | <1s |
| 5 | `curl GET /api/dashboard (no auth) → 401` | 0 | ✅ pass | <1s |
| 6 | Swagger UI loads with Dashboard/Notifications sections | - | ✅ pass | - |

## Diagnostics

- **Swagger UI:** GET /api/dashboard and GET /api/notifications visible with full response schemas
- **Application logs:** Structured log entries on every request with UserId and result count
- **Error shapes:** 401 on unauthenticated, 403 on cross-group denial, 500 with stack trace on query failures

## Deviations

- Added `[Consumes("multipart/form-data")]` to DocumentsController.Upload to fix pre-existing Swagger generation failure from S05 (Swashbuckle couldn't handle `[FromForm]` with `IFormFile`). This was necessary to verify endpoints in Swagger UI.

## Known Issues

- None

## Files Created/Modified

- `GurkanApi/DTOs/Dashboard/DashboardResponse.cs` — new: DashboardResponse, CurrencySummary, PropertyFinancials, CurrencyAmount DTOs
- `GurkanApi/DTOs/Notifications/NotificationResponse.cs` — new: NotificationItem DTO
- `GurkanApi/Controllers/DashboardController.cs` — new: GET /api/dashboard with multi-currency aggregation
- `GurkanApi/Controllers/NotificationsController.cs` — new: GET /api/notifications with query-time notification generation
- `GurkanApi/Controllers/DocumentsController.cs` — modified: added `[Consumes("multipart/form-data")]` to fix Swagger
