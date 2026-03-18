---
estimated_steps: 8
estimated_files: 4
---

# T01: Build Dashboard and Notifications API endpoints

**Slice:** S06 — Dashboard, Bildirimler & Raporlama
**Milestone:** M001

## Description

Create the Dashboard and Notifications backend API endpoints. The Dashboard endpoint aggregates financial data across all user-accessible properties (rent payments via Tenant join, short-term rental income, expenses, bills) grouped by currency. The Notifications endpoint computes alerts at query time (no DB persistence) for late rent, upcoming bills, lease expiry, and rent increases. Both endpoints enforce group-based access control.

This is the riskiest task in S06 because it involves complex multi-table aggregation queries with multi-currency grouping and must correctly traverse the RentPayment→Tenant→Property join path.

**Relevant skills:** None required (standard ASP.NET Core controller patterns).

## Steps

1. **Create Dashboard DTOs** in `GurkanApi/DTOs/Dashboard/DashboardResponse.cs`:
   - `DashboardResponse` — top-level wrapper containing `List<CurrencySummary> Summary` and `List<PropertyFinancials> Properties`
   - `CurrencySummary` — `Currency`, `TotalIncome`, `TotalExpenses`, `TotalProfit`, `UnpaidRentCount`, `UpcomingBillCount`
   - `PropertyFinancials` — `PropertyId`, `PropertyName`, `PropertyType`, `Currency` (property's default currency), `List<CurrencyAmount> Income` (rent payments + short-term), `List<CurrencyAmount> Expenses` (expenses + bills), `List<CurrencyAmount> Profit`, `UnpaidRentCount`, `UpcomingBillCount`
   - `CurrencyAmount` — `Currency`, `Amount` (simple pair for multi-currency amounts)

2. **Create Notification DTOs** in `GurkanApi/DTOs/Notifications/NotificationResponse.cs`:
   - `NotificationItem` — `Type` (string: "LateRent", "UpcomingBill", "LeaseExpiry", "RentIncrease"), `Severity` (string: "Critical", "Warning", "Info"), `Message` (Turkish human-readable), `PropertyId`, `PropertyName`, `RelatedEntityId` (nullable Guid), `Date` (the relevant date — due date, lease end, etc.)

3. **Create DashboardController** in `GurkanApi/Controllers/DashboardController.cs`:
   - Route: `api/dashboard`, `[Authorize]`
   - Inject `ApplicationDbContext`, `IGroupAccessService`, `ILogger`
   - `GET /api/dashboard`: 
     - Get userId and role from claims (use `User.GetUserId()` and `User.GetRole()` from `GurkanApi.Extensions`)
     - Get accessible properties: if SuperAdmin → all properties; else → properties where GroupId is in `GetUserGroupIdsAsync(userId)` result. Include Group navigation.
     - For each property, load:
       - Rent payments via: `_db.RentPayments.Include(rp => rp.Tenant).Where(rp => rp.Tenant.PropertyId == propertyId)` — group by `rp.Currency`
       - Short-term rentals via: `_db.ShortTermRentals.Where(str => str.PropertyId == propertyId)` — group by `str.Currency`
       - Expenses via: `_db.Expenses.Where(e => e.PropertyId == propertyId)` — group by `e.Currency`
       - Bills via: `_db.Bills.Where(b => b.PropertyId == propertyId)` — group by `b.Currency`
     - Income = sum of Paid rent payment amounts + sum of short-term rental NetAmount (per currency)
     - Expenses = sum of expense amounts + sum of Paid bill amounts (per currency)
     - UnpaidRentCount = count of rent payments where Status == Pending AND DueDate+5 < now (matching S03 late detection)
     - UpcomingBillCount = count of bills where Status != Paid AND DueDate within 7 days
     - Build per-currency portfolio summary by aggregating across all properties
   - Log: `"Dashboard requested: UserId={UserId}, PropertyCount={Count}"`

4. **Create NotificationsController** in `GurkanApi/Controllers/NotificationsController.cs`:
   - Route: `api/notifications`, `[Authorize]`
   - Inject `ApplicationDbContext`, `IGroupAccessService`, `ILogger`
   - `GET /api/notifications`:
     - Get accessible property IDs (same pattern as Dashboard)
     - **Late rent:** Query `RentPayments` where `Tenant.PropertyId` in accessible properties, `Status == Pending`, `DueDate.AddDays(5) < DateTime.UtcNow`. For each: create notification with Type="LateRent", Severity="Critical", Message="Kira ödemesi gecikti: {TenantFullName} - {Amount} {Currency} (Vade: {DueDate:dd.MM.yyyy})"
     - **Upcoming bills:** Query `Bills` where `PropertyId` in accessible properties, `Status != BillPaymentStatus.Paid`, `DueDate <= DateTime.UtcNow.AddDays(7)` AND `DueDate >= DateTime.UtcNow`. For each: Type="UpcomingBill", Severity="Warning", Message="Fatura son ödeme yaklaşıyor: {BillType} - {Amount} {Currency} (Son ödeme: {DueDate:dd.MM.yyyy})"
     - **Overdue bills:** Query `Bills` where `Status == BillPaymentStatus.Pending`, `DueDate < DateTime.UtcNow`. Type="UpcomingBill", Severity="Critical", Message="Fatura gecikmiş: {BillType} - {Amount} {Currency} (Son ödeme: {DueDate:dd.MM.yyyy})"
     - **Lease expiry:** Query `Tenants` where `PropertyId` in accessible properties, `IsActive == true`, `LeaseEnd` within 90 days of now. Severity based on proximity: ≤30 days = "Critical", ≤60 days = "Warning", ≤90 days = "Info". Message="Kira sözleşmesi bitiyor: {FullName} (Bitiş: {LeaseEnd:dd.MM.yyyy})"
     - **Rent increase:** Query `RentIncreases` via `_db.RentIncreases.Include(ri => ri.Tenant)` where `Tenant.PropertyId` in accessible properties, `EffectiveDate > DateTime.UtcNow`, `EffectiveDate <= DateTime.UtcNow.AddDays(30)`. Type="RentIncrease", Severity="Info", Message="Kira artışı yaklaşıyor: {TenantFullName} - {NewAmount} {Currency} (Tarih: {EffectiveDate:dd.MM.yyyy})"
     - Sort all notifications by Severity (Critical first, then Warning, then Info), then by Date ascending
   - Log: `"Notifications requested: UserId={UserId}, Count={Count}"`

5. **Verify build:** Run `dotnet build GurkanApi/` — must compile with zero errors.

6. **Verify endpoints exist in Swagger:** Start the API and confirm both endpoints appear in Swagger UI at `/swagger/index.html`.

## Must-Haves

- [ ] DashboardResponse DTO with per-currency summary and per-property breakdown
- [ ] NotificationItem DTO with type, severity, message, propertyId, relatedEntityId, date
- [ ] DashboardController GET /api/dashboard with group-based access control and multi-currency aggregation
- [ ] NotificationsController GET /api/notifications with query-time notification generation
- [ ] Late rent detection uses same DueDate+5 threshold as S03 RentPaymentsController
- [ ] Rent payment income aggregated by joining through Tenant (RentPayment.TenantId → Tenant.PropertyId)
- [ ] Never sum amounts across different currencies
- [ ] Structured logging on both endpoints

## Verification

- `dotnet build GurkanApi/` compiles with zero errors
- Swagger UI shows GET /api/dashboard and GET /api/notifications with correct response schemas
- Manual Swagger test: login → call GET /api/dashboard → returns JSON with Summary and Properties arrays

## Observability Impact

- Signals added: Structured log on every dashboard/notification request with UserId and result count
- How a future agent inspects this: Swagger UI for endpoint schemas, application logs for request tracing
- Failure state exposed: 403 on unauthorized access, 500 with stack trace on aggregation query failure

## Inputs

- `GurkanApi/Entities/Tenant.cs` — Tenant entity with PropertyId, LeaseEnd, IsActive, Currency
- `GurkanApi/Entities/RentPayment.cs` — RentPayment with TenantId (NOT PropertyId), Amount, Currency, DueDate, Status
- `GurkanApi/Entities/ShortTermRental.cs` — ShortTermRental with PropertyId, NetAmount, Currency
- `GurkanApi/Entities/Expense.cs` — Expense with PropertyId, Amount, Currency
- `GurkanApi/Entities/Bill.cs` — Bill with PropertyId, Amount, Currency, DueDate, Status (BillPaymentStatus)
- `GurkanApi/Entities/RentIncrease.cs` — RentIncrease with TenantId, NewAmount, EffectiveDate
- `GurkanApi/Services/IGroupAccessService.cs` — GetUserGroupIdsAsync(), CanAccessPropertyAsync()
- `GurkanApi/Extensions/ClaimsPrincipalExtensions.cs` — GetUserId(), GetRole()
- `GurkanApi/Controllers/PropertiesController.cs` — reference pattern for SuperAdmin vs member property filtering (lines 38-48)
- `GurkanApi/Controllers/RentPaymentsController.cs` — reference for DueDate+5 late detection in MapPaymentResponse()
- `GurkanApi/Entities/Enums.cs` — RentPaymentStatus.Pending, BillPaymentStatus.Paid, Currency enum

## Expected Output

- `GurkanApi/DTOs/Dashboard/DashboardResponse.cs` — all dashboard DTOs (DashboardResponse, CurrencySummary, PropertyFinancials, CurrencyAmount)
- `GurkanApi/DTOs/Notifications/NotificationResponse.cs` — NotificationItem DTO
- `GurkanApi/Controllers/DashboardController.cs` — GET /api/dashboard with full aggregation logic
- `GurkanApi/Controllers/NotificationsController.cs` — GET /api/notifications with query-time notification generation
