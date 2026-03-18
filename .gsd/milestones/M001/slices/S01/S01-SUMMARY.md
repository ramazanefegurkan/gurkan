---
id: S01
parent: M001
milestone: M001
provides:
  - JWT authentication (login, register, refresh token rotation, change-password)
  - Group CRUD with member management and property assignment
  - Group-based access control (superadmin → group admin → member hierarchy)
  - User management (list, role update)
  - 18 integration tests proving the full auth + access control contract
requires: []
affects:
  - S02
  - S03
  - S04
  - S05
  - S06
key_files:
  - GurkanApi/Controllers/AuthController.cs
  - GurkanApi/Controllers/GroupsController.cs
  - GurkanApi/Controllers/UsersController.cs
  - GurkanApi/Services/AuthService.cs
  - GurkanApi/Services/TokenService.cs
  - GurkanApi/Services/GroupAccessService.cs
  - GurkanApi/Data/ApplicationDbContext.cs
  - GurkanApi/Program.cs
  - GurkanApi.Tests/IntegrationTests/AuthTests.cs
  - GurkanApi.Tests/IntegrationTests/GroupAccessTests.cs
  - docker-compose.yml
key_decisions:
  - "D011: PostgreSQL on port 5434 — avoids conflict with existing infra container"
  - "D012: Runtime seed in Program.cs — avoids static password hash in migration files"
  - "D013: Swashbuckle.AspNetCore — .NET 10 removed built-in Swagger UI"
  - "D014: ClockSkew=Zero — exact JWT expiry enforcement"
  - "D015: Inline GroupAccessService checks — simpler than policy-based, queries DB for fresh data"
patterns_established:
  - "Entity configuration via Fluent API in OnModelCreating (no data annotations on entities)"
  - "Enum-to-string conversion for all enum properties (stored as varchar in DB)"
  - "Runtime seed pattern: SeedAdminAsync in Program.cs with idempotent check"
  - "Structured error responses: { error: 'error_code', message: 'Human-readable message' } on all 4xx"
  - "Auth service logs: 'Auth {action} succeeded/failed: {UserId} ({Email})'"
  - "Access control pattern: superadmin check first, then CanManageGroup/IsUserInGroup"
  - "Test DB lifecycle: TRUNCATE+reseed between test classes, parallelization disabled"
  - "ApiJsonOptions with JsonStringEnumConverter for test deserialization"
observability_surfaces:
  - "Startup log: 'Seed admin created/already exists: {Email}'"
  - "Auth success/failure logs with userId and email"
  - "Group access granted/denied logs with userId, groupId, action"
  - "Member/property lifecycle logs with actor ID"
  - "Swagger UI at /swagger/index.html"
  - "GET /api/users (superadmin) — system user state"
  - "GET /api/groups (superadmin) — system group state"
drill_down_paths:
  - .gsd/milestones/M001/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S01/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001/slices/S01/tasks/T03-SUMMARY.md
  - .gsd/milestones/M001/slices/S01/tasks/T04-SUMMARY.md
duration: 1h40m
verification_result: passed
completed_at: 2026-03-18
---

# S01: Auth & Grup Bazlı Erişim

**JWT authentication with refresh token rotation, group-based RBAC (superadmin → group admin → member), and 18 integration tests proving the full access control contract**

## What Happened

Built the complete auth and group-based access control foundation for the Gürkan property management system across 4 tasks.

**T01** scaffolded the greenfield ASP.NET Core 10 Web API project with 5 entities (User, Group, GroupMember, Property placeholder, RefreshToken), ApplicationDbContext with Fluent API configuration, PostgreSQL 16 via Docker Compose on port 5434, and an EF Core migration. The seed superadmin is created at runtime (not via HasData) to avoid static password hashes in migration files.

**T02** implemented the full JWT authentication pipeline: login with PasswordHasher verification, register (superadmin-only), refresh token rotation (old token revoked on use), and change-password. JWT claims include userId, email, role, and group memberships. ClaimsPrincipalExtensions provide helper methods for extracting identity from tokens.

**T03** added GroupsController (9 endpoints: CRUD, member add/remove, property assign/unassign) and UsersController (list all, update role). GroupAccessService provides 5 access-check methods that always short-circuit for superadmin. All authorization is inline in controllers using the service — simpler than policy-based and queries DB directly for fresh data.

**T04** created 18 xUnit integration tests against a real PostgreSQL test database (`gurkan_test`). Tests cover: seed admin login, register, refresh token rotation, change password, invalid credentials, group CRUD, member management, cross-group access denial (403), superadmin delegation, and property assignment. Three issues were resolved: EF Core version conflicts (pinned 10.0.5), JSON enum deserialization mismatch (shared ApiJsonOptions), and test parallelism race conditions (disabled via assembly attribute).

## Verification

`dotnet test GurkanApi.Tests/ --filter "Category=S01"` — **18 passed, 0 failed, 0 skipped** (6.0s)

- ✅ Seed admin login → valid JWT
- ✅ Register new user → can login
- ✅ Refresh token → new pair + old token rejected
- ✅ Change password → old fails, new works
- ✅ Invalid credentials → 401
- ✅ Unauthenticated request → 401
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

## Requirements Advanced

- R002 (Grup bazlı erişim) — validated: 18 integration tests prove group membership controls access, cross-group access returns 403
- R003 (Superadmin tüm yetki) — validated: tests prove superadmin creates groups, sees all groups/users, manages roles
- R004 (Grup admin delegasyonu) — validated: tests prove superadmin delegates, group admin manages own group, blocked from other groups
- R005 (Email+şifre JWT auth) — validated: tests prove login, register, refresh rotation, change password, 401/403 enforcement

