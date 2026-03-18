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
