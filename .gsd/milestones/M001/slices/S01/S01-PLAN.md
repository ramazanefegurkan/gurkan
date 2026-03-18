# S01: Auth & Grup Bazlı Erişim

**Goal:** Email+şifre ile JWT authentication, superadmin/grup admin/üye rol hiyerarşisi ve grup bazlı erişim kontrolü çalışır; tüm downstream slice'lar bu altyapıyı kullanır.
**Demo:** Superadmin seed hesabı ile login olur → JWT token alır → grup oluşturur → kullanıcı register eder → kullanıcıyı gruba ekler → grup admini delege eder → üye login olur → sadece kendi grubundaki kaynakları görür → başka gruba erişim 403 döner.

## Must-Haves

- ASP.NET Core Web API projesi çalışır durumda, PostgreSQL bağlantısı ve migration'lar uygulanmış
- User, Group, GroupMember, RefreshToken, Property (placeholder) entity'leri ve seed superadmin
- Email+şifre ile register/login, JWT access token (15dk) + refresh token (7 gün, rotation)
- Şifre değiştirme endpoint'i
- Grup CRUD, gruba üye ekleme/çıkarma, gruba mülk atama/çıkarma
- Superadmin → grup admin delegasyonu, grup admin kendi grubunda tam yetki
- JWT middleware tüm authenticated endpoint'leri korur
- Kullanıcı sadece kendi gruplarını ve grubundaki mülkleri görür
- Integration test'ler tüm akışı (login → grup → üye → erişim kontrolü) kanıtlar

## Proof Level

