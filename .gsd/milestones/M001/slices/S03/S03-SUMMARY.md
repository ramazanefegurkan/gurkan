---
id: S03
parent: M001
milestone: M001
provides:
  - Tenant CRUD with full lifecycle (create, update, terminate) and single active tenant enforcement
  - Automatic monthly RentPayment generation from lease dates
  - Query-time late detection (Pending + DueDate+5 < now → "Late")
  - Rent increase with propagation to future pending payment amounts
  - Short-term rental CRUD with date overlap validation and platform tracking (Airbnb/Booking/Direct)
  - 4 controllers (14 endpoints), 12 DTOs, 4 entities, 3 enums
  - 13 integration tests proving all business logic paths
  - 7 React pages with PropertyLayout tab navigation pattern
  - 15 API client functions
requires:
  - slice: S02
    provides: Property entity, IGroupAccessService, PropertyDetail page, API client pattern
  - slice: S01
    provides: JWT middleware, ApplicationDbContext, auth context
affects:
  - S06
key_files:
  - GurkanApi/Entities/Tenant.cs
  - GurkanApi/Entities/RentPayment.cs
  - GurkanApi/Entities/ShortTermRental.cs
  - GurkanApi/Entities/RentIncrease.cs
  - GurkanApi/Controllers/TenantsController.cs
  - GurkanApi/Controllers/RentPaymentsController.cs
  - GurkanApi/Controllers/ShortTermRentalsController.cs
  - GurkanApi/Controllers/RentIncreasesController.cs
  - GurkanApi.Tests/IntegrationTests/TenantTests.cs
  - gurkan-ui/src/pages/Properties/PropertyLayout.tsx
  - gurkan-ui/src/pages/Tenants/TenantDetail.tsx
  - gurkan-ui/src/pages/ShortTermRentals/ShortTermRentalList.tsx
key_decisions:
  - Late detection computed at query time in response mapping — never mutates DB status
  - RentPaymentResponse.Status is string (not enum) to support computed "Late" value
  - PropertyLayout with React Router nested routes + Outlet for persistent tab navigation
  - toUtcIso() helper for all frontend date submissions to avoid PostgreSQL DateTimeKind.Unspecified error
  - Business logic lives in controller methods (no separate service layer) since logic is endpoint-specific
  - Active tenant enforcement returns 409 Conflict; date overlap on short-term rentals also returns 409
patterns_established:
  - Nested controller pattern: tenant-scoped controllers (RentPayments, RentIncreases) verify property access AND tenant-belongs-to-property
  - PropertyLayout wrapper with Outlet for persistent tab navigation across property sub-pages
  - toUtcIso() helper for date-only form inputs sent to backend
  - Status badges with semantic colors (Paid=green, Late=red, Pending=yellow, Cancelled=gray)
observability_surfaces:
  - Structured logs on all CRUD: "Tenant {action}", "RentPayment {action}", "ShortTermRental {action}", "RentIncrease {action}" with entity IDs and UserId
  - Swagger UI at /swagger/index.html shows all 14 new endpoints
  - 409 Conflict on active tenant duplicate or date overlap; 400 on validation errors; 403 on access denial
  - dotnet test --filter "Category=S03" runs all 13 S03 integration tests
  - dotnet test GurkanApi.Tests/ runs full regression (45 tests)
drill_down_paths:
  - .gsd/milestones/M001/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S03/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001/slices/S03/tasks/T03-SUMMARY.md
  - .gsd/milestones/M001/slices/S03/tasks/T04-SUMMARY.md
duration: ~90min
verification_result: passed
completed_at: 2026-03-18
---

# S03: Kira & Kiracı Takibi

**Full tenant lifecycle (CRUD, auto-payment generation, late detection, termination, rent increases) and short-term rental tracking with 14 API endpoints, 13 integration tests, and 7 React pages — all wired into PropertyLayout tab navigation**

## What Happened

Built the complete rent and tenant tracking subsystem in four tasks:

**T01 — Data model.** Created four entities (Tenant, RentPayment, ShortTermRental, RentIncrease) and three enums (RentPaymentStatus, PaymentMethod, RentalPlatform). Configured Fluent API with decimal(18,2) for all money fields, string-stored enums, and FK cascade rules (Restrict on Tenant→Property, Cascade on everything else). Applied EF Core migration — all four tables created with correct schema.

**T02 — Controllers and business logic.** Built 4 controllers exposing 14 endpoints following the existing nested route pattern from PropertyNotesController. The core business logic: TenantsController auto-generates monthly RentPayment records from LeaseStart to LeaseEnd on tenant creation, enforces single active tenant per property (409), and terminates leases by cancelling future Pending payments. RentPaymentsController computes late status at query time (Pending + DueDate+5 < now → "Late" in response) without mutating DB state. ShortTermRentalsController validates date overlaps. RentIncreasesController propagates new amounts to future Pending payments.

