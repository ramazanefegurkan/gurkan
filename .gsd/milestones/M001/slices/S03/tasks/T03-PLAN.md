---
estimated_steps: 4
estimated_files: 2
---

# T03: Write integration tests covering all S03 business logic

**Slice:** S03 — Kira & Kiracı Takibi
**Milestone:** M001

## Description

Write comprehensive integration tests proving the full S03 contract: tenant CRUD with access control, automatic payment generation, late detection, payment marking, lease termination with payment cancellation, short-term rental CRUD, and rent increase propagation. These tests are the primary verification for the slice and S06's confidence that the data layer is correct.

Follow the exact pattern from `GurkanApi.Tests/IntegrationTests/PropertyTests.cs` — WebApplicationFactory, LoginAsAsync helper, ReadAsApiJsonAsync<T> for deserialization with JsonStringEnumConverter. All tests use `[Trait("Category", "S03")]`.

## Steps

1. **Read existing test patterns** — Read `GurkanApi.Tests/IntegrationTests/PropertyTests.cs` to follow the exact test structure (class setup, login helper usage, assertion patterns). Read `GurkanApi.Tests/IntegrationTests/TestFixture.cs` to understand TRUNCATE setup and `HttpClientExtensions.cs` for helper method signatures.

2. **Update TestFixture.cs** — Add new tables to the TRUNCATE statement in the correct order: `"RentIncreases"`, `"RentPayments"`, `"ShortTermRentals"`, `"Tenants"` — these must appear before `"PropertyNotes"` in the TRUNCATE list (child tables before parent tables, though CASCADE should handle order).

3. **Write TenantTests.cs** — `GurkanApi.Tests/IntegrationTests/TenantTests.cs` with `[Trait("Category", "S03")]`. Test cases to cover:

   **Tenant CRUD & access control:**
   - `CreateTenant_ReturnsCreatedWithPayments` — create tenant, verify 201, verify response has all fields, verify auto-generated RentPayment records exist (GET payments endpoint, count should match month span of lease)
   - `CreateTenant_ActiveTenantExists_Returns409` — create active tenant, try creating second active tenant for same property, verify 409 Conflict
   - `CreateTenant_CrossGroupAccess_Returns403` — login as user not in property's group, try creating tenant, verify 403
   - `GetTenants_FilterActiveAndInactive` — create active + terminated tenant, verify `?active=true` and `?active=false` filters work
   - `UpdateTenant_ReturnsOk` — update tenant name/phone, verify changes persisted

   **Rent payments & late detection:**
   - `GetRentPayments_ComputesLateStatus` — create tenant with LeaseStart in the past (e.g., 2 months ago), GET payments, verify overdue payments show "Late" status in response (DueDate + 5 days < now)
   - `MarkPaymentAsPaid_ReturnsOk` — get a Pending payment, PATCH pay with PaidDate and PaymentMethod, verify Status becomes "Paid"
   - `MarkPaymentAsPaid_AlreadyPaid_Returns400` — try paying an already-paid payment, verify rejection

   **Lease termination:**
   - `TerminateTenant_CancelsFuturePayments` — create tenant with future LeaseEnd, terminate, verify IsActive=false, verify future Pending payments have Status="Cancelled"

   **Short-term rentals:**
   - `CreateShortTermRental_ReturnsCreated` — create rental with all fields, verify 201, verify NightCount computed correctly
   - `ShortTermRentalCRUD_FullLifecycle` — create, update, list, delete — verify each step

   **Rent increases:**
   - `CreateRentIncrease_UpdatesFuturePayments` — create tenant, create rent increase with future EffectiveDate, verify PreviousAmount/IncreaseRate computed, verify future Pending payments updated to new amount
   - `CreateRentIncrease_MultiCurrency` — create tenant with USD currency, apply increase, verify currency preserved

4. **Run tests and verify regression** — Run `dotnet test GurkanApi.Tests/ --filter "Category=S03"` to verify all S03 tests pass. Then run `dotnet test GurkanApi.Tests/` for full regression to ensure S01+S02 tests are unbroken.

## Must-Haves

- [ ] ≥12 integration tests with `[Trait("Category", "S03")]`
- [ ] Tenant CRUD + active enforcement (409) tests
- [ ] Cross-group access denial (403) test
- [ ] Auto-generated payment count verification
- [ ] Late detection verification (Pending + overdue → Late in response)
- [ ] Payment marking (Paid) test
- [ ] Lease termination → future payments Cancelled test
- [ ] Short-term rental CRUD test
- [ ] Rent increase propagation test (future payment amounts updated)
- [ ] TestFixture.cs updated with new TRUNCATE tables
- [ ] `dotnet test GurkanApi.Tests/ --filter "Category=S03"` — all pass
- [ ] `dotnet test GurkanApi.Tests/` — full regression passes (S01 + S02 unbroken)

## Verification

- `dotnet test GurkanApi.Tests/ --filter "Category=S03"` — all S03 tests pass
- `dotnet test GurkanApi.Tests/` — full test suite passes (S01 + S02 + S03)
- Test count: ≥12 tests covering all major business logic paths

## Inputs

- `GurkanApi.Tests/IntegrationTests/PropertyTests.cs` — test patterns to follow
- `GurkanApi.Tests/IntegrationTests/TestFixture.cs` — TRUNCATE list to update
- `GurkanApi.Tests/IntegrationTests/HttpClientExtensions.cs` — LoginAsAsync, ReadAsApiJsonAsync helpers
- T01 entities, T02 controllers/DTOs — the API surface being tested

## Expected Output

- `GurkanApi.Tests/IntegrationTests/TenantTests.cs` — new, ≥12 test methods
- `GurkanApi.Tests/IntegrationTests/TestFixture.cs` — modified, 4 new tables in TRUNCATE
