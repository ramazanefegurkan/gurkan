---
id: T01
parent: S01
milestone: M001
provides:
  - ASP.NET Core Web API project scaffold with controller-based routing
  - Entity classes (User, Group, GroupMember, Property, RefreshToken) with enums
  - ApplicationDbContext with Fluent API configuration (composite keys, unique indexes, relationships)
  - PostgreSQL Docker service on port 5434
  - InitialCreate EF Core migration applied
  - Seed superadmin (admin@gurkan.com) created at startup via EnsureSeedData pattern
  - Swagger UI at /swagger/index.html
  - appsettings with JWT config, connection string, seed admin config
key_files:
  - GurkanApi.slnx
  - GurkanApi/GurkanApi.csproj
  - GurkanApi/Program.cs
  - GurkanApi/Data/ApplicationDbContext.cs
  - GurkanApi/Entities/User.cs
  - GurkanApi/Entities/Group.cs
  - GurkanApi/Entities/GroupMember.cs
  - GurkanApi/Entities/Property.cs
  - GurkanApi/Entities/RefreshToken.cs
  - GurkanApi/Entities/Enums.cs
  - GurkanApi/appsettings.json
  - GurkanApi/appsettings.Development.json
  - docker-compose.yml
key_decisions:
  - "D011: PostgreSQL on port 5434 to avoid conflict with existing infra container"
  - "D012: Runtime seed in Program.cs instead of HasData — avoids static password hash in migration"
  - "D013: Swashbuckle.AspNetCore for Swagger UI — .NET 10 removed built-in UI"
patterns_established:
  - "Entity configuration via Fluent API in OnModelCreating (no data annotations on entities)"
  - "Enum-to-string conversion for all enum properties (stored as varchar in DB)"
  - "Runtime seed pattern: SeedAdminAsync in Program.cs with idempotent check + structured log"
  - "Partial Program class for WebApplicationFactory integration test access"
observability_surfaces:
  - "Startup log: 'Seed admin created/already exists: {Email}' — confirms seed ran"
  - "EF Core SQL logging enabled at Information level in development"
  - "Swagger UI at /swagger/index.html for API exploration"
duration: 20m
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T01: Scaffold ASP.NET Core project, entities, DbContext and seed migration

**Scaffolded GurkanApi solution with 5 entities, PostgreSQL migration, and seed superadmin on port 5434**

## What Happened

Created a greenfield ASP.NET Core 10 Web API project with controller-based routing. Defined five entity classes (User, Group, GroupMember, Property, RefreshToken) plus two enums (UserRole, GroupMemberRole). ApplicationDbContext uses Fluent API for entity configuration: composite PK on GroupMember(UserId, GroupId), unique indexes on User.Email and RefreshToken.Token, enum-to-string conversion, and UTC default timestamps via SQL expressions.

Program.cs configures DbContext with Npgsql, Swashbuckle Swagger UI, permissive CORS, camelCase JSON with string enum serialization, and a startup seed routine. The seed pattern is runtime-based (not HasData) — reads admin credentials from appsettings, hashes password with PasswordHasher at startup, inserts if not exists, and logs the result.

Docker Compose provides PostgreSQL 16-alpine on host port 5434 (5432 was occupied). The InitialCreate migration was generated and applied successfully. Seed admin is confirmed in the Users table.

Encountered two .NET 10 differences from the plan: `.slnx` format instead of `.sln`, and no built-in Swagger UI (added Swashbuckle). Also dropped the deprecated `Microsoft.AspNetCore.Identity` package — PasswordHasher is available from the shared framework.

## Verification