**T03 — Integration tests.** 13 tests tagged `[Trait("Category", "S03")]` covering tenant create with auto-payment verification, active tenant conflict (409), cross-group access denial (403), active/inactive filter, late detection, mark-as-paid, double-pay rejection, terminate with future payment cancellation, short-term rental CRUD with overlap rejection, rent increase propagation, and multi-currency preservation. All pass alongside the 32 existing S01+S02 tests.

**T04 — Frontend.** Created PropertyLayout as a shared wrapper providing persistent tab navigation (Detaylar / Kiracılar / Kısa Dönem) via React Router nested routes with `<Outlet>`. Built TenantList (active/past sections), TenantForm (create/edit), TenantDetail (info card + payment table + mark-paid modal + terminate confirmation + rent increase history), ShortTermRentalList (table with summary stats), and ShortTermRentalForm (auto-computed night count and net amount). Added `toUtcIso()` helper to fix PostgreSQL DateTime UTC requirement on date-only form fields.

## Verification

| Check | Result |
|-------|--------|
| `dotnet test GurkanApi.Tests/ --filter "Category=S03"` | ✅ 13/13 pass |
| `dotnet test GurkanApi.Tests/` (full regression) | ✅ 45/45 pass (S01+S02+S03) |
| `cd gurkan-ui && npm run build` | ✅ TypeScript compiles, Vite bundles (335 KB JS, 26 KB CSS) |
| Browser: tenant create → auto payments → mark paid → late detection → short-term rental → rent increase → terminate | ✅ Full lifecycle verified |
| Browser console errors | ✅ None |

## Requirements Advanced

- R006 — Aylık kira ödeme takibi fully implemented: auto-generated payments, paid/late/cancelled status tracking, payment history per tenant
- R007 — Kısa dönem kiralama CRUD with platform tracking (Airbnb/Booking/Direct), commission, net amount, date overlap validation
- R014 — Multi-currency support carried through all tenant/payment/rental entities (Currency field inherited from property or set per record)
- R015 — Full kiracı yönetimi: CRUD with all fields (isim, telefon, email, TC kimlik, sözleşme tarihleri, depozito), active/inactive tracking, past tenant archive
- R022 — Lease dates (LeaseStart/LeaseEnd) stored on tenant entity — data foundation ready for S06 notification logic
- R024 — Rent increase recording with PreviousAmount/NewAmount/IncreaseRate/EffectiveDate, propagation to future payment amounts

## Requirements Validated

- R006 — Proven by 13 integration tests: auto-payment generation from lease dates, Pending→Paid transition, computed Late status on overdue (DueDate+5), termination cancels future payments. Browser-verified end-to-end.
- R007 — Proven by integration tests: short-term rental CRUD, date overlap rejection (409), NightCount computation. Browser-verified.
- R015 — Proven by integration tests: tenant CRUD, active tenant enforcement (409 on duplicate), cross-group 403, active/inactive filtering. Browser-verified.
- R024 — Proven by integration tests: rent increase creates record with computed IncreaseRate, propagates NewAmount to future Pending payments. Multi-currency preservation tested.

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

- **PropertyLayout wrapper instead of direct PropertyDetail tab embedding.** Plan specified modifying PropertyDetail with tab content — instead created a shared PropertyLayout component with React Router `<Outlet>` for persistent tab navigation. This is architecturally better: tabs persist across all sub-routes without duplicating navigation code.
- **14 endpoints instead of planned ~16.** Separate generate-payments endpoint wasn't needed since payment generation is automatic on tenant creation. Cleaner design.
- **TestFixture TRUNCATE updated in T02 instead of T03.** Moved earlier because existing tests would break after schema change.

## Known Limitations

- Late detection uses a fixed 5-day tolerance hardcoded in RentPaymentsController — not user-configurable
- Rent increase does not yet trigger a notification (deferred to S06 notification system)
- No bulk payment operations (e.g., mark all overdue as paid)
- Tenant IdentityNumber (TC kimlik) is stored as plaintext — adequate for family use but would need encryption for SaaS

## Follow-ups

- S06 needs to consume Tenant.LeaseEnd for sözleşme bitiş hatırlatması (R022)
- S06 needs to consume RentPayment late status for kira gecikme bildirimi (R012)
- S06 dashboard will aggregate RentPayment amounts and ShortTermRental income per property

## Files Created/Modified

