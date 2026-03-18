# S01: Auth & Grup Bazlı Erişim — Research

**Date:** 2026-03-18

## Summary

S01, greenfield bir ASP.NET Core Web API projesinde JWT tabanlı authentication, rol hiyerarşisi (superadmin → grup admin → üye), ve grup bazlı erişim kontrolü kuruyor. Mevcut kod yok — proje sıfırdan başlıyor. Bu slice tüm downstream slice'ların (S02-S06) temelini oluşturuyor.

İki ana yaklaşım var: ASP.NET Core Identity kullanmak veya custom auth katmanı yazmak. Identity, UserManager/SignInManager/PasswordHasher gibi battle-tested bileşenler sunuyor ama kendi tablo yapısını empoze ediyor ve bizim grup bazlı erişim modeline doğrudan uymuyor. Custom yaklaşım daha fazla kod demek ama tam kontrol sağlıyor. **Önerilen hibrit yaklaşım:** ASP.NET Core Identity'nin `IPasswordHasher<T>` arayüzünü şifre hashing için kullan, ama UserManager/Identity scaffold yerine kendi User/Group/Role entity'lerini ve servislerini yaz. Bu şekilde güvenli şifre hashing'i bedavaya gelir, geri kalan her şey tam kontrol altında olur.

JWT token generation için `System.IdentityModel.Tokens.Jwt` paketi standart. Refresh token için veritabanında opaque token saklanır, rotation ile tek kullanımlık yapılır. EF Core + Npgsql ile PostgreSQL bağlantısı kurulur.

## Recommendation

**Hibrit yaklaşım: Custom entity'ler + Identity PasswordHasher + manual JWT.**

- Kendi `User`, `Group`, `GroupMember`, `RefreshToken` entity'leri → tam kontrol, grup bazlı erişim modeline birebir uyum
- `Microsoft.AspNetCore.Identity` paketinden sadece `PasswordHasher<User>` → BCrypt/PBKDF2 tabanlı güvenli hashing, kendin yazmana gerek yok
- `System.IdentityModel.Tokens.Jwt` + `Microsoft.AspNetCore.Authentication.JwtBearer` → standart JWT generation ve validation
- EF Core + `Npgsql.EntityFrameworkCore.PostgreSQL` → PostgreSQL provider
- Controller-based API (D001 kararına uygun)

Bu yaklaşım Identity'nin karmaşıklığını (IdentityRole, IdentityUserClaim, IdentityUserLogin tabloları, SignInManager, vs.) atlar ama güvenlik-kritik kısmı (password hashing) kendimiz yazmamış oluruz.

## Implementation Landscape

### Key Files (Oluşturulacak)

Greenfield — tüm dosyalar sıfırdan oluşturulacak. Aşağıdaki yapı öneriliyor:

```
GurkanApi/                         # ASP.NET Core Web API projesi
├── GurkanApi.csproj
├── Program.cs                     # DI, JWT config, middleware pipeline
├── appsettings.json               # JWT settings, connection string, seed admin
├── appsettings.Development.json
├── Controllers/
│   ├── AuthController.cs          # POST /api/auth/login, /register, /refresh, /change-password
│   ├── GroupsController.cs        # CRUD /api/groups, member/property management
│   └── UsersController.cs         # GET /api/users, PATCH role
├── Data/
│   ├── ApplicationDbContext.cs    # DbContext, entity configuration, seed data
│   └── Migrations/                # EF Core migrations
├── Entities/
│   ├── User.cs                    # Id, Email, PasswordHash, FullName, Role, CreatedAt
│   ├── Group.cs                   # Id, Name, Description, CreatedAt
│   ├── GroupMember.cs             # UserId, GroupId, Role (admin/member), JoinedAt
│   ├── Property.cs                # Placeholder — Id, Name, GroupId (tam CRUD S02'de)
│   └── RefreshToken.cs            # Id, UserId, Token, ExpiresAt, CreatedAt, RevokedAt
├── Services/
│   ├── IAuthService.cs + AuthService.cs      # Register, login, refresh, change-password logic
│   ├── ITokenService.cs + TokenService.cs    # JWT generation, refresh token management
│   └── IGroupAccessService.cs + GroupAccessService.cs  # Grup/mülk erişim kontrolü
├── Middleware/
│   └── (JWT middleware built-in, custom authorization policies via Program.cs)
├── DTOs/
│   ├── Auth/                      # LoginRequest, RegisterRequest, TokenResponse, etc.
│   └── Groups/                    # CreateGroupRequest, AddMemberRequest, etc.
└── Extensions/
    └── ClaimsPrincipalExtensions.cs  # GetUserId(), GetRole(), GetGroupIds() helper'ları
```

