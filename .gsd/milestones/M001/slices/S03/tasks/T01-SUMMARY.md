---
id: T01
parent: S03
milestone: M001
provides:
  - Tenant entity with full fields (FullName, Phone, Email, IdentityNumber, lease dates, MonthlyRent, Deposit, Currency, IsActive, timestamps)
  - RentPayment entity with Status enum and optional PaymentMethod
  - ShortTermRental entity with Platform enum and all financial fields
  - RentIncrease entity with PreviousAmount, NewAmount, IncreaseRate, EffectiveDate
  - RentPaymentStatus, PaymentMethod, RentalPlatform enums
  - DbContext with 4 new DbSets and Fluent API configuration (decimal(18,2), FK cascade rules)
  - EF Core migration creating Tenants, RentPayments, ShortTermRentals, RentIncreases tables
key_files:
  - GurkanApi/Entities/Tenant.cs
  - GurkanApi/Entities/RentPayment.cs
  - GurkanApi/Entities/ShortTermRental.cs
  - GurkanApi/Entities/RentIncrease.cs
  - GurkanApi/Entities/Enums.cs
  - GurkanApi/Data/ApplicationDbContext.cs
  - GurkanApi/Migrations/20260318140121_AddTenantAndRentalEntities.cs
key_decisions:
  - All enum properties stored as strings via HasConversion<string>() matching existing pattern
  - MaxLength constraints added to all string fields for DB safety (FullName 200, Phone 30, Email 256, IdentityNumber 20, Notes 2000, GuestName 200)
  - Tenant→Property FK uses DeleteBehavior.Restrict; all other FKs use Cascade per plan spec
patterns_established:
  - Rental entity pattern: Guid Id, FK to parent, money fields as decimal(18,2), enum stored as string, CreatedAt with UTC default
observability_surfaces:
  - "dotnet ef migrations list --project GurkanApi/" shows AddTenantAndRentalEntities as applied
  - FK constraint violations surface as DbUpdateException with relationship context
duration: 10m
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T01: Define entities, enums, DbContext configuration, and EF Core migration

**Added Tenant, RentPayment, ShortTermRental, RentIncrease entities with 3 new enums, Fluent API configuration (decimal(18,2), Restrict/Cascade FKs), and applied EF Core migration**

## What Happened

Created four entity classes following the existing Property.cs conventions: Guid Id, nullable `DateTime? UpdatedAt` on Tenant, `= null!` on navigation properties, `= new List<>()` on collection navs. Added three enums (RentPaymentStatus, PaymentMethod, RentalPlatform) to the existing Enums.cs. Configured ApplicationDbContext with four new DbSets and Fluent API blocks — all money fields use `decimal(18,2)`, all enums use `HasConversion<string>()`, Tenant→Property FK is Restrict, all others Cascade. Generated and applied migration successfully — all four tables created with correct columns, indexes on FKs, and constraints.

## Verification

- `dotnet build GurkanApi/` — 0 errors, 0 warnings
- `dotnet ef migrations add AddTenantAndRentalEntities` — migration generated successfully
- `dotnet ef database update` — migration applied, all 4 tables created with correct schema
- `dotnet test GurkanApi.Tests/` — 32/32 tests pass (full regression, no breakage)
- Migration SQL confirmed: Tenants FK to Properties ON DELETE RESTRICT, RentPayments/RentIncreases FK to Tenants ON DELETE CASCADE, ShortTermRentals FK to Properties ON DELETE CASCADE
- All money columns are `numeric(18,2)`, all enum columns are `character varying(50)` or `character varying(10)`

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `dotnet build GurkanApi/` | 0 | ✅ pass | 3.0s |
| 2 | `dotnet ef migrations add AddTenantAndRentalEntities --project GurkanApi/` | 0 | ✅ pass | 3.3s |
| 3 | `dotnet ef database update --project GurkanApi/` | 0 | ✅ pass | 3.6s |
| 4 | `dotnet test GurkanApi.Tests/` | 0 | ✅ pass | 10.6s |

## Diagnostics

- `dotnet ef migrations list --project GurkanApi/` — confirms migration is applied
- `dotnet ef dbcontext script --project GurkanApi/` — generates full DDL for schema inspection
- FK constraint violations on Tenant→Property (Restrict) will raise `DbUpdateException` with relationship context
- Tables inspectable via direct SQL: Tenants, RentPayments, ShortTermRentals, RentIncreases

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `GurkanApi/Entities/Tenant.cs` — new entity with all fields, nav properties to Property, RentPayments, RentIncreases
- `GurkanApi/Entities/RentPayment.cs` — new entity with TenantId FK, Status, PaymentMethod, DueDate/PaidDate
- `GurkanApi/Entities/ShortTermRental.cs` — new entity with PropertyId FK, NightlyRate, TotalAmount, PlatformFee, NetAmount, Platform
- `GurkanApi/Entities/RentIncrease.cs` — new entity with TenantId FK, PreviousAmount, NewAmount, IncreaseRate
- `GurkanApi/Entities/Enums.cs` — added RentPaymentStatus, PaymentMethod, RentalPlatform enums
- `GurkanApi/Data/ApplicationDbContext.cs` — added 4 DbSets and Fluent API configs with decimal(18,2) and FK cascade rules
- `GurkanApi/Migrations/20260318140121_AddTenantAndRentalEntities.cs` — migration file
- `GurkanApi/Migrations/20260318140121_AddTenantAndRentalEntities.Designer.cs` — migration designer