- This slice proves: contract (API endpoint'leri JWT ile korunur, erişim kontrolü çalışır)
- Real runtime required: yes (PostgreSQL + API server)
- Human/UAT required: no (integration test'ler yeterli)

## Verification

- `dotnet test GurkanApi.Tests/ --filter "Category=S01"` — tüm S01 integration test'leri geçer
- Test senaryoları:
  - Seed superadmin ile login → valid JWT döner
  - Register → yeni kullanıcı oluşur, login olabilir
  - Refresh token → yeni access token döner, eski refresh token geçersiz olur
  - Superadmin grup oluşturur, üye ekler, mülk atar
  - Grup admin kendi grubuna üye ekler, mülk atar
  - Üye başka gruba erişmeye çalışır → 403
  - Üye register edemez → 403
  - Expired/invalid token → 401
  - Şifre değiştirme → eski şifre ile login olmaz, yeni şifre ile olur
- Failure path: Invalid credentials → 401 with structured error, başka gruba erişim → 403 with structured error

## Observability / Diagnostics

- Runtime signals: Structured JSON logs — auth başarılı/başarısız, grup erişim red/kabul, token refresh
- Inspection surfaces: `GET /api/users` (superadmin), `GET /api/groups` — sistemdeki kullanıcı ve grup durumu
- Failure visibility: Auth hataları 401/403 response body'de `{ error, message }` formatında, log'larda userId ve attemptedResource
- Redaction constraints: Password hash'ler ve JWT secret key asla log'a yazılmaz

## Integration Closure

- Upstream surfaces consumed: PostgreSQL (Docker Compose), appsettings.json (JWT secret, connection string, seed admin)
- New wiring introduced in this slice: ASP.NET Core solution + project scaffold, EF Core DbContext + migrations, JWT middleware pipeline, authorization policies, Docker Compose (API + PostgreSQL)
- What remains before the milestone is truly usable end-to-end: S02 (mülk CRUD + frontend), S03-S06 (kira, gider, döküman, dashboard)

## Tasks

- [ ] **T01: Scaffold ASP.NET Core project, entities, DbContext and seed migration** `est:1h`
  - Why: Greenfield — solution, proje dosyaları, Docker Compose, entity'ler ve veritabanı şeması olmadan hiçbir şey çalışmaz. Tüm downstream task'lar buna bağımlı.
  - Files: `GurkanApi/GurkanApi.csproj`, `GurkanApi/Program.cs`, `GurkanApi/appsettings.json`, `GurkanApi/appsettings.Development.json`, `GurkanApi/Data/ApplicationDbContext.cs`, `GurkanApi/Entities/User.cs`, `GurkanApi/Entities/Group.cs`, `GurkanApi/Entities/GroupMember.cs`, `GurkanApi/Entities/Property.cs`, `GurkanApi/Entities/RefreshToken.cs`, `GurkanApi/Entities/Enums.cs`, `docker-compose.yml`, `GurkanApi.sln`
  - Do: (1) `dotnet new sln` + `dotnet new webapi` ile proje oluştur. (2) NuGet paketleri ekle: `Npgsql.EntityFrameworkCore.PostgreSQL`, `Microsoft.AspNetCore.Authentication.JwtBearer`, `Microsoft.AspNetCore.Identity` (sadece PasswordHasher için), `System.IdentityModel.Tokens.Jwt`. (3) Entity class'larını oluştur — User (Id GUID, Email, PasswordHash, FullName, Role enum, CreatedAt), Group (Id GUID, Name, Description, CreatedAt), GroupMember (UserId+GroupId composite key, Role enum Admin/Member, JoinedAt), Property (Id GUID, Name, GroupId — placeholder), RefreshToken (Id GUID, UserId, Token, ExpiresAt, CreatedAt, RevokedAt). (4) ApplicationDbContext: entity configuration (composite keys, indexes, relationships), `HasData()` ile seed superadmin (email+şifre appsettings'den). (5) docker-compose.yml: PostgreSQL 16 + API service. (6) `appsettings.json` / `appsettings.Development.json`: connection string, JWT settings (secret key min 256-bit, access token 15dk, refresh token 7 gün), seed admin email+şifre. (7) `Program.cs`: temel servis registration (DbContext, CORS, controllers). (8) EF Core initial migration oluştur ve uygula.
  - Verify: `docker compose up -d db` ile PostgreSQL başlar, `dotnet ef database update` migration'ı uygular, `dotnet build` hatasız derlenir. Seed superadmin DB'de var (psql veya EF query ile doğrulanır).
  - Done when: Solution derlenir, PostgreSQL'e bağlanır, migration uygulanır, seed superadmin users tablosunda bulunur.

- [ ] **T02: Implement auth services and AuthController (login, register, refresh, change-password)** `est:1h`
  - Why: JWT authentication S01'in temel deliverable'ı ve tüm downstream slice'ların bağımlılığı. R005 (email+şifre JWT auth) burada kanıtlanır.
  - Files: `GurkanApi/Services/IAuthService.cs`, `GurkanApi/Services/AuthService.cs`, `GurkanApi/Services/ITokenService.cs`, `GurkanApi/Services/TokenService.cs`, `GurkanApi/Controllers/AuthController.cs`, `GurkanApi/DTOs/Auth/LoginRequest.cs`, `GurkanApi/DTOs/Auth/RegisterRequest.cs`, `GurkanApi/DTOs/Auth/TokenResponse.cs`, `GurkanApi/DTOs/Auth/ChangePasswordRequest.cs`, `GurkanApi/Extensions/ClaimsPrincipalExtensions.cs`, `GurkanApi/Program.cs`
  - Do: (1) DTO'lar: LoginRequest (Email, Password), RegisterRequest (Email, Password, FullName), TokenResponse (AccessToken, RefreshToken, ExpiresAt), ChangePasswordRequest (CurrentPassword, NewPassword). (2) ITokenService + TokenService: JWT generation (claims: sub=userId, email, role, groupIds+groupRoles), refresh token generation (cryptographically random opaque string), refresh token rotation (eski revoke, yeni üret). (3) IAuthService + AuthService: Register (superadmin veya grup admin çağırır, PasswordHasher ile hash, yeni User oluştur), Login (email lookup, PasswordHasher.VerifyHashedPassword, token pair üret), RefreshToken (DB'den token bul, revoked/expired kontrolü, rotation, yeni token pair), ChangePassword (current password verify, yeni hash kaydet). (4) AuthController: POST /api/auth/login, POST /api/auth/register [Authorize(SuperAdmin veya GrupAdmin)], POST /api/auth/refresh, POST /api/auth/change-password [Authorize]. (5) Program.cs: JWT Bearer authentication config, PasswordHasher<User> DI kaydı, auth service DI kayıtları. (6) ClaimsPrincipalExtensions: GetUserId(), GetRole(), GetGroupMemberships() helper'ları. (7) Model validation: DataAnnotations ([Required], [EmailAddress], [MinLength(6)]).
  - Verify: `dotnet build` hatasız. `dotnet run` ile API başlatılıp curl/httpie ile: (a) POST /api/auth/login seed admin → 200 + JWT, (b) POST /api/auth/register (auth ile) → 200, (c) POST /api/auth/refresh → yeni token pair, (d) unauthenticated request → 401.
  - Done when: Login/register/refresh/change-password endpoint'leri çalışır, JWT token valid, refresh token rotation çalışır, unauthenticated request'ler 401 döner.

