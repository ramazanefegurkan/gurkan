# S06: Dashboard, Bildirimler & Raporlama — Research

**Date:** 2026-03-18
**Depth:** Targeted — known technology (ASP.NET Core + React), known codebase patterns, moderately complex aggregation logic

## Summary

S06 is the terminal slice consuming S03 (Tenant, RentPayment, ShortTermRental, RentIncrease) and S04 (Expense, Bill) data to deliver three features: a financial dashboard, an in-app notification system, and report export (Excel/PDF). All data entities already exist with full CRUD and group-based access control. The work is pure aggregation, notification generation, and export formatting — no new core data models needed.

The dashboard controller aggregates across all user-accessible properties: per-property income (rent payments + short-term rentals), expenses, bills, profit/loss — grouped by currency (no conversion, per D007). Notifications are generated at query time (matching the S03 late-detection pattern) for three triggers: late rent (DueDate+5 < now, Pending status), upcoming bill due dates (within 7 days), and lease expiration approaching (30/60/90 days). Reports reuse the same aggregation logic and export to Excel (ClosedXML) and PDF (QuestPDF).

The frontend adds a Dashboard page as a new top-level sidebar route (alongside "Mülkler"), a Notifications dropdown/page, and report export buttons on the dashboard. The pattern follows existing code: API client functions, TypeScript interfaces, React pages with the established CSS design system.

## Recommendation

