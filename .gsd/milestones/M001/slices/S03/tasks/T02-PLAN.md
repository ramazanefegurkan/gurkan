---
estimated_steps: 8
estimated_files: 18
---

# T02: Build all controllers and DTOs with business logic

**Slice:** S03 — Kira & Kiracı Takibi
**Milestone:** M001

## Description

Build all 4 controllers (Tenants, RentPayments, ShortTermRentals, RentIncreases) and their DTOs. This is the core API surface — ~16 endpoints with significant business logic in tenant creation (auto-generate payments), termination (cancel future payments), rent increases (propagate to future payments), and late detection (computed at query time).

All controllers follow the PropertyNotesController nested route pattern: route under `/api/properties/{propertyId}/...`, check property access first via IGroupAccessService, then operate on child entities. Read `PropertyNotesController.cs` and `PropertiesController.cs` for exact patterns.

## Steps

1. **Read existing controller patterns** — Read `GurkanApi/Controllers/PropertyNotesController.cs` (nested route pattern, access check flow) and `GurkanApi/Controllers/PropertiesController.cs` (full CRUD pattern, structured error responses). These are the templates to follow exactly.

2. **Create Tenant DTOs** — `GurkanApi/DTOs/Tenants/`:
   - `CreateTenantRequest.cs`: FullName (required), Phone?, Email?, IdentityNumber?, LeaseStart, LeaseEnd, MonthlyRent, Deposit, Currency
   - `UpdateTenantRequest.cs`: same fields as create (all optional except FullName)
   - `TenantResponse.cs`: all entity fields + Id + PropertyId + timestamps
   - `TenantListResponse.cs`: Id, FullName, Phone, Email, LeaseStart, LeaseEnd, MonthlyRent, Currency, IsActive

3. **Create RentPayment DTOs** — `GurkanApi/DTOs/RentPayments/`:
   - `RentPaymentResponse.cs`: all fields including computed Status (Late when Pending + DueDate+5days < now)
   - `UpdateRentPaymentRequest.cs`: PaidDate, PaymentMethod, Notes (for marking as paid)
   - `GeneratePaymentsRequest.cs`: StartDate?, EndDate? (optional — defaults to lease period)

4. **Create ShortTermRental DTOs** — `GurkanApi/DTOs/ShortTermRentals/`:
   - `CreateShortTermRentalRequest.cs`: GuestName?, CheckIn, CheckOut, NightlyRate, TotalAmount, PlatformFee, NetAmount, Platform, Currency, Notes?
   - `UpdateShortTermRentalRequest.cs`: same fields
   - `ShortTermRentalResponse.cs`: all fields + Id + PropertyId + NightCount + CreatedAt

5. **Create RentIncrease DTOs** — `GurkanApi/DTOs/RentIncreases/`:
   - `CreateRentIncreaseRequest.cs`: NewAmount, EffectiveDate, Notes?
   - `RentIncreaseResponse.cs`: all fields + Id + TenantId + PreviousAmount + IncreaseRate + CreatedAt

6. **Build TenantsController** — `[Route("api/properties/{propertyId:guid}/tenants")]`:
   - `GET /` — list all tenants for property (include `?active=true/false` filter)
   - `GET /{tenantId}` — single tenant detail
   - `POST /` — create tenant. **Business logic**: (a) check no other active tenant exists for this property when IsActive=true (return 409 Conflict if exists), (b) auto-generate monthly RentPayment records from LeaseStart to LeaseEnd with Status=Pending, Amount=MonthlyRent, Currency=tenant's currency, DueDate=same day of month as LeaseStart
   - `PUT /{tenantId}` — update tenant info
   - `POST /{tenantId}/terminate` — **Business logic**: set IsActive=false, set LeaseEnd to today (or request body date), mark all future Pending payments as Cancelled
   - All endpoints: load property → check access via IGroupAccessService → operate
   - Structured logging: `"Tenant {action}: TenantId={TenantId}, PropertyId={PropertyId}, By={UserId}"`

