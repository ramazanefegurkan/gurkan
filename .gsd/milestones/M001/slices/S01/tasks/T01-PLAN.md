---
estimated_steps: 8
estimated_files: 12
---

# T01: Scaffold ASP.NET Core project, entities, DbContext and seed migration

**Slice:** S01 — Auth & Grup Bazlı Erişim
**Milestone:** M001

## Description

Greenfield proje — solution, ASP.NET Core Web API projesi, Docker Compose (PostgreSQL), entity class'ları, ApplicationDbContext ve seed migration oluşturulur. Bu task tamamlandığında derlenebilir bir proje, çalışan bir veritabanı ve seed superadmin kaydı mevcut olur. Tüm downstream task'lar buna bağımlıdır.

## Steps

1. **Solution ve proje oluştur:** `dotnet new sln -n GurkanApi` sonra `dotnet new webapi -n GurkanApi -controllers` ile controller-based API projesi. Solution'a projeyi ekle. Varsayılan WeatherForecast controller/model'i sil.

2. **NuGet paketleri ekle:**
   - `Npgsql.EntityFrameworkCore.PostgreSQL` — PostgreSQL EF Core provider
   - `Microsoft.AspNetCore.Authentication.JwtBearer` — JWT middleware
   - `Microsoft.AspNetCore.Identity` — sadece PasswordHasher<User> için (AddIdentity kullanılmayacak)
   - `System.IdentityModel.Tokens.Jwt` — JWT token generation
   - `Microsoft.EntityFrameworkCore.Design` — migration CLI

3. **Enum'lar oluştur** (`Entities/Enums.cs`):
   - `UserRole`: `SuperAdmin`, `User`
   - `GroupMemberRole`: `Admin`, `Member`

4. **Entity class'larını oluştur:**
   - `User`: Id (Guid), Email (string, unique), PasswordHash (string), FullName (string), Role (UserRole enum), CreatedAt (DateTime UTC)
   - `Group`: Id (Guid), Name (string), Description (string nullable), CreatedAt (DateTime UTC)
   - `GroupMember`: UserId (Guid), GroupId (Guid), Role (GroupMemberRole enum), JoinedAt (DateTime UTC) — composite PK
   - `Property`: Id (Guid), Name (string), GroupId (Guid nullable) — placeholder, tam CRUD S02'de
   - `RefreshToken`: Id (Guid), UserId (Guid), Token (string, unique index), ExpiresAt (DateTime), CreatedAt (DateTime), RevokedAt (DateTime nullable)
   - Navigation property'ler: User → Groups (ICollection<GroupMember>), User → RefreshTokens, Group → Members (ICollection<GroupMember>), Group → Properties, GroupMember → User + Group

5. **ApplicationDbContext oluştur** (`Data/ApplicationDbContext.cs`):
   - DbSet<User>, DbSet<Group>, DbSet<GroupMember>, DbSet<Property>, DbSet<RefreshToken>
   - OnModelCreating: GroupMember composite key `HasKey(gm => new { gm.UserId, gm.GroupId })`, User.Email unique index, RefreshToken.Token unique index, relationship configuration
   - Seed data: `HasData()` ile bir superadmin User. Email ve şifre `appsettings.json`'dan statik değerler (seed time password hash'i önceden hesaplanmış — PasswordHasher'ı static olarak kullan veya bilinen hash değerini koy). **Dikkat:** HasData idempotent — migration tekrar çalışsa duplicate oluşturmaz.

