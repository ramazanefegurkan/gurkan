---
id: T03
parent: S03
milestone: M001
provides:
  - 13 integration tests covering all S03 business logic (tenant CRUD, access control, payment generation, late detection, payment marking, termination, short-term rentals, rent increases)
key_files:
  - GurkanApi.Tests/IntegrationTests/TenantTests.cs
key_decisions:
  - TestFixture TRUNCATE order already correct from T01 — no modification needed
  - Tests use fixed UTC dates for deterministic payment count assertions, relative dates for late detection
patterns_established:
  - Nested controller test pattern: setup creates groups, users, memberships, then properties; each test creates tenants/payments as needed
  - Late detection tested via lease starting 3 months in past so DueDate+5 < now is guaranteed true for old payments
observability_surfaces:
  - "dotnet test --filter Category=S03" runs all 13 S03 integration tests
  - Each test name maps to one business rule (e.g. TerminateTenant_CancelsFuturePayments)
  - Full regression: "dotnet test GurkanApi.Tests/" runs all 45 tests (S01+S02+S03)
duration: ~15min
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T03: Write integration tests covering all S03 business logic

**Added 13 integration tests proving tenant lifecycle, payment automation, late detection, termination cascades, short-term rental CRUD, and rent increase propagation — all 45 tests pass**

## What Happened

Wrote `TenantTests.cs` with 13 `[Fact]` methods tagged `[Trait("Category", "S03")]`, following the exact pattern from `PropertyTests.cs` (WebApplicationFactory, `LoginAsAsync`, `ReadAsApiJsonAsync<T>`).

Test coverage:
- **Tenant CRUD & access control (5 tests):** create with auto-payment verification (6 months → 6 payments), active tenant conflict (409), cross-group access denial (403), active/inactive filter, update persistence
- **Rent payments & late detection (3 tests):** computed Late status on overdue payments (DueDate+5 < now), mark-as-paid with PaymentMethod/Notes, double-pay rejection (400)
- **Lease termination (1 test):** terminate sets IsActive=false, cancels all future Pending payments
- **Short-term rentals (2 tests):** create with NightCount verification, full CRUD lifecycle (create→update→list→delete)
- **Rent increases (2 tests):** increase propagates to future payment amounts with correct PreviousAmount/IncreaseRate computation; multi-currency (USD) tenant preserves currency through increase

TestFixture.cs already had the TRUNCATE tables added in T01 — no modification needed.

## Verification

- `dotnet test GurkanApi.Tests/ --filter "Category=S03"` → 13 passed, 0 failed
- `dotnet test GurkanApi.Tests/` → 45 passed, 0 failed (full regression including S01+S02)

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `dotnet test GurkanApi.Tests/ --filter "Category=S03"` | 0 | ✅ pass | 6.5s |
| 2 | `dotnet test GurkanApi.Tests/` | 0 | ✅ pass | 12.9s |

## Diagnostics

- Run `dotnet test --filter "Category=S03" -v normal` to see per-test timing and structured log output
- Test names are self-documenting: a failure in `CreateRentIncrease_UpdatesFuturePayments` means the rent increase → payment update cascade is broken
- Each test resets DB via `ResetDatabaseAsync()` (TRUNCATE + re-seed) so tests are isolated

## Deviations

- TestFixture.cs TRUNCATE already included new tables from T01 — step 2 was a no-op
- 13 tests instead of the plan's 12 minimum; `CreateRentIncrease_MultiCurrency` added for currency preservation confidence

## Known Issues

None.

## Files Created/Modified

- `GurkanApi.Tests/IntegrationTests/TenantTests.cs` — new, 13 integration tests for S03 business logic
- `.gsd/milestones/M001/slices/S03/tasks/T03-PLAN.md` — added Observability Impact section
