---
estimated_steps: 6
estimated_files: 5
---

# T04: Integration tests proving auth + group access control contract

**Slice:** S01 — Auth & Grup Bazlı Erişim
**Milestone:** M001

## Description

xUnit test projesi oluşturulur ve S01'in tüm demo senaryosu integration test'lerle kanıtlanır: login, register, refresh token rotation, grup oluşturma, üye yönetimi, erişim kontrolü. Bu test'ler S02-S06 için boundary contract'ı belirler — auth ve erişim kontrolü çalıştığının kanıtıdır. Slice verification gate'i budur.

## Steps

1. **Test projesi oluştur:**
   - `dotnet new xunit -n GurkanApi.Tests`
   - Solution'a ekle: `dotnet sln add GurkanApi.Tests/`
   - Proje referansı: `dotnet add GurkanApi.Tests/ reference GurkanApi/`
   - NuGet paketleri: `Microsoft.AspNetCore.Mvc.Testing`, `Microsoft.EntityFrameworkCore.InMemory` (veya Npgsql test DB), `FluentAssertions` (opsiyonel, okunabilirlik için)

2. **TestFixture / CustomWebApplicationFactory oluştur** (`IntegrationTests/TestFixture.cs`):
   - `WebApplicationFactory<Program>` extend et
   - `ConfigureWebHost`: test ortamı için DB bağlantısı ayarla — seçenekler:
     - **Seçenek A (önerilen):** Ayrı test PostgreSQL DB'si — connection string'i `gurkan_test` olarak override et. Her test class'ı başında `EnsureDeleted` + `EnsureCreated` ile temiz DB.
     - **Seçenek B:** In-memory SQLite — daha hızlı ama PostgreSQL-specific davranışları test edemez. S01 için yeterli olabilir ama Npgsql-specific index/constraint farkları riski var.
   - Karar: **Test PostgreSQL DB kullan** — development'ta zaten Docker Compose ile PostgreSQL çalışıyor, ayrı DB name yeterli. Integration test'lerin gerçek DB davranışını test etmesi önemli.
   - Seed data: Her test çalışmadan önce DB temizlenir ve seed superadmin oluşturulur (Program.cs'deki aynı seed logic).

3. **HttpClientExtensions oluştur** (`IntegrationTests/HttpClientExtensions.cs`):
   - `LoginAsAsync(HttpClient client, string email, string password)` → POST /api/auth/login, JWT token al, `client.DefaultRequestHeaders.Authorization` set et. Return TokenResponse.
   - `PostAsJsonAsync<T>`, `GetFromJsonAsync<T>` — System.Net.Http.Json extension'ları varsa built-in kullan.
   - Deserialize helper: response body'yi `TokenResponse`, `GroupResponse` vs. olarak parse et.

4. **AuthTests oluştur** (`IntegrationTests/AuthTests.cs`) — `[Trait("Category", "S01")]`:
   - `SeedAdmin_Login_ReturnsValidToken` — POST /api/auth/login (admin@gurkan.com) → 200, AccessToken ve RefreshToken non-empty
   - `Login_InvalidCredentials_Returns401` — yanlış şifre → 401
   - `Register_AsSuperAdmin_CreatesUser` — admin login, POST /api/auth/register → 201, yeni kullanıcı login olabilir
   - `Register_AsRegularUser_Returns403` — normal kullanıcı register edemez → 403
   - `RefreshToken_ReturnsNewTokenPair` — login, refresh → yeni token pair, eski refresh token ile tekrar refresh → 401 (rotation)
   - `ChangePassword_UpdatesPassword` — login, change password, eski şifre ile login → fail, yeni şifre ile login → success
   - `AuthenticatedEndpoint_WithoutToken_Returns401` — GET /api/groups without auth header → 401

5. **GroupAccessTests oluştur** (`IntegrationTests/GroupAccessTests.cs`) — `[Trait("Category", "S01")]`:
   - `SuperAdmin_CreatesGroup_Returns201` — admin login, POST /api/groups → 201
   - `SuperAdmin_AddsUserToGroup` — register user, POST /api/groups/{id}/members → 201
   - `GroupMember_SeesOnlyOwnGroups` — iki grup oluştur, kullanıcıyı sadece birine ekle, login, GET /api/groups → sadece bir grup
   - `GroupMember_CannotAccessOtherGroup_Returns403` — kullanıcı başka grubun detayına erişemez → 403
   - `SuperAdmin_DelegatesGroupAdmin` — register user, gruba ekle, PATCH /api/users/{id}/role → UserRole değiştirme VEYA gruba Admin rolüyle ekleme
   - `GroupAdmin_AddsUserToOwnGroup` — grup admin olarak login, POST /api/groups/{id}/members → kendi grubuna üye ekler → 201
   - `GroupAdmin_CannotAccessOtherGroup_Returns403` — grup admin başka grubun üyelerini yönetemez → 403
   - `SuperAdmin_SeesAllGroups` — birden fazla grup oluştur, GET /api/groups → hepsi listelenir
   - `SuperAdmin_SeesAllUsers` — GET /api/users → tüm kullanıcılar
   - `RegularUser_CannotListUsers_Returns403` — GET /api/users → 403
   - `SuperAdmin_AssignsPropertyToGroup` — placeholder property oluştur (DB'ye manual insert veya seed), POST /api/groups/{id}/properties → atanır

6. **Test çalıştırma ve doğrulama:**
   - `dotnet test GurkanApi.Tests/ --filter "Category=S01"` — tüm test'ler yeşil
   - Kırmızı test varsa: hata mesajını incele, ilgili endpoint veya servisi düzelt, tekrar çalıştır
   - **Önemli:** Bu task sadece test yazmakla kalmaz — test'ler kırmızı çıkarsa ilgili kodu da düzeltir. Test'ler verification gate'i.

## Must-Haves

- [ ] xUnit test projesi derlenir ve solution'a ekli
- [ ] Tüm AuthTests geçer (login, register, refresh rotation, change password, 401/403 senaryoları)
- [ ] Tüm GroupAccessTests geçer (grup CRUD, üye yönetimi, erişim kontrolü, superadmin/grup admin/üye farkları)
- [ ] Test'ler gerçek PostgreSQL DB'sine bağlanır (in-memory mock değil)
- [ ] `dotnet test --filter "Category=S01"` komutu ile tümü çalıştırılabilir

## Verification

- `dotnet test GurkanApi.Tests/ --filter "Category=S01" --verbosity normal` — tüm test'ler PASSED
- Test count: minimum 18 test (7 auth + 11 group access)
- Zero failures, zero skipped

## Inputs

- `GurkanApi/` — T01-T03'ten çalışır proje, tüm endpoint'ler ve servisler
- `GurkanApi/Controllers/AuthController.cs` — login, register, refresh, change-password endpoint'leri
- `GurkanApi/Controllers/GroupsController.cs` — grup CRUD, üye yönetimi, mülk atama endpoint'leri
- `GurkanApi/Controllers/UsersController.cs` — kullanıcı listesi, rol değiştirme endpoint'leri
- `GurkanApi/Data/ApplicationDbContext.cs` — DbContext, seed logic
- `docker-compose.yml` — test sırasında PostgreSQL çalışır durumda olmalı

## Expected Output

- `GurkanApi.Tests/GurkanApi.Tests.csproj` — test projesi, NuGet referansları
- `GurkanApi.Tests/IntegrationTests/TestFixture.cs` — WebApplicationFactory, test DB setup
- `GurkanApi.Tests/IntegrationTests/HttpClientExtensions.cs` — login helper, JSON helpers
- `GurkanApi.Tests/IntegrationTests/AuthTests.cs` — 7+ auth test'i
- `GurkanApi.Tests/IntegrationTests/GroupAccessTests.cs` — 11+ erişim kontrolü test'i
- Olası bug fix'leri: test'ler kırmızı çıkarsa GurkanApi/ altındaki ilgili dosyalarda düzeltmeler

## Observability Impact

- **New signal:** `dotnet test GurkanApi.Tests/ --filter "Category=S01"` provides a single-command verification of the entire auth + group access control contract (18 tests)
- **Inspection:** Test output includes structured API log lines (auth succeeded/failed, group access granted/denied) from the in-process test server
- **Failure visibility:** Any broken auth or access control contract surfaces as a red test with assertion details — no need to manually curl endpoints
- **Test DB:** `gurkan_test` database on port 5434 is created/dropped per test run; inspect with `docker exec gurkan-postgres psql -U postgres -d gurkan_test`