6. **appsettings.json ve appsettings.Development.json yapılandır:**
   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Host=localhost;Port=5432;Database=gurkan;Username=postgres;Password=postgres"
     },
     "Jwt": {
       "Secret": "<min 32 karakter güçlü key>",
       "Issuer": "GurkanApi",
       "Audience": "GurkanClient",
       "AccessTokenExpirationMinutes": 15,
       "RefreshTokenExpirationDays": 7
     },
     "SeedAdmin": {
       "Email": "admin@gurkan.com",
       "Password": "Admin123!",
       "FullName": "System Admin"
     }
   }
   ```

7. **docker-compose.yml oluştur:**
   - `db` service: `postgres:16-alpine`, port 5432, volume mount, POSTGRES_DB=gurkan, POSTGRES_USER=postgres, POSTGRES_PASSWORD=postgres
   - `api` service (opsiyonel, development'ta `dotnet run` ile çalıştırılabilir)

8. **Program.cs temel yapılandırma:**
   - `builder.Services.AddDbContext<ApplicationDbContext>()` — Npgsql ile
   - `builder.Services.AddControllers()` + `app.MapControllers()`
   - CORS yapılandırması (development: tüm origin'lere izin)
   - Swagger/OpenAPI (varsayılan template'den)
   - JSON serialization: camelCase, enum'lar string olarak
   - **JWT middleware ve auth servislerini bu task'ta ekleme** — T02'de gelecek. Sadece DbContext ve controller pipeline.
   - **Seed superadmin logic:** Uygulama başlarken (Program.cs'de veya migration seed'de) appsettings'den admin bilgisini al, PasswordHasher ile hash'le, HasData seed'ine koy. En pratik yol: Program.cs'de `EnsureSeedData` — migration apply sonrası DB'de admin yoksa oluştur. Böylece şifre runtime'da hash'lenir, HasData'da statik hash gerekmez.

9. **İlk migration oluştur ve uygula:**
   - `dotnet ef migrations add InitialCreate`
   - `dotnet ef database update` (PostgreSQL çalışır durumda olmalı)

## Must-Haves

- [ ] Solution derlenebilir (`dotnet build` hatasız)
- [ ] PostgreSQL Docker container çalışır, bağlantı başarılı
- [ ] EF Core migration uygulanır, tablolar oluşur (Users, Groups, GroupMembers, Properties, RefreshTokens)
- [ ] Seed superadmin Users tablosunda mevcut (email: admin@gurkan.com)
- [ ] GroupMember composite primary key (UserId, GroupId) doğru tanımlı
- [ ] Entity ilişkileri (navigation property, foreign key) doğru

## Verification

- `docker compose up -d db` — PostgreSQL container başlar
- `dotnet build GurkanApi/` — hatasız derlenir
- `dotnet ef database update --project GurkanApi/` — migration uygulanır
- `dotnet run --project GurkanApi/` — API başlar, Swagger UI erişilebilir (https://localhost:5001/swagger veya http://localhost:5000/swagger)
- DB'de seed admin kontrolü: `dotnet ef dbcontext script --project GurkanApi/` ile SQL çıktısı veya runtime'da startup log'unda "Seed admin created/exists" mesajı

## Observability Impact

- **Startup seed log:** Program.cs logs `"Seed admin created"` or `"Seed admin already exists"` at startup — confirms seed ran without DB query.
- **EF Core logging:** Standard EF Core SQL logging via ASP.NET Core `ILogger` — visible in console output during development.
- **Health signal:** API starts successfully and responds on configured port — verified via Swagger UI availability.
- **Future agent inspection:** `dotnet ef dbcontext script --project GurkanApi/` generates full SQL schema for offline review. `docker exec` into PostgreSQL to query seed data directly.

## Inputs

- `docker-compose.yml` — PostgreSQL 16 container
- `appsettings.json` — connection string, seed admin bilgileri
- Research doc'tan entity relationship model ve build order

## Expected Output

- `GurkanApi.sln` — solution dosyası
- `GurkanApi/GurkanApi.csproj` — NuGet referansları ile
- `GurkanApi/Program.cs` — DbContext, controllers, CORS, Swagger configured
- `GurkanApi/appsettings.json`, `GurkanApi/appsettings.Development.json` — connection string, JWT config, seed admin
- `GurkanApi/Entities/` — User.cs, Group.cs, GroupMember.cs, Property.cs, RefreshToken.cs, Enums.cs
- `GurkanApi/Data/ApplicationDbContext.cs` — entity config, seed logic
- `GurkanApi/Data/Migrations/` — InitialCreate migration
- `docker-compose.yml` — PostgreSQL service