### Entity Relationship Model

```
User (1) ←→ (N) GroupMember (N) ←→ (1) Group
User (1) ←→ (N) RefreshToken
Group (1) ←→ (N) Property (placeholder)
GroupMember: composite key (UserId, GroupId), Role enum (Admin, Member)
User.Role: enum (SuperAdmin, User) — global rol, grup rolü GroupMember'da
```

Kullanıcının global rolü `User.Role` (SuperAdmin veya User). Grup içindeki rolü `GroupMember.Role` (Admin veya Member). Superadmin her şeyi görür ve yönetir. Grup admin kendi grubunda tam yetki. Üye sadece okuma erişimi (kendi grubundaki mülkler).

### Build Order

1. **Proje scaffold + DB bağlantısı** — `dotnet new webapi`, NuGet paketleri, `ApplicationDbContext`, PostgreSQL connection, ilk migration. Bu olmadan hiçbir şey çalışmaz.

2. **Entity'ler + seed migration** — `User`, `Group`, `GroupMember`, `Property` (placeholder), `RefreshToken` entity'leri. Seed data ile ilk superadmin. Migration oluştur ve uygula.

3. **Auth servisleri + AuthController** — `IAuthService`, `ITokenService`, JWT config (`Program.cs`), register/login/refresh/change-password endpoint'leri. Password hashing için `PasswordHasher<User>`. Bu çalışınca token alınabilir.

4. **GroupsController + GroupAccessService** — Grup CRUD, üye ekleme/çıkarma, mülk atama/çıkarma, grup admin delegasyonu. Authorization policy'leri. Erişim kontrolü servisi.

5. **UsersController + authorization policies** — Kullanıcı listesi (superadmin), rol değiştirme. Final authorization kontrolleri.

6. **Integration testleri** — Superadmin akışı, grup admin akışı, üye erişim kontrolü, JWT token validation. xUnit + WebApplicationFactory.

İlk 3 adım riskli ve temel — bunlar çalışmadan ilerlenemez. Adım 4-5 bunların üzerine ekleniyor. Testler her adımda yazılabilir ama minimum 6. adımda integration test'ler şart.

### Verification Approach

1. **Unit/Integration testleri** — `WebApplicationFactory<Program>` ile in-memory test server. Test DB olarak PostgreSQL (testcontainers veya ayrı test DB).

2. **Manuel API testi** — Aşağıdaki senaryo çalışmalı:
   ```
   # 1. Seed superadmin ile login
   POST /api/auth/login → JWT token al
   
   # 2. Grup oluştur
   POST /api/groups (superadmin token ile) → grup oluştu
   
   # 3. Kullanıcı oluştur (davet)
   POST /api/auth/register (superadmin token ile) → yeni kullanıcı
   
   # 4. Kullanıcıyı gruba ekle
   POST /api/groups/{id}/members → üye eklendi
   
   # 5. Üye login olur, sadece kendi grubundaki mülkleri görür
   POST /api/auth/login (üye) → JWT token
   GET /api/groups → sadece üye olduğu gruplar
   
   # 6. Başka grubun verilerine erişim → 403 Forbidden
   ```

3. **Negatif testler** — Expired token → 401, başka gruba erişim → 403, üye başka üye register edemez → 403, geçersiz refresh token → 401.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Password hashing | `Microsoft.AspNetCore.Identity.PasswordHasher<T>` | PBKDF2 tabanlı, salt dahil, timing-safe comparison. Kendi hash'ini yazmak güvenlik riski. |
| JWT generation/validation | `System.IdentityModel.Tokens.Jwt` + `Microsoft.AspNetCore.Authentication.JwtBearer` | Standart JWT spec implementation, middleware pipeline'a entegre. |
| PostgreSQL EF Core provider | `Npgsql.EntityFrameworkCore.PostgreSQL` | Resmi provider, migration desteği, PostgreSQL-specific type'lar. |
| JSON serialization | `System.Text.Json` (built-in) | ASP.NET Core default, ek paket gereksiz. |

## Constraints

