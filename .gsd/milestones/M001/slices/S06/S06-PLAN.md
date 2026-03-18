# S06: Dashboard, Bildirimler & Raporlama

**Goal:** Deliver a financial dashboard aggregating income/expenses per property grouped by currency, an in-app notification system for late rent/upcoming bills/lease expiry/rent increase, and Excel/PDF report export with ROI — all respecting group-based access control.

**Demo:** User logs in → navigates to Dashboard → sees portfolio summary cards (total income, expenses, profit per currency), per-property breakdown table, and unpaid rent / upcoming bill counts → clicks Bildirimler → sees late rent, upcoming bill, and lease expiry notifications with severity badges → clicks Excel/PDF export → downloads valid file with profit/loss per property and ROI.

## Must-Haves

- Dashboard aggregates rent payments (via Tenant→RentPayment), short-term rental income, expenses, and bills per property, grouped by currency (never summing across currencies per D007)
- SuperAdmin sees all properties; regular users see only properties in their groups via `GetUserGroupIdsAsync()`
- Notifications computed at query time (no new DB entities/migrations): late rent (Pending + DueDate+5 < now), upcoming bills (DueDate within 7 days, Status != Paid), lease expiry (active tenant, LeaseEnd within 30/60/90 days), rent increase approaching
- Excel export via ClosedXML — property-by-property income/expense/profit sheet
- PDF export via QuestPDF — formatted report with summary + per-property breakdown + ROI
- ROI calculation per property: (total income - total expenses) / property purchase price or total investment
- Sidebar navigation updated with "Dashboard" and "Bildirimler" links
- Frontend Dashboard page with summary cards + per-property table + export buttons
- Frontend Notification list page with severity badges and links to related properties
- Integration tests proving aggregation correctness, notification triggers, access control, and export file generation

## Proof Level

- This slice proves: integration (backend aggregation + frontend display + file export)
- Real runtime required: yes
- Human/UAT required: yes (dashboard accuracy, report readability)

## Verification

- `dotnet test GurkanApi.Tests/ --filter "Category=S06"` — all S06 integration tests pass
- `dotnet test GurkanApi.Tests/` — full regression (53 existing + new S06 tests all pass)
- `cd gurkan-ui && npm run build` — TypeScript compiles, no errors
- Browser: login → Dashboard shows aggregated financial data → Notifications show alerts → Export downloads valid Excel/PDF
- Swagger: GET /api/dashboard, GET /api/notifications, GET /api/reports/export/excel, GET /api/reports/export/pdf all return correct responses

## Observability / Diagnostics

- Runtime signals: Structured logs on dashboard/notification/report requests: "Dashboard requested by UserId={UserId}", "Notifications requested by UserId={UserId}", "Report exported: Format={Format}, By={UserId}"
- Inspection surfaces: Swagger UI for all new endpoints, `dotnet test --filter "Category=S06"`, browser DevTools network tab filtered on `/dashboard/` or `/notifications/` or `/reports/`
- Failure visibility: 403 on cross-group access denial, 500 on aggregation query failure with stack trace in logs
- Redaction constraints: none (no PII in aggregated dashboard data)

## Integration Closure

- Upstream surfaces consumed: `Tenant` + `RentPayment` entities (S03), `Expense` + `Bill` entities (S04), `Property` entity + `IGroupAccessService` (S02), JWT middleware (S01)
- New wiring introduced in this slice: 3 new controllers (Dashboard, Notifications, Reports), 2 NuGet packages (ClosedXML, QuestPDF), sidebar nav items, 2 new top-level routes (/dashboard, /notifications), export download API client functions
- What remains before the milestone is truly usable end-to-end: nothing — S06 is the final slice

## Tasks

- [x] **T01: Build Dashboard and Notifications API endpoints** `est:45m`
  - Why: Core backend — aggregation queries across Tenant→RentPayment, ShortTermRental, Expense, Bill entities with multi-currency grouping and group-based access control. Notification generation logic (late rent, upcoming bills, lease expiry, rent increase) computed at query time. This is the riskiest work in S06.
  - Files: `GurkanApi/Controllers/DashboardController.cs`, `GurkanApi/Controllers/NotificationsController.cs`, `GurkanApi/DTOs/Dashboard/DashboardResponse.cs`, `GurkanApi/DTOs/Notifications/NotificationResponse.cs`
  - Do: Create DTOs for dashboard (portfolio summary per currency + per-property breakdown) and notifications (type, message, severity, propertyId, relatedEntityId). Implement DashboardController GET /api/dashboard with group-filtered property query, aggregate rent payments (join through Tenant), short-term rental income (direct PropertyId), expenses, bills — all grouped by currency. Implement NotificationsController GET /api/notifications with query-time notification generation matching S03's DueDate+5 late detection pattern. Both controllers use `IGroupAccessService.GetUserGroupIdsAsync()` for access control.
  - Verify: `dotnet build GurkanApi/` compiles, Swagger shows both endpoints with correct response schemas
  - Done when: GET /api/dashboard returns per-property financial summary grouped by currency; GET /api/notifications returns computed notification list with correct triggers

