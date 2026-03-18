---
estimated_steps: 4
estimated_files: 2
---

# T02: Integration tests for property and notes API

**Slice:** S02 — Mülk Yönetimi
**Milestone:** M001

## Description

Write comprehensive integration tests proving the property and notes API contract. Tests run against a real PostgreSQL test database using the existing CustomWebApplicationFactory infrastructure. This task retires all backend risk for S02 — after tests pass, we know CRUD works, group filtering enforces access control, multi-currency persists correctly, and notes attach to properties correctly.

Follow existing test patterns from AuthTests.cs and GroupAccessTests.cs: `[Trait("Category", "S02")]`, `IClassFixture<CustomWebApplicationFactory>`, `IAsyncLifetime` with `ResetDatabaseAsync()` in `InitializeAsync`, `LoginAsAsync` for auth, `ApiJsonOptions` for deserialization.

## Steps

1. **Update TestFixture TRUNCATE list** — In `GurkanApi.Tests/IntegrationTests/TestFixture.cs`, add `"PropertyNotes"` to the TRUNCATE statement. It must come before `"Properties"` in the list due to FK ordering. The full TRUNCATE should be: `"PropertyNotes", "RefreshTokens", "GroupMembers", "Properties", "Groups", "Users"`.

2. **Create PropertyTests.cs** — `GurkanApi.Tests/IntegrationTests/PropertyTests.cs` with `[Trait("Category", "S02")]`. The test class should:
   - Implement `IClassFixture<CustomWebApplicationFactory>, IAsyncLifetime`
   - In `InitializeAsync`: call `ResetDatabaseAsync()`, then set up test data via API calls:
     - Login as superadmin (admin@gurkan.com / Admin123!)
     - Register two users (user1, user2)
     - Create two groups (groupA, groupB)
     - Add user1 to groupA, user2 to groupB
   - Test methods (each a `[Fact]`):

   **Property CRUD:**
   - `SuperadminCreatesProperty_Returns201` — POST /api/properties with GroupId=groupA → 201, response has all fields including correct currency
   - `GroupMemberCreatesPropertyInOwnGroup_Returns201` — Login as user1, POST with GroupId=groupA → 201
   - `MemberCannotCreatePropertyInOtherGroup_Returns403` — Login as user1, POST with GroupId=groupB → 403
   - `MemberListsProperties_SeesOnlyOwnGroup` — Create properties in groupA and groupB, login as user1 → GET /api/properties returns only groupA properties
   - `MemberGetsPropertyDetail_OwnGroup_Returns200` — Login as user1, GET /api/properties/{id} for groupA property → 200 with all fields
   - `MemberCannotAccessOtherGroupProperty_Returns403` — Login as user1, GET /api/properties/{id} for groupB property → 403
   - `PropertyUpdate_Returns200` — Update property name and city → 200, response reflects changes, UpdatedAt is set
   - `PropertyDelete_Returns204` — Superadmin deletes property → 204, subsequent GET returns 404

   **Multi-currency:**
   - `CreatePropertyWithDifferentCurrencies_ReturnsCorrectCurrency` — Create properties with TRY, USD, EUR → each returns the correct currency in response

   **Property Notes:**
   - `AddNoteToProperty_Returns201` — POST /api/properties/{id}/notes with content → 201, response includes CreatedByName
   - `ListNotesForProperty_ReturnsAll` — Add 2 notes → GET returns both, ordered by CreatedAt
   - `UpdateOwnNote_Returns200` — Creator updates note content → 200
   - `DeleteOwnNote_Returns204` — Creator deletes note → 204
   - `MemberCannotAddNoteToOtherGroupProperty_Returns403` — Login as user1, POST note to groupB property → 403

3. **Add necessary DTO/response types** — If the test needs to deserialize new response types (PropertyResponse, PropertyListResponse, PropertyNoteResponse), either reference the DTO project or create matching test-side record types. Prefer referencing the API project's DTOs since the test project already references it.

4. **Run and verify** — `dotnet test GurkanApi.Tests/ --filter "Category=S02"` — all tests pass. Fix any failures by diagnosing the actual error (don't add try/catch to suppress failures).

## Must-Haves

- [ ] TestFixture TRUNCATE list includes "PropertyNotes" before "Properties"
- [ ] At least 14 integration tests covering property CRUD, group filtering, access denial, multi-currency, notes
- [ ] All tests use `[Trait("Category", "S02")]`
- [ ] `dotnet test GurkanApi.Tests/ --filter "Category=S02"` passes with 0 failures

## Verification

- `dotnet test GurkanApi.Tests/ --filter "Category=S02"` — all tests pass, 0 failures, 0 skipped
- Test output shows each test name and result

## Inputs

- `GurkanApi.Tests/IntegrationTests/TestFixture.cs` — existing factory, needs TRUNCATE update
- `GurkanApi.Tests/IntegrationTests/HttpClientExtensions.cs` — LoginAsAsync, RegisterUserAsync, ApiJsonOptions
- `GurkanApi.Tests/IntegrationTests/AuthTests.cs` — pattern reference for test structure
- `GurkanApi.Tests/IntegrationTests/GroupAccessTests.cs` — pattern reference for group setup and access control testing
- T01 output: PropertiesController, PropertyNotesController, all DTOs, migration applied

## Observability Impact

- **Test-time signals:** `dotnet test --filter "Category=S02"` outputs per-test pass/fail with names like `PropertyTests.SuperadminCreatesProperty_Returns201`, making failures immediately attributable to a specific API contract.
- **Inspection surface:** Test output includes EF Core SQL logs showing the exact queries executed (INSERT, SELECT, DELETE on Properties/PropertyNotes tables), useful for diagnosing data-layer issues.
- **Failure visibility:** A failing test names the exact endpoint + expected status code (e.g., "expected 201, got 403"), making it clear whether the issue is access control, routing, or data.

## Expected Output

- `GurkanApi.Tests/IntegrationTests/TestFixture.cs` — TRUNCATE list updated
- `GurkanApi.Tests/IntegrationTests/PropertyTests.cs` — 14+ integration tests, all passing
