---
id: T02
parent: S02
milestone: M001
provides:
  - 14 integration tests proving property CRUD, group filtering, access denial, multi-currency, and notes API contract
key_files:
  - GurkanApi.Tests/IntegrationTests/PropertyTests.cs
key_decisions:
  - Reused API project DTOs (PropertyResponse, PropertyListResponse, PropertyNoteResponse) directly in tests rather than creating test-side record types — test project already references GurkanApi
patterns_established:
  - PropertyTests follows same IClassFixture + IAsyncLifetime + ResetDatabaseAsync pattern as GroupAccessTests; InitializeAsync sets up two groups with one member each, providing full isolation per test class run
  - Helper methods (LoginAsUserAsync, CreatePropertyViaAdminAsync, MakeCreatePropertyPayload) reduce test setup boilerplate while keeping each test self-documenting
observability_surfaces:
  - dotnet test --filter "Category=S02" outputs per-test pass/fail with descriptive method names
  - EF Core SQL logs in test output show exact queries for debugging data-layer issues
duration: 10m
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T02: Integration tests for property and notes API

**14 integration tests covering property CRUD, group-based access control, multi-currency persistence, and notes API — all passing against real PostgreSQL test database**

## What Happened

Created `PropertyTests.cs` with 14 `[Fact]` tests tagged `[Trait("Category", "S02")]`. The TestFixture TRUNCATE list already included `PropertyNotes` from T01, so no update was needed there.

Each test runs against a real PostgreSQL test database via `CustomWebApplicationFactory`. `InitializeAsync` resets the database and sets up two users in two separate groups, enabling cross-group access denial tests.

Tests cover: superadmin property creation (201), member creation in own group (201), cross-group creation denial (403), group-filtered property listing, property detail access (200 for own group, 403 for other), partial property update with UpdatedAt verification, property deletion with subsequent 404 confirmation, three-currency creation (TRY/USD/EUR), note creation with CreatedByName, note listing with ordering verification, note update, note deletion, and cross-group note denial.

## Verification

`dotnet test GurkanApi.Tests/ --filter "Category=S02"` — 14 passed, 0 failed, 0 skipped in 5.1s.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `dotnet test GurkanApi.Tests/ --filter "Category=S02" --verbosity normal` | 0 | ✅ pass | 6.9s |

## Diagnostics

- Run `dotnet test GurkanApi.Tests/ --filter "Category=S02" --verbosity normal` to see all 14 test results with EF Core SQL trace
- Individual test failures name the exact endpoint + expected vs actual status code
- Test names map directly to API contracts: e.g. `MemberCannotCreatePropertyInOtherGroup_Returns403` tests POST /api/properties with cross-group GroupId

## Deviations

- TestFixture TRUNCATE list already included "PropertyNotes" from T01 — no update needed (plan Step 1 was a no-op)

## Known Issues

None

## Files Created/Modified

- `GurkanApi.Tests/IntegrationTests/PropertyTests.cs` — 14 integration tests for property and notes API
- `.gsd/milestones/M001/slices/S02/tasks/T02-PLAN.md` — added Observability Impact section (pre-flight fix)
