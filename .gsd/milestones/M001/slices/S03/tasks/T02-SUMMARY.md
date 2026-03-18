---
id: T02
parent: S03
milestone: M001
provides:
  - 4 controllers (Tenants, RentPayments, ShortTermRentals, RentIncreases) with 14 endpoints
  - 12 DTO files (Create/Update requests + Response types)
  - Business logic: auto payment generation, active tenant enforcement (409), terminate with payment cancellation, late detection at query time, rent increase propagation to future payments
  - Date overlap validation on short-term rentals
key_files:
  - GurkanApi/Controllers/TenantsController.cs
  - GurkanApi/Controllers/RentPaymentsController.cs
  - GurkanApi/Controllers/ShortTermRentalsController.cs
  - GurkanApi/Controllers/RentIncreasesController.cs
  - GurkanApi/DTOs/Tenants/CreateTenantRequest.cs
  - GurkanApi/DTOs/RentPayments/RentPaymentResponse.cs
  - GurkanApi/DTOs/ShortTermRentals/CreateShortTermRentalRequest.cs
  - GurkanApi/DTOs/RentIncreases/CreateRentIncreaseRequest.cs
key_decisions:
  - Late detection is computed at query time in response mapping (Pending + DueDate+5 < now → "Late" string), never mutated in DB
  - RentPaymentResponse.Status is string (not enum) to support computed "Late" value without DB change
  - Payment generation uses LeaseStart day-of-month as recurring DueDate via AddMonths()
  - CheckPropertyAccess helper extracted as tuple-returning method to deduplicate access check boilerplate across all controllers
  - ShortTermRentals date overlap validation returns 409 Conflict (same pattern as active tenant enforcement)
patterns_established:
  - Nested tenant-scoped controllers (RentPayments, RentIncreases) verify both property access AND tenant-belongs-to-property before operating
  - Business logic (payment generation, terminate, rent increase) lives in controller methods — no separate service layer yet since logic is endpoint-specific
observability_surfaces:
  - Structured logs on all CRUD: "Tenant {action}", "RentPayment {action}", "ShortTermRental {action}", "RentIncrease {action}" with entity IDs and UserId
  - 409 Conflict JSON body on duplicate active tenant and date overlap
  - 400 validation_error on bad input (LeaseEnd <= LeaseStart, already-paid payment, etc.)
  - 403 forbidden JSON body on access denial
duration: 20m
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T02: Build all controllers and DTOs with business logic

**Built 4 controllers (14 endpoints) and 12 DTOs for tenant lifecycle, rent payments, short-term rentals, and rent increases with full business logic**

## What Happened

Created all DTO files first (12 files across 4 directories), then built the 4 controllers following the existing PropertyNotesController nested route pattern. Each controller uses `CheckPropertyAccess` (or `CheckTenantAccess` for tenant-scoped endpoints) to enforce group-based access before any operation.

TenantsController is the most complex — POST create enforces single active tenant per property (409 if exists), auto-generates monthly RentPayment records from LeaseStart to LeaseEnd, and POST terminate sets IsActive=false while cancelling all future Pending payments.

RentPaymentsController computes late status at query time: if a payment is Pending and DueDate+5 < UtcNow, the response Status is mapped as "Late" without mutating the database. PATCH pay rejects already-paid or cancelled payments.

ShortTermRentalsController has full CRUD with date overlap validation. RentIncreasesController records the increase, updates Tenant.MonthlyRent, and propagates the new amount to all future Pending payments.

Also updated TestFixture.cs TRUNCATE to include the 4 new tables so existing tests work correctly with the new schema.

## Verification

- `dotnet build GurkanApi/` — 0 errors, 0 warnings
- `dotnet test GurkanApi.Tests/` — 32/32 tests pass (full regression, S01 + S02)
- Swagger UI at `http://localhost:5039/swagger/index.html` — confirmed all 14 new endpoints visible with correct route patterns and request/response schemas
- Endpoint breakdown: Tenants (5: GET list, POST create, GET detail, PUT update, POST terminate), RentPayments (2: GET list, PATCH pay), ShortTermRentals (5: GET list, POST create, GET detail, PUT update, DELETE), RentIncreases (2: GET list, POST create)

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `dotnet build GurkanApi/` | 0 | ✅ pass | 1.2s |
| 2 | `dotnet test GurkanApi.Tests/` | 0 | ✅ pass | 10s |
| 3 | Swagger UI visual check — all 14 endpoints visible | n/a | ✅ pass | manual |
| 4 | `dotnet test GurkanApi.Tests/ --filter "Category=S03"` | n/a | ⏳ pending T03 | n/a |
| 5 | `cd gurkan-ui && npm run build` | n/a | ⏳ pending T04 | n/a |

## Diagnostics

- Swagger UI at `/swagger/index.html` shows all new endpoints with schemas
- Grep logs for "Tenant created:", "RentPayment paid:", "ShortTermRental created:", "RentIncrease created:" to trace CRUD operations
- 409 Conflict body `{ error: "conflict", message: "..." }` on active tenant duplicate or date overlap
- 400 body `{ error: "validation_error", message: "..." }` on bad input
- 403 body `{ error: "forbidden", message: "..." }` on access denial

## Deviations

- Plan estimated ~16 endpoints, actual is 14 — GeneratePaymentsRequest DTO was created but the separate generate-payments endpoint wasn't needed since payment generation is automatic on tenant creation. This is cleaner — no separate endpoint to call.
- Updated TestFixture.cs TRUNCATE (planned for T03) — done here because existing tests would break without it after schema change.

## Known Issues

None.

## Files Created/Modified

- `GurkanApi/DTOs/Tenants/CreateTenantRequest.cs` — new, tenant creation request with validation
- `GurkanApi/DTOs/Tenants/UpdateTenantRequest.cs` — new, partial update request
- `GurkanApi/DTOs/Tenants/TenantResponse.cs` — new, full tenant detail response
- `GurkanApi/DTOs/Tenants/TenantListResponse.cs` — new, lightweight list response
- `GurkanApi/DTOs/RentPayments/RentPaymentResponse.cs` — new, payment response with computed Status string
- `GurkanApi/DTOs/RentPayments/UpdateRentPaymentRequest.cs` — new, mark-as-paid request
- `GurkanApi/DTOs/RentPayments/GeneratePaymentsRequest.cs` — new, optional date range for payment generation
- `GurkanApi/DTOs/ShortTermRentals/CreateShortTermRentalRequest.cs` — new, short-term rental creation
- `GurkanApi/DTOs/ShortTermRentals/UpdateShortTermRentalRequest.cs` — new, partial update
- `GurkanApi/DTOs/ShortTermRentals/ShortTermRentalResponse.cs` — new, includes computed NightCount
- `GurkanApi/DTOs/RentIncreases/CreateRentIncreaseRequest.cs` — new, NewAmount + EffectiveDate
- `GurkanApi/DTOs/RentIncreases/RentIncreaseResponse.cs` — new, includes PreviousAmount + IncreaseRate
- `GurkanApi/Controllers/TenantsController.cs` — new, ~230 lines, CRUD + active enforcement + payment generation + terminate
- `GurkanApi/Controllers/RentPaymentsController.cs` — new, ~130 lines, list with late detection + pay action
- `GurkanApi/Controllers/ShortTermRentalsController.cs` — new, ~200 lines, full CRUD with date overlap validation
- `GurkanApi/Controllers/RentIncreasesController.cs` — new, ~130 lines, list + create with propagation
- `GurkanApi.Tests/IntegrationTests/TestFixture.cs` — modified, added new tables to TRUNCATE statement