- [ ] **T03: Implement GroupsController, UsersController and group-based access control** `est:1h`
  - Why: Grup bazlı erişim kontrolü bu slice'ın en kritik parçası. R002 (grup bazlı erişim), R003 (superadmin tüm yetki), R004 (grup admin delegasyonu) burada kanıtlanır.
  - Files: `GurkanApi/Controllers/GroupsController.cs`, `GurkanApi/Controllers/UsersController.cs`, `GurkanApi/Services/IGroupAccessService.cs`, `GurkanApi/Services/GroupAccessService.cs`, `GurkanApi/DTOs/Groups/CreateGroupRequest.cs`, `GurkanApi/DTOs/Groups/UpdateGroupRequest.cs`, `GurkanApi/DTOs/Groups/AddMemberRequest.cs`, `GurkanApi/DTOs/Groups/GroupResponse.cs`, `GurkanApi/DTOs/Groups/GroupMemberResponse.cs`, `GurkanApi/DTOs/Users/UserResponse.cs`, `GurkanApi/DTOs/Users/UpdateRoleRequest.cs`, `GurkanApi/Program.cs`
  - Do: (1) IGroupAccessService + GroupAccessService: IsUserInGroup(userId, groupId), IsGroupAdmin(userId, groupId), GetUserGroupIds(userId), CanAccessProperty(userId, propertyId) — superadmin her şeye erişir. (2) GroupsController: GET /api/groups (superadmin tümünü, üye sadece kendi gruplarını görür), GET /api/groups/{id} (erişim kontrolü), POST /api/groups (superadmin only), PUT /api/groups/{id} (superadmin veya grup admin), DELETE /api/groups/{id} (superadmin only), POST /api/groups/{id}/members (superadmin veya grup admin — AddMemberRequest: UserId, Role), DELETE /api/groups/{id}/members/{userId} (superadmin veya grup admin), POST /api/groups/{id}/properties (superadmin veya grup admin — propertyId ile), DELETE /api/groups/{id}/properties/{propertyId}. (3) UsersController: GET /api/users (superadmin: tüm kullanıcılar, liste), PATCH /api/users/{id}/role (superadmin only — UpdateRoleRequest: Role). (4) DTO'lar: response DTO'larında hassas veri (passwordHash) bulunmaz. GroupResponse içinde üye listesi ve mülk listesi. (5) Authorization: controller/action seviyesinde [Authorize] + service katmanında GroupAccessService ile erişim kontrolü. Superadmin kontrolü ClaimsPrincipalExtensions ile. (6) Program.cs: GroupAccessService DI kaydı, gerekirse authorization policy tanımları.
  - Verify: `dotnet build` hatasız. API çalışırken: (a) superadmin token ile POST /api/groups → grup oluşur, (b) POST /api/groups/{id}/members → üye eklenir, (c) üye token ile GET /api/groups → sadece kendi grupları, (d) üye başka gruba erişim → 403, (e) superadmin PATCH /api/users/{id}/role → grup admin olur, (f) grup admin kendi grubuna üye ekler → başarılı.
  - Done when: Superadmin grup oluşturur/yönetir, grup admin kendi grubunda tam yetkili, üye sadece kendi gruplarını görür, başka gruba erişim 403 döner.

