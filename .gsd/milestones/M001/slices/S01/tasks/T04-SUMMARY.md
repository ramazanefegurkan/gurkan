---
id: T04
parent: S01
milestone: M001
provides:
  - 18 xUnit integration tests proving S01 auth + group access control contract
  - CustomWebApplicationFactory with real PostgreSQL test DB (gurkan_test)
  - HttpClientExtensions with LoginAsAsync and ReadAsApiJsonAsync helpers
key_files:
  - GurkanApi.Tests/GurkanApi.Tests.csproj
  - GurkanApi.Tests/IntegrationTests/TestFixture.cs
  - GurkanApi.Tests/IntegrationTests/HttpClientExtensions.cs
  - GurkanApi.Tests/IntegrationTests/AuthTests.cs
  - GurkanApi.Tests/IntegrationTests/GroupAccessTests.cs
  - GurkanApi.Tests/AssemblyInfo.cs
key_decisions:
  - "Test parallelization disabled via [assembly: CollectionBehavior(DisableTestParallelization = true)] — single shared PostgreSQL test DB requires sequential execution to avoid data races"
  - "TRUNCATE+reseed between test classes instead of EnsureDeleted+EnsureCreated — avoids migration/EnsureCreated conflict and is faster"
  - "JsonStringEnumConverter in test JsonSerializerOptions — API serializes enums as strings, test deserialization must match"
patterns_established:
  - "Test DB lifecycle: factory drops+recreates gurkan_test once per process, then TRUNCATE+reseed per test class via IAsyncLifetime.InitializeAsync"
  - "HttpClientExtensions.ApiJsonOptions matches API's camelCase+StringEnumConverter config — use ReadAsApiJsonAsync for all response deserialization in tests"
observability_surfaces:
  - "dotnet test GurkanApi.Tests/ --filter 'Category=S01' --verbosity normal — runs all 18 S01 tests"
  - "Test output shows Auth login/register/refresh succeeded/failed and Group access granted/denied logs from the API"
duration: 45min
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T04: Integration tests proving auth + group access control contract

**Added 18 xUnit integration tests against real PostgreSQL proving all S01 auth and group-based access control scenarios — login, register, refresh rotation, change password, group CRUD, member management, and role-based 403 enforcement**

## What Happened

Created xUnit test project with `Microsoft.AspNetCore.Mvc.Testing` and project reference to GurkanApi. Built `CustomWebApplicationFactory` that overrides the DB connection to a dedicated `gurkan_test` PostgreSQL database — the factory drops and recreates the DB once per test run, then uses TRUNCATE+reseed between test classes.

Two main issues surfaced during implementation:
1. **EF Core version conflict** — `Npgsql.EntityFrameworkCore.PostgreSQL` 10.0.1 pulled EF Core 10.0.4 transitively, conflicting with GurkanApi's 10.0.5. Fixed by pinning `Microsoft.EntityFrameworkCore` and `Microsoft.EntityFrameworkCore.Relational` 10.0.5 in the test project.
2. **JSON deserialization mismatch** — API serializes enums as strings via `JsonStringEnumConverter` in Program.cs, but test `GetFromJsonAsync<T>` uses default options which can't parse string enums. Fixed by creating shared `ApiJsonOptions` with `JsonStringEnumConverter` and using `ReadAsApiJsonAsync<T>` extension throughout tests.
3. **Test parallelism race condition** — xUnit runs test classes in parallel by default, but both AuthTests and GroupAccessTests share the same `gurkan_test` DB. TRUNCATE in one class's `InitializeAsync` wiped the other class's seed data mid-test. Fixed by disabling parallelization via `[assembly: CollectionBehavior(DisableTestParallelization = true)]`.

All 18 tests pass: 7 AuthTests + 11 GroupAccessTests.

## Verification

`dotnet test GurkanApi.Tests/ --filter "Category=S01" --verbosity normal` — 18 passed, 0 failed, 0 skipped.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `dotnet build GurkanApi.Tests/` | 0 | ✅ pass | 1.4s |
| 2 | `dotnet test GurkanApi.Tests/ --filter "Category=S01" --verbosity normal` | 0 | ✅ pass | 6.1s |

### Slice-level verification (S01 final task):
- ✅ Seed superadmin login → valid JWT
- ✅ Register → new user can login
- ✅ Refresh token → new pair + old token rejected (rotation)
- ✅ Change password → old fails, new works
- ✅ Invalid credentials → 401
- ✅ Unauthenticated → 401
- ✅ Regular user register attempt → 403
- ✅ Superadmin creates group → 201
- ✅ Superadmin adds user to group → 201
- ✅ Member sees only own groups
- ✅ Member cannot access other group → 403
- ✅ Superadmin delegates group admin
- ✅ Group admin adds user to own group → 201
- ✅ Group admin cannot manage other group → 403
- ✅ Superadmin sees all groups
- ✅ Superadmin sees all users
- ✅ Regular user cannot list users → 403
- ✅ Superadmin assigns property to group → 201

## Diagnostics

- **Run tests:** `dotnet test GurkanApi.Tests/ --filter "Category=S01" --verbosity normal`
- **Test DB inspection:** `docker exec gurkan-postgres psql -U postgres -d gurkan_test -c '\dt'`
- **Test logs:** Test output includes structured auth/group access log messages from the API server

## Deviations

- Removed explicit `Npgsql.EntityFrameworkCore.PostgreSQL` from test project csproj — it comes transitively via project reference. Added explicit EF Core 10.0.5 pins to resolve version conflict instead.
- Added `AssemblyInfo.cs` to disable test parallelization (not in original plan).

## Known Issues

None.

## Files Created/Modified

- `GurkanApi.Tests/GurkanApi.Tests.csproj` — xUnit test project with MVC Testing and EF Core references
- `GurkanApi.Tests/AssemblyInfo.cs` — Disables test parallelization for shared DB safety
- `GurkanApi.Tests/IntegrationTests/TestFixture.cs` — CustomWebApplicationFactory with test PostgreSQL DB lifecycle
- `GurkanApi.Tests/IntegrationTests/HttpClientExtensions.cs` — LoginAsAsync, RegisterUserAsync, ReadAsApiJsonAsync helpers
- `GurkanApi.Tests/IntegrationTests/AuthTests.cs` — 7 auth integration tests
- `GurkanApi.Tests/IntegrationTests/GroupAccessTests.cs` — 11 group access control integration tests
- `GurkanApi.slnx` — Updated to include GurkanApi.Tests project