- `dotnet build GurkanApi/` — 0 warnings, 0 errors ✅
- `docker compose up -d db` — PostgreSQL container running ✅
- `dotnet ef database update --project GurkanApi/` — InitialCreate migration applied ✅
- `dotnet run --project GurkanApi/` — API starts, "Seed admin created" logged ✅
- `curl http://localhost:5000/swagger/index.html` — 200 OK ✅
- DB verification: `SELECT * FROM "Users"` — admin@gurkan.com with Role=SuperAdmin ✅
- DB verification: `\d "GroupMembers"` — composite PK (UserId, GroupId) with FKs ✅
- DB verification: `\d "Users"` — IX_Users_Email UNIQUE, FK to GroupMembers+RefreshTokens ✅
- DB verification: `\d "RefreshTokens"` — IX_RefreshTokens_Token UNIQUE ✅

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `dotnet build GurkanApi/` | 0 | ✅ pass | 0.8s |
| 2 | `docker compose up -d db` | 0 | ✅ pass | 2s |
| 3 | `dotnet ef database update --project GurkanApi/` | 0 | ✅ pass | 5s |
| 4 | `dotnet run --project GurkanApi/ --urls http://localhost:5000` | 0 | ✅ pass | 3s startup |
| 5 | `curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/swagger/index.html` | 0 (200) | ✅ pass | <1s |
| 6 | `psql: SELECT FROM "Users" WHERE Email=admin@gurkan.com` | 0 (1 row) | ✅ pass | <1s |
| 7 | `psql: \d "GroupMembers"` — composite PK confirmed | 0 | ✅ pass | <1s |

Slice-level verification (`dotnet test GurkanApi.Tests/ --filter "Category=S01"`) — not applicable yet, test project created in T04.

## Diagnostics

- **Seed status:** Run app, check startup logs for "Seed admin created/already exists"
- **Schema inspection:** `docker exec gurkan-postgres psql -U postgres -d gurkan -c "\dt"` lists all tables
- **Table structure:** `docker exec gurkan-postgres psql -U postgres -d gurkan -c '\d "TableName"'`
- **Seed data:** `docker exec gurkan-postgres psql -U postgres -d gurkan -c 'SELECT "Email","Role" FROM "Users"'`
- **Migration SQL:** `dotnet ef dbcontext script --project GurkanApi/` generates full SQL

## Deviations

- `.slnx` format instead of `.sln` — .NET 10 default, functionally equivalent
- Removed `Microsoft.AspNetCore.Identity` package — deprecated, PasswordHasher available from shared framework
- Added `Swashbuckle.AspNetCore` package — .NET 10 dropped built-in Swagger UI
- PostgreSQL on port 5434 instead of 5432 — port conflict with existing container
- Migration files in `GurkanApi/Migrations/` not `GurkanApi/Data/Migrations/` — EF Core default location

## Known Issues

None.

## Files Created/Modified

- `GurkanApi.slnx` — solution file (.NET 10 XML format)
- `GurkanApi/GurkanApi.csproj` — project with NuGet packages (Npgsql.EFCore, JwtBearer, JWT, EFCore.Design, Swashbuckle)
- `GurkanApi/Program.cs` — DbContext registration, Swagger, CORS, JSON config, seed admin logic, partial Program class
- `GurkanApi/appsettings.json` — connection string (port 5434), JWT config, seed admin credentials
- `GurkanApi/appsettings.Development.json` — development overrides
- `GurkanApi/Entities/Enums.cs` — UserRole (SuperAdmin, User), GroupMemberRole (Admin, Member)
- `GurkanApi/Entities/User.cs` — User entity with navigation properties
- `GurkanApi/Entities/Group.cs` — Group entity with Members and Properties collections
- `GurkanApi/Entities/GroupMember.cs` — Junction entity with composite PK
- `GurkanApi/Entities/Property.cs` — Placeholder entity with nullable GroupId
- `GurkanApi/Entities/RefreshToken.cs` — Token entity with revocation support
- `GurkanApi/Data/ApplicationDbContext.cs` — Fluent API configuration for all entities
- `GurkanApi/Migrations/*` — InitialCreate migration (3 files)
- `docker-compose.yml` — PostgreSQL 16-alpine service on port 5434
- `.gitignore` — added .NET ignores (bin/, obj/)