- [ ] **T04: Integration tests proving auth + group access control contract** `est:1h`
  - Why: Slice'ın demo senaryosunu test'lerle kanıtlar. Test'ler S02-S06 için boundary contract'ı belirler. Verification olmadan slice tamamlanamaz.
  - Files: `GurkanApi.Tests/GurkanApi.Tests.csproj`, `GurkanApi.Tests/IntegrationTests/AuthTests.cs`, `GurkanApi.Tests/IntegrationTests/GroupAccessTests.cs`, `GurkanApi.Tests/IntegrationTests/TestFixture.cs`, `GurkanApi.Tests/IntegrationTests/HttpClientExtensions.cs`
  - Do: (1) xUnit test projesi oluştur, NuGet: `Microsoft.AspNetCore.Mvc.Testing`, `Npgsql.EntityFrameworkCore.PostgreSQL`. (2) TestFixture: WebApplicationFactory<Program> ile test server, test PostgreSQL bağlantısı (ayrı test DB veya migration ile temiz DB), her test öncesi DB'yi temizle ve seed uygula. (3) HttpClientExtensions: LoginAs(email, password) → JWT token al ve Authorization header set et. (4) AuthTests [Category("S01")]: seed admin login → 200 + valid JWT, register yeni kullanıcı → login olabilir, refresh token → yeni token pair + eski token geçersiz, change password → eski şifre geçersiz yeni çalışır, invalid credentials → 401, expired/invalid refresh token → 401, üye register edemez → 403. (5) GroupAccessTests [Category("S01")]: superadmin grup oluşturur → 201, superadmin kullanıcı register + gruba ekler, üye login → GET /api/groups sadece kendi grupları, üye başka gruba GET → 403, superadmin başka kullanıcıyı grup admin yapar, grup admin kendi grubuna üye ekler → başarılı, grup admin başka gruba üye eklemeye çalışır → 403, superadmin tüm grupları görür, superadmin tüm kullanıcıları görür, üye GET /api/users → 403. (6) Tüm test'leri `[Trait("Category", "S01")]` ile etiketle.
  - Verify: `dotnet test GurkanApi.Tests/ --filter "Category=S01"` — tüm test'ler yeşil.
  - Done when: Tüm integration test'ler geçer, slice demo senaryosu (login → grup → üye → erişim kontrolü) test'lerle kanıtlanmış.

## Files Likely Touched

- `GurkanApi.sln`
- `docker-compose.yml`
- `GurkanApi/GurkanApi.csproj`
- `GurkanApi/Program.cs`
- `GurkanApi/appsettings.json`
- `GurkanApi/appsettings.Development.json`
- `GurkanApi/Entities/User.cs`
- `GurkanApi/Entities/Group.cs`
- `GurkanApi/Entities/GroupMember.cs`
- `GurkanApi/Entities/Property.cs`
- `GurkanApi/Entities/RefreshToken.cs`
- `GurkanApi/Entities/Enums.cs`
- `GurkanApi/Data/ApplicationDbContext.cs`
- `GurkanApi/Controllers/AuthController.cs`
- `GurkanApi/Controllers/GroupsController.cs`
- `GurkanApi/Controllers/UsersController.cs`
- `GurkanApi/Services/IAuthService.cs`
- `GurkanApi/Services/AuthService.cs`
- `GurkanApi/Services/ITokenService.cs`
- `GurkanApi/Services/TokenService.cs`
- `GurkanApi/Services/IGroupAccessService.cs`
- `GurkanApi/Services/GroupAccessService.cs`
- `GurkanApi/DTOs/Auth/LoginRequest.cs`
- `GurkanApi/DTOs/Auth/RegisterRequest.cs`
- `GurkanApi/DTOs/Auth/TokenResponse.cs`
- `GurkanApi/DTOs/Auth/ChangePasswordRequest.cs`
- `GurkanApi/DTOs/Groups/CreateGroupRequest.cs`
- `GurkanApi/DTOs/Groups/UpdateGroupRequest.cs`
- `GurkanApi/DTOs/Groups/AddMemberRequest.cs`
- `GurkanApi/DTOs/Groups/GroupResponse.cs`
- `GurkanApi/DTOs/Groups/GroupMemberResponse.cs`
- `GurkanApi/DTOs/Users/UserResponse.cs`
- `GurkanApi/DTOs/Users/UpdateRoleRequest.cs`
- `GurkanApi/Extensions/ClaimsPrincipalExtensions.cs`
- `GurkanApi/Middleware/` (if needed)
- `GurkanApi.Tests/GurkanApi.Tests.csproj`
- `GurkanApi.Tests/IntegrationTests/AuthTests.cs`
- `GurkanApi.Tests/IntegrationTests/GroupAccessTests.cs`
- `GurkanApi.Tests/IntegrationTests/TestFixture.cs`
- `GurkanApi.Tests/IntegrationTests/HttpClientExtensions.cs`