- [x] **T02: Build Reports API with Excel and PDF export** `est:45m`
  - Why: Report export (Excel/PDF) with profit/loss and ROI is a key requirement (R013). Adds ClosedXML and QuestPDF NuGet packages. Reuses dashboard aggregation pattern for data.
  - Files: `GurkanApi/Controllers/ReportsController.cs`, `GurkanApi/DTOs/Reports/ReportResponse.cs`, `GurkanApi/GurkanApi.csproj`, `GurkanApi/Program.cs`
  - Do: Add ClosedXML and QuestPDF NuGet packages. Set `QuestPDF.Settings.License = LicenseType.Community` in Program.cs. Create ReportsController with GET /api/reports/profit-loss (JSON response), GET /api/reports/export/excel (file download), GET /api/reports/export/pdf (file download). Profit/loss logic reuses dashboard aggregation pattern. Excel: workbook with per-property rows (income, expenses, profit, ROI). PDF: formatted report with summary table and per-property breakdown. Both respect group-based access control.
  - Verify: `dotnet build GurkanApi/` compiles, Swagger shows report endpoints, download files via Swagger
  - Done when: GET /api/reports/export/excel returns valid .xlsx file; GET /api/reports/export/pdf returns valid .pdf file; both contain correct per-property financial data with ROI

- [x] **T03: Write S06 integration tests for Dashboard, Notifications, and Reports** `est:40m`
  - Why: Prove aggregation correctness, notification triggers, cross-group access denial, and export file generation with automated tests. This is the verification backbone.
  - Files: `GurkanApi.Tests/IntegrationTests/DashboardAndNotificationTests.cs`
  - Do: Create test class tagged `[Trait("Category", "S06")]` using existing `CustomWebApplicationFactory` fixture. Setup: create group, users, property, tenant with rent payments (including overdue), short-term rental, expenses, bills (including upcoming due date). Tests: (1) dashboard returns correct income/expense/profit aggregation per currency, (2) notifications include late rent alert, (3) notifications include upcoming bill alert, (4) notifications include lease expiry alert, (5) cross-group user gets empty dashboard (no data from other groups), (6) Excel export returns valid file with content-type application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, (7) PDF export returns valid file with content-type application/pdf. Run full regression to ensure no conflicts with 53 existing tests.
  - Verify: `dotnet test GurkanApi.Tests/ --filter "Category=S06"` all pass; `dotnet test GurkanApi.Tests/` full regression all pass
  - Done when: All S06 tests pass AND full regression (53 existing + new S06 tests) passes with zero failures

- [x] **T04: Build frontend Dashboard page, Notification list, and export wiring** `est:50m`
  - Why: Close the frontend loop — users need to see dashboard data, notifications, and trigger exports from the UI. This is the user-facing delivery of the entire slice.
  - Files: `gurkan-ui/src/App.tsx`, `gurkan-ui/src/components/Layout.tsx`, `gurkan-ui/src/api/client.ts`, `gurkan-ui/src/types/index.ts`, `gurkan-ui/src/pages/Dashboard/Dashboard.tsx`, `gurkan-ui/src/pages/Dashboard/Dashboard.css`, `gurkan-ui/src/pages/Notifications/NotificationList.tsx`, `gurkan-ui/src/pages/Notifications/Notifications.css`
  - Do: Add TypeScript interfaces for dashboard/notification/report responses in types/index.ts. Add API client functions: getDashboard(), getNotifications(), getProfitLossReport(), exportExcel(), exportPdf() — export functions use responseType:'blob' and reuse the downloadDocument() pattern for file download. Add "Dashboard" and "Bildirimler" nav items to Layout.tsx sidebar (with SVG icons matching existing style). Add /dashboard and /notifications routes to App.tsx. Build Dashboard.tsx: summary cards showing total income/expense/profit per currency, per-property breakdown table, notification badge count, Excel/PDF export buttons. Build NotificationList.tsx: severity-colored notification cards (critical=red for late rent, warning=yellow for upcoming bills, info=blue for lease expiry) with links to property detail pages. Follow existing CSS design system (var(--*) custom properties, .page-header, .card patterns). Use `const` objects with `as const` for any new enum-like types (K009). Make /dashboard the default route after login instead of /properties.
  - Verify: `cd gurkan-ui && npm run build` compiles with zero errors; browser: login → dashboard shows data → notifications show alerts → export buttons download files
  - Done when: Dashboard page renders with real data, notifications display correctly, Excel/PDF export downloads work, TypeScript compiles with zero errors

## Files Likely Touched

- `GurkanApi/Controllers/DashboardController.cs` — new
- `GurkanApi/Controllers/NotificationsController.cs` — new
- `GurkanApi/Controllers/ReportsController.cs` — new
- `GurkanApi/DTOs/Dashboard/DashboardResponse.cs` — new
- `GurkanApi/DTOs/Notifications/NotificationResponse.cs` — new
- `GurkanApi/DTOs/Reports/ReportResponse.cs` — new
- `GurkanApi/GurkanApi.csproj` — modified (add ClosedXML, QuestPDF)
- `GurkanApi/Program.cs` — modified (QuestPDF license setting)
- `GurkanApi.Tests/IntegrationTests/DashboardAndNotificationTests.cs` — new
- `gurkan-ui/src/types/index.ts` — modified
- `gurkan-ui/src/api/client.ts` — modified
- `gurkan-ui/src/App.tsx` — modified
- `gurkan-ui/src/components/Layout.tsx` — modified
- `gurkan-ui/src/pages/Dashboard/Dashboard.tsx` — new
- `gurkan-ui/src/pages/Dashboard/Dashboard.css` — new
- `gurkan-ui/src/pages/Notifications/NotificationList.tsx` — new
- `gurkan-ui/src/pages/Notifications/Notifications.css` — new