## Requirements Validated

- R002 — group-based access control works end-to-end with 403 enforcement
- R003 — superadmin has full system access
- R004 — group admin delegation and scoped management
- R005 — JWT auth with refresh token rotation

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

- `.slnx` format instead of `.sln` — .NET 10 default behavior, functionally equivalent
- PostgreSQL on port 5434 instead of 5432 — existing container occupies 5432
- Added `Swashbuckle.AspNetCore` — .NET 10 dropped built-in Swagger UI
- Dropped deprecated `Microsoft.AspNetCore.Identity` package — PasswordHasher available from shared framework
- Added `RefreshRequest` DTO (not in plan) — needed for proper JSON body model binding
- Added `AssignPropertyRequest` DTO (not in plan) — needed for property assignment body binding

## Known Limitations

- Property entity is a placeholder (Id, Name, GroupId only) — S02 will flesh it out with type, address, currency, etc.
- GroupMemberships JWT claim is populated at login time — stale until next login. GroupAccessService compensates by querying DB directly.
- EF Core `MultipleCollectionIncludeWarning` fires on group queries with members + properties — not a correctness issue but should configure `QuerySplittingBehavior` in S02.

## Follow-ups

- none — all planned work completed and verified

## Files Created/Modified

- `GurkanApi.slnx` — solution file (.NET 10 XML format)
- `GurkanApi/GurkanApi.csproj` — project with NuGet packages
- `GurkanApi/Program.cs` — DbContext, JWT auth, Swagger, CORS, JSON config, seed admin, DI registrations
- `GurkanApi/appsettings.json` — connection string (port 5434), JWT config, seed admin
- `GurkanApi/appsettings.Development.json` — development overrides
- `GurkanApi/Entities/*.cs` — User, Group, GroupMember, Property, RefreshToken, Enums
- `GurkanApi/Data/ApplicationDbContext.cs` — Fluent API configuration
- `GurkanApi/Controllers/AuthController.cs` — login, register, refresh, change-password
- `GurkanApi/Controllers/GroupsController.cs` — 9 endpoints for group CRUD, members, properties
- `GurkanApi/Controllers/UsersController.cs` — list users, update role
- `GurkanApi/Services/*.cs` — AuthService, TokenService, GroupAccessService + interfaces
- `GurkanApi/DTOs/Auth/*.cs` — LoginRequest, RegisterRequest, TokenResponse, ChangePasswordRequest, RefreshRequest
- `GurkanApi/DTOs/Groups/*.cs` — CreateGroupRequest, UpdateGroupRequest, AddMemberRequest, AssignPropertyRequest, GroupResponse, GroupMemberResponse
- `GurkanApi/DTOs/Users/*.cs` — UserResponse, UpdateRoleRequest
- `GurkanApi/Extensions/ClaimsPrincipalExtensions.cs` — JWT claim extraction helpers
- `GurkanApi/Migrations/*` — InitialCreate migration
- `docker-compose.yml` — PostgreSQL 16-alpine on port 5434
- `GurkanApi.Tests/GurkanApi.Tests.csproj` — xUnit test project
- `GurkanApi.Tests/AssemblyInfo.cs` — disable test parallelization
- `GurkanApi.Tests/IntegrationTests/TestFixture.cs` — CustomWebApplicationFactory with test DB
- `GurkanApi.Tests/IntegrationTests/HttpClientExtensions.cs` — LoginAsAsync, ReadAsApiJsonAsync
- `GurkanApi.Tests/IntegrationTests/AuthTests.cs` — 7 auth tests
- `GurkanApi.Tests/IntegrationTests/GroupAccessTests.cs` — 11 group access tests

## Forward Intelligence

### What the next slice should know
- JWT auth middleware is fully configured in Program.cs — add `[Authorize]` to any new controller and it works
- `GroupAccessService.CanAccessProperty(userId, propertyId)` already exists but Property is placeholder — S02 needs to flesh out the Property entity and this method will work as-is
- `ClaimsPrincipalExtensions.GetUserId()` and `IsSuperAdmin()` are the standard way to check identity in controllers
- Test infrastructure (`CustomWebApplicationFactory`, `HttpClientExtensions`) is ready — new test classes just need `[Trait("Category", "S02")]` and `IClassFixture<CustomWebApplicationFactory<Program>>`

### What's fragile
- GroupMemberships JWT claim is snapshot-at-login — if membership changes between requests, the claim is stale. GroupAccessService queries DB to compensate, but any code reading the claim directly gets stale data.
- Test DB cleanup uses TRUNCATE CASCADE — if new tables with FKs are added, they must be included in the TRUNCATE list in TestFixture.cs.

### Authoritative diagnostics
- `dotnet test GurkanApi.Tests/ --filter "Category=S01"` — the definitive verification command, 18 tests cover all auth+access scenarios
- Swagger UI at `http://localhost:5000/swagger/index.html` — interactive API exploration
- `docker exec gurkan-postgres psql -U postgres -d gurkan -c 'SELECT "Email","Role" FROM "Users"'` — check user state

### What assumptions changed
- Assumed .NET 10 had built-in Swagger UI — it doesn't, needed Swashbuckle
- Assumed `.sln` format — .NET 10 defaults to `.slnx` (XML-based)
- Assumed `Microsoft.AspNetCore.Identity` package needed — PasswordHasher is in shared framework