7. **Build RentPaymentsController** — `[Route("api/properties/{propertyId:guid}/tenants/{tenantId:guid}/rent-payments")]`:
   - `GET /` — list payments for tenant. **Late detection**: for each payment, if Status==Pending and DueDate.AddDays(5) < DateTime.UtcNow, map Status as "Late" in response DTO (don't mutate DB). Include `?status=Pending/Paid/Late/Cancelled` filter.
   - `PATCH /{paymentId}/pay` — mark as paid: set Status=Paid, PaidDate=request.PaidDate (or UtcNow), PaymentMethod=request.PaymentMethod. Reject if status is already Paid or Cancelled.
   - Access check: load property from tenant's PropertyId → check via IGroupAccessService
   - Also verify tenantId belongs to propertyId

8. **Build ShortTermRentalsController and RentIncreasesController**:
   - ShortTermRentalsController at `[Route("api/properties/{propertyId:guid}/short-term-rentals")]`: full CRUD (GET list, GET detail, POST create, PUT update, DELETE). Compute NightCount from CheckIn/CheckOut. Optional: validate no date overlap with existing rentals for same property.
   - RentIncreasesController at `[Route("api/properties/{propertyId:guid}/tenants/{tenantId:guid}/rent-increases")]`: GET list, POST create. **Business logic on POST**: (a) record PreviousAmount from tenant's current MonthlyRent, (b) compute IncreaseRate = (NewAmount - PreviousAmount) / PreviousAmount * 100, (c) update Tenant.MonthlyRent to NewAmount, (d) update all future Pending RentPayments (DueDate >= EffectiveDate) to new Amount.

## Must-Haves

- [ ] TenantsController with CRUD + active tenant enforcement (409) + auto payment generation + terminate
- [ ] RentPaymentsController with list (computed late status) + pay action
- [ ] ShortTermRentalsController with full CRUD
- [ ] RentIncreasesController with list + create (propagates to future payments)
- [ ] All controllers check property access via IGroupAccessService before any operation
- [ ] All DTOs follow existing naming conventions (Create*Request, Update*Request, *Response)
- [ ] Structured logging on all CRUD operations with UserId, entity IDs
- [ ] Late detection computed at query time: Pending + DueDate+5days < UtcNow → Late in response
- [ ] Terminate sets future Pending payments to Cancelled
- [ ] Rent increase updates future Pending payment amounts
- [ ] `dotnet build GurkanApi/` compiles without errors

## Verification

- `dotnet build GurkanApi/` — compiles cleanly
- Run the API and verify Swagger UI at `/swagger/index.html` shows all new endpoints (~16) with correct request/response schemas
- Manually test via Swagger: create tenant → verify payments generated → call pay endpoint → call terminate endpoint

## Observability Impact

- Signals added: structured logs on all tenant/payment/rental/increase CRUD operations
- How a future agent inspects: grep logs for "Tenant", "RentPayment", "ShortTermRental", "RentIncrease" + action keywords
- Failure state exposed: 409 Conflict on duplicate active tenant, 400 on validation failures, 403 on access denial — all with JSON `{ error, message }` body

## Inputs

- `GurkanApi/Entities/Tenant.cs` — entity from T01
- `GurkanApi/Entities/RentPayment.cs` — entity from T01
- `GurkanApi/Entities/ShortTermRental.cs` — entity from T01
- `GurkanApi/Entities/RentIncrease.cs` — entity from T01
- `GurkanApi/Entities/Enums.cs` — enums from T01
- `GurkanApi/Data/ApplicationDbContext.cs` — DbSets from T01
- `GurkanApi/Controllers/PropertyNotesController.cs` — nested controller pattern to follow
- `GurkanApi/Controllers/PropertiesController.cs` — access check pattern to follow
- `GurkanApi/Services/GroupAccessService.cs` — IGroupAccessService interface to inject

## Expected Output

- `GurkanApi/Controllers/TenantsController.cs` — new, ~200 lines
- `GurkanApi/Controllers/RentPaymentsController.cs` — new, ~120 lines
- `GurkanApi/Controllers/ShortTermRentalsController.cs` — new, ~150 lines
- `GurkanApi/Controllers/RentIncreasesController.cs` — new, ~100 lines
- `GurkanApi/DTOs/Tenants/CreateTenantRequest.cs` — new
- `GurkanApi/DTOs/Tenants/UpdateTenantRequest.cs` — new
- `GurkanApi/DTOs/Tenants/TenantResponse.cs` — new
- `GurkanApi/DTOs/Tenants/TenantListResponse.cs` — new
- `GurkanApi/DTOs/RentPayments/RentPaymentResponse.cs` — new
- `GurkanApi/DTOs/RentPayments/UpdateRentPaymentRequest.cs` — new
- `GurkanApi/DTOs/RentPayments/GeneratePaymentsRequest.cs` — new
- `GurkanApi/DTOs/ShortTermRentals/CreateShortTermRentalRequest.cs` — new
- `GurkanApi/DTOs/ShortTermRentals/UpdateShortTermRentalRequest.cs` — new
- `GurkanApi/DTOs/ShortTermRentals/ShortTermRentalResponse.cs` — new
- `GurkanApi/DTOs/RentIncreases/CreateRentIncreaseRequest.cs` — new
- `GurkanApi/DTOs/RentIncreases/RentIncreaseResponse.cs` — new