- **Greenfield proje** — solution, proje dosyaları, Docker setup hepsi sıfırdan oluşturulacak. İlk task'ın çıktısı çalışan bir boş API olmalı.
- **Controller-based API** (D001) — Minimal API değil. `[ApiController]` attribute, DTO binding, model validation.
- **No Identity scaffold** — `AddIdentity<>()` / `IdentityDbContext` kullanılmayacak. Kendi entity'lerimiz ve DbContext'imiz. Sadece `PasswordHasher<User>` DI'dan alınacak.
- **JWT claim'lerde rol ve grup bilgisi** — Downstream middleware'ler `ClaimTypes.Role` ve custom `GroupIds` claim'ine güvenecek. Token her login/refresh'te güncellenmeli.
- **Seed superadmin migration ile** — Runtime register değil. Email+şifre `appsettings.json` veya environment variable'dan gelir.
- **PostgreSQL zorunlu** — Development'ta da PostgreSQL (SQLite değil) — migration uyumluluğu ve data type farkları için.
- **Refresh token rotation** — Her kullanımda eski token revoke, yeni token üret. Tek kullanımlık.
- **Frontend yok bu slice'da** — Sadece API. S02'de React frontend gelecek.

## Common Pitfalls

- **JWT secret key çok kısa** — Minimum 256-bit (32 byte) key kullanılmalı. Kısa key'ler `SecurityTokenInvalidSignatureException` fırlatır. `appsettings.json`'da güçlü key.
- **Refresh token'da race condition** — Aynı refresh token iki kez kullanılırsa (concurrent request), ikincisi başarısız olmalı. Token'ın `RevokedAt` field'ı DB'de kontrol edilmeli.
- **Claim'lerde stale data** — Kullanıcı gruptan çıkarılırsa ama token'ı hâlâ eski grup claim'lerini taşıyorsa → token expire olana kadar eski erişim devam eder. Access token süresini kısa tutmak (15dk) bu riski azaltır. Kritik operasyonlarda DB'den güncel grup üyeliği doğrulanabilir.
- **Superadmin seed migration idempotent olmalı** — Migration tekrar çalıştırıldığında duplicate superadmin oluşturmamalı. `HasData()` veya `INSERT ... ON CONFLICT DO NOTHING` pattern.
- **GroupMember composite key** — EF Core'da `(UserId, GroupId)` composite primary key `HasKey(gm => new { gm.UserId, gm.GroupId })` ile tanımlanmalı. Aksi halde EF shadow property ekler.
- **Authorization policy ordering** — `[Authorize]` attribute controller seviyesinde, özel policy'ler action seviyesinde. `AddAuthorization()` içinde policy tanımları.

## Open Risks

- **PostgreSQL Docker container'ın development ortamında mevcut olup olmadığı** — Kullanıcının zaten PostgreSQL'i çalışır durumda mı, yoksa Docker Compose ile mi ayağa kaldırılmalı? İlk task'ta docker-compose.yml oluşturulmalı.
- **Test altyapısı kararı** — Testcontainers (PostgreSQL container per test) vs. shared test DB. Testcontainers daha izole ama setup süresi var. Execution sırasında karar verilecek.
- **Token revocation at scale** — Şu an aile içi kullanım (5-10 kişi), sorun değil. Ama refresh token tablosu zamanla büyür — expired token'ları temizleyen bir mekanizma gerekebilir (background job veya TTL).

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| ASP.NET Core | npx skills find — no relevant agent skills found | none found |
| JWT authentication | npx skills find — no relevant agent skills found | none found |
| EF Core | npx skills find — no relevant agent skills found | none found |
| PostgreSQL | npx skills find — no relevant agent skills found | none found |

## Sources

- JWT Bearer middleware configuration, event hooks, and `TokenValidationParameters` (source: [ASP.NET Core JwtBearer docs](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/JwtBearer/src/))
- `IPasswordHasher<T>` interface — `HashPassword()`, `VerifyHashedPassword()` with PBKDF2 (source: [ASP.NET Core Identity Extensions.Core](https://github.com/dotnet/aspnetcore/blob/main/src/Identity/Extensions.Core/src/))
- EF Core migration CLI, fluent API relationship configuration, `HasKey()` composite keys (source: [EF Core docs](https://context7.com/dotnet/efcore/llms.txt))
- EF Core PostgreSQL provider via Npgsql (source: [EF Core README](https://github.com/dotnet/efcore/blob/main/README.md))
