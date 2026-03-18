---
estimated_steps: 6
estimated_files: 7
---

# T01: Define entities, enums, DbContext configuration, and EF Core migration

**Slice:** S03 — Kira & Kiracı Takibi
**Milestone:** M001

## Description

Create the 4 new entities (Tenant, RentPayment, ShortTermRental, RentIncrease), add 3 new enums (RentPaymentStatus, PaymentMethod, RentalPlatform), configure DbContext with Fluent API (decimal precision, FK cascade rules), and generate + apply the EF Core migration. This is the data foundation — all controllers, tests, and frontend depend on these tables existing.

Key design decisions from research + context:
- **RentPaymentStatus**: Pending, Paid, Late, Cancelled — Late is computed at query time (not stored), Cancelled is for terminated lease future payments
- **PaymentMethod**: Cash, BankTransfer, Check
- **RentalPlatform**: Airbnb, Booking, Direct
- **Tenant→Property FK**: `DeleteBehavior.Restrict` (don't cascade-delete tenants when property is deleted)
- **RentPayment→Tenant FK**: `DeleteBehavior.Cascade` (delete payments when tenant is deleted)
- **RentIncrease→Tenant FK**: `DeleteBehavior.Cascade`
- **ShortTermRental→Property FK**: `DeleteBehavior.Cascade`
- All money fields use `decimal(18,2)` via `HasColumnType("decimal(18,2)")` in Fluent API

## Steps

1. **Read existing patterns** — Read `GurkanApi/Entities/Property.cs`, `GurkanApi/Entities/Enums.cs`, and the Property section of `GurkanApi/Data/ApplicationDbContext.cs` to follow established conventions exactly.

2. **Add enums to Enums.cs** — Append `RentPaymentStatus` (Pending, Paid, Late, Cancelled), `PaymentMethod` (Cash, BankTransfer, Check), and `RentalPlatform` (Airbnb, Booking, Direct) to the existing Enums.cs file. Follow the same pattern as PropertyType and Currency enums.

3. **Create Tenant entity** — `GurkanApi/Entities/Tenant.cs`:
   - `Guid Id`, `Guid PropertyId`, `string FullName`, `string? Phone`, `string? Email`, `string? IdentityNumber`
   - `DateTime LeaseStart`, `DateTime LeaseEnd`, `decimal MonthlyRent`, `decimal Deposit`, `Currency Currency`
   - `bool IsActive`, `DateTime CreatedAt`, `DateTime UpdatedAt`
   - Navigation properties: `Property Property`, `ICollection<RentPayment> RentPayments`, `ICollection<RentIncrease> RentIncreases`

4. **Create RentPayment, ShortTermRental, RentIncrease entities**:
   - `RentPayment.cs`: `Guid Id`, `Guid TenantId`, `decimal Amount`, `Currency Currency`, `DateTime DueDate`, `DateTime? PaidDate`, `RentPaymentStatus Status`, `PaymentMethod? PaymentMethod`, `string? Notes`, `DateTime CreatedAt`. Nav: `Tenant Tenant`.
   - `ShortTermRental.cs`: `Guid Id`, `Guid PropertyId`, `string? GuestName`, `DateTime CheckIn`, `DateTime CheckOut`, `int NightCount`, `decimal NightlyRate`, `decimal TotalAmount`, `decimal PlatformFee`, `decimal NetAmount`, `RentalPlatform Platform`, `Currency Currency`, `string? Notes`, `DateTime CreatedAt`. Nav: `Property Property`.
   - `RentIncrease.cs`: `Guid Id`, `Guid TenantId`, `decimal PreviousAmount`, `decimal NewAmount`, `decimal IncreaseRate`, `DateTime EffectiveDate`, `string? Notes`, `DateTime CreatedAt`. Nav: `Tenant Tenant`.

5. **Configure ApplicationDbContext** — Add 4 `DbSet<>` properties. Add Fluent API in `OnModelCreating`:
   - Tenant: `HasOne(t => t.Property).WithMany().HasForeignKey(t => t.PropertyId).OnDelete(DeleteBehavior.Restrict)`. Money fields: `MonthlyRent` and `Deposit` → `HasColumnType("decimal(18,2)")`.
   - RentPayment: `HasOne(r => r.Tenant).WithMany(t => t.RentPayments).HasForeignKey(r => r.TenantId).OnDelete(DeleteBehavior.Cascade)`. Money: `Amount` → `decimal(18,2)`.
   - ShortTermRental: `HasOne(s => s.Property).WithMany().HasForeignKey(s => s.PropertyId).OnDelete(DeleteBehavior.Cascade)`. Money: `NightlyRate`, `TotalAmount`, `PlatformFee`, `NetAmount` → all `decimal(18,2)`.
   - RentIncrease: `HasOne(r => r.Tenant).WithMany(t => t.RentIncreases).HasForeignKey(r => r.TenantId).OnDelete(DeleteBehavior.Cascade)`. Money: `PreviousAmount`, `NewAmount`, `IncreaseRate` → `decimal(18,2)`.

6. **Generate and apply migration**:
   - `dotnet ef migrations add AddTenantAndRentalEntities --project GurkanApi/`
   - `dotnet ef database update --project GurkanApi/`
   - Verify migration applies cleanly.

## Must-Haves

- [ ] Tenant entity with all fields (FullName, Phone, Email, IdentityNumber, LeaseStart, LeaseEnd, MonthlyRent, Deposit, Currency, IsActive, timestamps)
- [ ] RentPayment entity with Status enum and optional PaymentMethod
- [ ] ShortTermRental entity with Platform enum and all financial fields
- [ ] RentIncrease entity with PreviousAmount, NewAmount, IncreaseRate, EffectiveDate
- [ ] RentPaymentStatus enum includes Cancelled state (for terminated leases)
- [ ] All money fields configured as decimal(18,2) in Fluent API
- [ ] Tenant→Property FK uses DeleteBehavior.Restrict
- [ ] EF Core migration generated and applied successfully
- [ ] `dotnet build GurkanApi/` compiles without errors

## Verification

- `dotnet build GurkanApi/` — compiles cleanly
- `dotnet ef database update --project GurkanApi/` — migration applies without errors
- Verify migration file contains correct table definitions (Tenants, RentPayments, ShortTermRentals, RentIncreases) with expected columns and FK constraints

## Inputs

- `GurkanApi/Entities/Property.cs` — follow entity conventions (Guid Id, DateTime timestamps)
- `GurkanApi/Entities/Enums.cs` — existing enums to extend (PropertyType, Currency)
- `GurkanApi/Data/ApplicationDbContext.cs` — existing Fluent API patterns to follow

## Expected Output

- `GurkanApi/Entities/Tenant.cs` — new entity file
- `GurkanApi/Entities/RentPayment.cs` — new entity file
- `GurkanApi/Entities/ShortTermRental.cs` — new entity file
- `GurkanApi/Entities/RentIncrease.cs` — new entity file
- `GurkanApi/Entities/Enums.cs` — modified with 3 new enums
- `GurkanApi/Data/ApplicationDbContext.cs` — modified with 4 DbSets + Fluent API configs
- `GurkanApi/Migrations/*_AddTenantAndRentalEntities.cs` — new migration file
