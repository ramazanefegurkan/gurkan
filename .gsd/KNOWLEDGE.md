# Knowledge Register

<!-- Append-only. Non-obvious rules, recurring gotchas, and useful patterns.
     Only add entries that would save future agents from repeating investigation. -->

| # | When | Category | Learning |
|---|------|----------|----------|
| K001 | M001/S01/T01 | tooling | .NET 10 `dotnet new sln` creates `.slnx` format (XML-based), not the legacy `.sln`. Use `dotnet sln GurkanApi.slnx add ...` for project manipulation. |
| K002 | M001/S01/T01 | tooling | .NET 10 web API template no longer includes Swashbuckle. `AddOpenApi()` + `MapOpenApi()` only serves raw JSON spec. Need explicit `Swashbuckle.AspNetCore` package for Swagger UI. |
| K003 | M001/S01/T01 | tooling | `Microsoft.AspNetCore.Identity` package is deprecated/empty on .NET 10. `PasswordHasher<T>` lives in the ASP.NET Core shared framework (`Microsoft.Extensions.Identity.Core`) — no extra package needed. |
| K004 | M001/S01/T01 | infra | Host port 5432 is occupied by `infra-postgres-1`. Gurkan project uses port 5434 for PostgreSQL. Connection strings must use `Port=5434`. |
| K005 | M001/S01/T01 | ef-core | EF Core Design package 9.x CLI works fine against 10.x runtime with a version mismatch warning. Migration generation and database update both succeed. |
| K006 | M001/S01/T04 | testing | WebApplicationFactory test deserialization must use `JsonStringEnumConverter` because Program.cs configures enum-as-string JSON serialization. Default `GetFromJsonAsync<T>` fails with "JSON value could not be converted to enum" on any response containing enum properties. Use a shared `ApiJsonOptions` instance. |
| K007 | M001/S01/T04 | testing | When integration tests share a single PostgreSQL test DB via `IClassFixture<WebApplicationFactory>`, xUnit's default parallel execution causes TRUNCATE races between test classes. Disable with `[assembly: CollectionBehavior(DisableTestParallelization = true)]`. |
| K008 | M001/S01/T04 | testing | `EnsureCreated()` and `MigrateAsync()` are incompatible on the same DB — EnsureCreated doesn't create `__EFMigrationsHistory`, so subsequent MigrateAsync tries to re-create existing tables and fails with 42P07. Use one approach consistently. For integration tests with Program.cs that calls MigrateAsync, pre-drop the DB and let migrations run. |
| K009 | M001/S02/T03 | frontend | Vite + React-TS template (2025+) sets `erasableSyntaxOnly: true` in tsconfig.app.json. This forbids TypeScript `enum` declarations (they emit runtime code). Use `const` objects with `as const` + derived union types instead: `export const Foo = { A: 0, B: 1 } as const; export type Foo = (typeof Foo)[keyof typeof Foo];` |
| K010 | M001/S02/T03 | backend | Backend JWT uses full XML namespace claim keys: `ClaimTypes.NameIdentifier` → `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier`, `ClaimTypes.Email` → `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress`, `ClaimTypes.Role` → `http://schemas.microsoft.com/ws/2008/06/identity/claims/role`. No `FullName` claim exists in the token. |