- `GurkanApi/Entities/Tenant.cs` — new, tenant entity with all fields and nav properties
- `GurkanApi/Entities/RentPayment.cs` — new, payment entity with Status, PaymentMethod, DueDate/PaidDate
- `GurkanApi/Entities/ShortTermRental.cs` — new, short-term rental with Platform, NightlyRate, fees
- `GurkanApi/Entities/RentIncrease.cs` — new, increase record with PreviousAmount, NewAmount, IncreaseRate
- `GurkanApi/Entities/Enums.cs` — added RentPaymentStatus, PaymentMethod, RentalPlatform enums
- `GurkanApi/Data/ApplicationDbContext.cs` — 4 new DbSets + Fluent API configurations
- `GurkanApi/Migrations/20260318140121_AddTenantAndRentalEntities.cs` — EF Core migration
- `GurkanApi/Controllers/TenantsController.cs` — CRUD + active enforcement + auto-payments + terminate
- `GurkanApi/Controllers/RentPaymentsController.cs` — list with late detection + pay action
- `GurkanApi/Controllers/ShortTermRentalsController.cs` — full CRUD + date overlap validation
- `GurkanApi/Controllers/RentIncreasesController.cs` — list + create with future payment propagation
- `GurkanApi/DTOs/Tenants/` — 4 DTO files (Create, Update, Response, ListResponse)
- `GurkanApi/DTOs/RentPayments/` — 3 DTO files (Response, Update, GeneratePayments)
- `GurkanApi/DTOs/ShortTermRentals/` — 3 DTO files (Create, Update, Response)
- `GurkanApi/DTOs/RentIncreases/` — 2 DTO files (Create, Response)
- `GurkanApi.Tests/IntegrationTests/TenantTests.cs` — 13 integration tests for S03
- `GurkanApi.Tests/IntegrationTests/TestFixture.cs` — added new tables to TRUNCATE
- `gurkan-ui/src/types/index.ts` — 4 interfaces + 3 const enum objects
- `gurkan-ui/src/api/client.ts` — 15 API functions for tenants, payments, rentals, increases
- `gurkan-ui/src/App.tsx` — nested route structure with PropertyLayout wrapper
- `gurkan-ui/src/pages/Properties/PropertyLayout.tsx` — shared layout with tab navigation
- `gurkan-ui/src/pages/Properties/PropertyDetail.tsx` — simplified (navigation handled by layout)
- `gurkan-ui/src/pages/Tenants/TenantList.tsx` — active/past tenant sections
- `gurkan-ui/src/pages/Tenants/TenantForm.tsx` — create/edit dual mode
- `gurkan-ui/src/pages/Tenants/TenantDetail.tsx` — info card + payment table + modals
- `gurkan-ui/src/pages/Tenants/Tenants.css` — tenant page styles
- `gurkan-ui/src/pages/ShortTermRentals/ShortTermRentalList.tsx` — table with summary stats
- `gurkan-ui/src/pages/ShortTermRentals/ShortTermRentalForm.tsx` — auto-computed night count
- `gurkan-ui/src/pages/ShortTermRentals/ShortTermRentals.css` — short-term rental styles

## Forward Intelligence

### What the next slice should know
- S03 produces Tenant, RentPayment, ShortTermRental, RentIncrease entities — all with Currency fields. S06 dashboard should aggregate by currency, not sum across currencies.
- PropertyLayout tab pattern is now the standard for property sub-pages. S04 (expenses/bills) and S05 (documents) should add their tabs to PropertyLayout, not create separate navigation.
- Late detection is query-time only (never persisted as "Late" in DB). S06 notification logic should use the same DueDate+5 threshold when generating late rent notifications.
- `toUtcIso()` pattern in `gurkan-ui/src/pages/Tenants/TenantForm.tsx` must be used in any future form that sends dates to the backend.

### What's fragile
- The automatic payment generation in TenantsController creates all monthly payments at once on tenant creation (up to 12+ records). If lease periods are very long (5+ years), this could generate 60+ records in one transaction — acceptable for family use but would need pagination for SaaS.
- Payment count in tests depends on exact date arithmetic with `AddMonths()` — off-by-one in month calculation would cascade through multiple tests.

### Authoritative diagnostics
- `dotnet test --filter "Category=S03"` — 13 tests cover every S03 business rule; a failure here pinpoints the broken rule by test name
- Swagger UI `/swagger/index.html` — inspect all 14 endpoint schemas and try them live
- Browser DevTools Network tab filtered on `/tenants/` or `/short-term-rentals/` — trace all API calls

### What assumptions changed
- Plan assumed ~16 endpoints — actual is 14 because separate payment generation endpoint was unnecessary (auto-generates on tenant creation)
- Plan assumed modifying PropertyDetail for tabs — PropertyLayout wrapper with Outlet was a better pattern and is now the standard