**Build backend first** (3 controllers: Dashboard, Notifications, Reports), then wire frontend. No new EF Core entities or migrations needed — Notification is computed at query time, not persisted (matching the project's "no background jobs" approach from M001-CONTEXT.md). This avoids migration risk and keeps the architecture simple.

For Excel export, use **ClosedXML** (MIT, most popular .NET Excel library, no COM dependency). For PDF export, use **QuestPDF** (MIT for non-commercial / community license, fluent C# API, no HTML intermediary). Both are well-established and appropriate for this family-use project.

## Implementation Landscape

### Key Files

**Backend — existing (consumed, not modified):**
- `GurkanApi/Entities/Tenant.cs` — LeaseEnd for sözleşme bitiş notification
- `GurkanApi/Entities/RentPayment.cs` — DueDate, Status, Amount for rent income + late detection
- `GurkanApi/Entities/ShortTermRental.cs` — NetAmount for short-term rental income
- `GurkanApi/Entities/Expense.cs` — Amount, Category for expense aggregation
- `GurkanApi/Entities/Bill.cs` — Amount, DueDate, Status for bill aggregation + due-date notification
- `GurkanApi/Entities/RentIncrease.cs` — EffectiveDate for next rent increase notification
- `GurkanApi/Services/IGroupAccessService.cs` — `GetUserGroupIdsAsync()` and `CanAccessPropertyAsync()` for access control
- `GurkanApi/Controllers/PropertiesController.cs` — reference pattern for group-filtered property listing (lines 38-48 show the SuperAdmin vs member query pattern)

**Backend — new:**
- `GurkanApi/Controllers/DashboardController.cs` — GET /api/dashboard → aggregated financial summary per property, grouped by currency
- `GurkanApi/Controllers/NotificationsController.cs` — GET /api/notifications → computed notification list (late rent, upcoming bills, lease expiry, rent increase due)
- `GurkanApi/Controllers/ReportsController.cs` — GET /api/reports/profit-loss?period=monthly|yearly&year=2026, GET /api/reports/export/excel, GET /api/reports/export/pdf
- `GurkanApi/DTOs/Dashboard/DashboardResponse.cs` — portfolio summary + per-property breakdown DTOs
- `GurkanApi/DTOs/Notifications/NotificationResponse.cs` — notification item DTO (type, message, propertyId, propertyName, relatedEntityId, severity, date)
- `GurkanApi/DTOs/Reports/ReportResponse.cs` — profit-loss report DTO, ROI per property

**Frontend — existing (modified):**
- `gurkan-ui/src/App.tsx` — add /dashboard and /notifications routes
- `gurkan-ui/src/components/Layout.tsx` — add "Dashboard" and "Bildirimler" nav items to sidebar
- `gurkan-ui/src/api/client.ts` — add getDashboard(), getNotifications(), exportExcel(), exportPdf() functions
- `gurkan-ui/src/types/index.ts` — add dashboard/notification/report TypeScript interfaces

**Frontend — new:**
- `gurkan-ui/src/pages/Dashboard/Dashboard.tsx` — portfolio overview: summary cards + per-property table + export buttons
- `gurkan-ui/src/pages/Dashboard/Dashboard.css` — dashboard-specific styles (summary cards, table)
- `gurkan-ui/src/pages/Notifications/NotificationList.tsx` — notification list with severity badges and links to related entities
- `gurkan-ui/src/pages/Notifications/Notifications.css` — notification styles

**Tests — new:**
- `GurkanApi.Tests/IntegrationTests/DashboardAndNotificationTests.cs` — tagged `[Trait("Category", "S06")]`

### Build Order

1. **T01 — Backend: Dashboard + Notifications API.** Create DashboardController and NotificationsController with DTOs. This is the riskiest part — the aggregation queries across multiple entities (Tenants→RentPayments, ShortTermRentals, Expenses, Bills) with group-based access control and multi-currency grouping. Notification generation logic (late rent: Pending + DueDate+5 < now; bill due: DueDate within 7 days, Status != Paid; lease expiry: Tenant.IsActive + LeaseEnd within 30/60/90 days; rent increase: next EffectiveDate approaching). No new entities or migrations. Verify via Swagger.

2. **T02 — Backend: Reports + Export API.** Add ClosedXML and QuestPDF NuGet packages. Create ReportsController with profit-loss endpoint (returns JSON) and two export endpoints (returns file streams). The profit-loss logic reuses dashboard aggregation. Excel export: property-by-property income/expense/profit sheet. PDF export: formatted report with summary + per-property breakdown. Verify by downloading files via Swagger.

3. **T03 — Integration Tests.** Write tests tagged `[Trait("Category", "S06")]` covering: dashboard aggregation correctness (set up property with tenants, payments, expenses, bills → verify sums), notification generation (create overdue payment → verify late notification, create bill due tomorrow → verify upcoming notification, create tenant with lease ending in 25 days → verify expiry notification), cross-group access denial on dashboard, Excel/PDF export returns valid file content. Add new tables to TRUNCATE in TestFixture if needed (none expected — no new tables).

4. **T04 — Frontend: Dashboard + Notifications + Export.** Add sidebar nav items, routes, API client functions, TypeScript interfaces. Build Dashboard page (summary cards with total income/expense/profit per currency, per-property breakdown table, export Excel/PDF buttons). Build NotificationList page (severity-colored cards, links to property detail). Wire export buttons to download files. Browser-verify the full flow.

### Verification Approach

- `dotnet test GurkanApi.Tests/ --filter "Category=S06"` — all S06 integration tests pass
- `dotnet test GurkanApi.Tests/` — full regression (53 existing + new S06 tests all pass)
- `cd gurkan-ui && npm run build` — TypeScript compiles, no errors
- Browser: login → dashboard shows correct aggregated data for user's properties → notifications show relevant alerts → export Excel/PDF downloads valid files
- Swagger: verify all new endpoints return correct response shapes

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Excel file generation | ClosedXML (NuGet) | MIT license, no COM dependency, fluent API for worksheets/cells/formatting. Most popular .NET Excel library. |
| PDF file generation | QuestPDF (NuGet) | Community license (free for non-commercial), fluent C# API, no HTML→PDF conversion needed. Produces clean PDFs with tables and formatting. |

## Constraints

- **Multi-currency aggregation (D007):** Dashboard and reports must group amounts by currency (TRY/USD/EUR separately). Never sum across currencies. This applies to all summary cards, per-property breakdowns, and export files.
- **No new DB entities/migrations:** Notifications are computed at query time, not persisted. This matches the project pattern (RentPayment late detection is also query-time in RentPaymentsController). The M001-CONTEXT.md open question says "başlangıçta açılışta kontrol" for notifications.
- **Late rent detection threshold:** S03 established DueDate+5 days as the late threshold (hardcoded in RentPaymentsController.MapPaymentResponse). S06 notifications must use the same threshold for consistency.
- **Group-based access control:** Dashboard must only show data for properties the user can access. Reuse the same pattern from PropertiesController.GetAll: SuperAdmin sees all, others see only properties in their groups via `GetUserGroupIdsAsync()`.
- **erasableSyntaxOnly (K009):** Frontend TypeScript cannot use `enum` — use `const` objects with `as const` pattern.
- **Port 5039 (K014):** API client baseURL is `http://localhost:5039/api`.
- **toUtcIso() (K012):** Any date parameters sent to the backend must use UTC ISO format.
- **QuestPDF license:** QuestPDF Community license is free for companies with annual gross revenue less than $1M USD. This is a family-use app, so community license applies. Must call `QuestPDF.Settings.License = LicenseType.Community;` at startup.

## Common Pitfalls

- **Summing across currencies** — The most likely bug. Dashboard income = rent payments (via Tenant.Currency) + short-term rentals (own Currency field). These can be different currencies even for the same property. Group all monetary aggregations by Currency field, never sum TRY+USD.
- **RentPayment has TenantId, not PropertyId** — To aggregate rent payments by property, must join through Tenant (RentPayment → Tenant → Property). ShortTermRentals and Expenses/Bills have direct PropertyId.
- **Late detection consistency** — S03 computes "Late" at query time (Pending + DueDate+5 < now). The notification system must replicate this exact logic, not use a different threshold. Reference: `RentPaymentsController.MapPaymentResponse()`.
- **Bill overdue vs pending** — Bills have a `Status` field that includes `Overdue`, but S04 noted that overdue detection is NOT automatic (bills stay Pending forever unless manually changed). Notification logic should check `DueDate < now AND Status == Pending` rather than relying on Status == Overdue.
- **Export file download in frontend** — Use `responseType: 'blob'` on axios, create object URL, trigger download via anchor element click. The pattern already exists in `client.ts` `downloadDocument()` function — reuse it.

## Open Risks

- **QuestPDF compatibility with .NET 10:** QuestPDF targets .NET 6+ but .NET 10 is very new. If QuestPDF doesn't load on .NET 10, fallback to generating a simpler HTML-based report or skip PDF in favor of Excel-only export (Excel alone satisfies the core need for muhasebeci sharing).
- **ClosedXML compatibility with .NET 10:** Same risk. ClosedXML targets .NET 6+. Should work but worth verifying early in T02.
- **Large dataset performance:** Dashboard queries multiple tables with joins. For family use (10-50 properties), this is fine. No pagination needed for aggregation endpoints.
