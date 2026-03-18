---
estimated_steps: 7
estimated_files: 11
---

# T02: Implement auth services and AuthController (login, register, refresh, change-password)

**Slice:** S01 — Auth & Grup Bazlı Erişim
**Milestone:** M001

## Description

JWT authentication altyapısını kurar: token generation/validation, register, login, refresh token rotation ve şifre değiştirme. Tamamlandığında seed superadmin ile login olunur, kullanıcı register edilir, token refresh çalışır ve unauthenticated request'ler 401 döner. R005 (email+şifre JWT auth) burada karşılanır.

## Steps

1. **DTO class'larını oluştur** (`DTOs/Auth/`):
   - `LoginRequest`: Email [Required, EmailAddress], Password [Required]
   - `RegisterRequest`: Email [Required, EmailAddress], Password [Required, MinLength(6)], FullName [Required]
   - `TokenResponse`: AccessToken, RefreshToken, ExpiresAt (DateTime)
   - `ChangePasswordRequest`: CurrentPassword [Required], NewPassword [Required, MinLength(6)]

2. **ClaimsPrincipalExtensions oluştur** (`Extensions/ClaimsPrincipalExtensions.cs`):
   - `GetUserId()` → Guid — ClaimTypes.NameIdentifier'dan parse
   - `GetRole()` → UserRole — ClaimTypes.Role'den parse
   - `GetGroupMemberships()` → List<(Guid GroupId, GroupMemberRole Role)> — custom "GroupMemberships" claim'inden parse (JSON array formatında)
   - `IsSuperAdmin()` → bool

3. **ITokenService + TokenService oluştur** (`Services/`):
   - `GenerateAccessToken(User user, List<GroupMember> memberships)` → string JWT. Claims: sub=userId, email, role (UserRole), groupMemberships (JSON: [{groupId, role}]). Signing: SymmetricSecurityKey, HmacSha256. Expiry: appsettings'den.
   - `GenerateRefreshToken()` → string — `RandomNumberGenerator.GetBytes(64)` → base64
   - `SaveRefreshToken(Guid userId, string token)` → RefreshToken entity'yi DB'ye kaydet
   - `ValidateRefreshToken(string token)` → RefreshToken veya null — DB'den bul, revoked/expired kontrolü
   - `RevokeRefreshToken(RefreshToken token)` → RevokedAt = UtcNow

4. **IAuthService + AuthService oluştur** (`Services/`):
   - `Register(RegisterRequest request)` → TokenResponse — email uniqueness kontrolü, PasswordHasher.HashPassword, User oluştur, token pair üret. Çağıran superadmin veya grup admin olmalı (controller'da kontrol edilir).
   - `Login(LoginRequest request)` → TokenResponse veya null — email ile User bul, PasswordHasher.VerifyHashedPassword, grupları çek, token pair üret.
   - `RefreshToken(string refreshToken)` → TokenResponse veya null — validate, revoke eski, kullanıcıyı ve gruplarını çek, yeni token pair üret (rotation).
   - `ChangePassword(Guid userId, ChangePasswordRequest request)` → bool — mevcut şifreyi doğrula, yeni hash kaydet.

5. **Program.cs'e JWT Authentication ekle:**
   ```csharp
   builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
       .AddJwtBearer(options => {
           options.TokenValidationParameters = new TokenValidationParameters {
               ValidateIssuer = true,
               ValidIssuer = jwtSettings.Issuer,
               ValidateAudience = true,
               ValidAudience = jwtSettings.Audience,
               ValidateLifetime = true,
               ValidateIssuerSigningKey = true,
               IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret)),
               ClockSkew = TimeSpan.Zero // Tam süre kontrolü
           };
       });
   ```
   - DI kayıtları: `IPasswordHasher<User>` → `PasswordHasher<User>`, `ITokenService` → `TokenService`, `IAuthService` → `AuthService`
   - `app.UseAuthentication()` + `app.UseAuthorization()` middleware sıralaması doğru olmalı

6. **AuthController oluştur** (`Controllers/AuthController.cs`):
   - `POST /api/auth/login` — [AllowAnonymous], LoginRequest → TokenResponse veya 401
   - `POST /api/auth/register` — [Authorize] (superadmin check in action), RegisterRequest → 201 + TokenResponse veya 400/403
   - `POST /api/auth/refresh` — [AllowAnonymous], body'den refreshToken → TokenResponse veya 401
   - `POST /api/auth/change-password` — [Authorize], ChangePasswordRequest → 200 veya 400
   - Hata response'ları yapılandırılmış: `{ error: "invalid_credentials", message: "..." }` formatı

7. **Manuel test:** `dotnet run` ile API başlat, curl/httpie ile:
   - POST /api/auth/login (seed admin) → 200 + JWT token
   - POST /api/auth/register (JWT header ile) → 201 + yeni kullanıcı
   - POST /api/auth/refresh → 200 + yeni token pair
   - POST /api/auth/change-password → 200
   - Authenticated endpoint without token → 401

## Must-Haves

- [ ] Login endpoint seed admin ile çalışır, valid JWT döner
- [ ] Register endpoint yeni kullanıcı oluşturur (sadece superadmin/grup admin çağırabilir)
- [ ] Refresh token rotation çalışır — eski token revoke, yeni üretilir
- [ ] Change password çalışır — eski şifre ile login olmaz, yeni ile olur
- [ ] Unauthenticated request'ler 401 döner
- [ ] JWT claims doğru: userId, email, role, groupMemberships
- [ ] Password hashing PasswordHasher<User> ile (custom hash yok)
- [ ] Hata response'ları structured JSON formatında

## Verification

- `dotnet build GurkanApi/` — hatasız
- `dotnet run --project GurkanApi/` ile API başlatılıp:
  - `curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@gurkan.com","password":"Admin123!"}'` → 200 + token
  - Token ile register, refresh, change-password endpoint'leri test edilir
  - Token olmadan authenticated endpoint → 401

## Observability Impact

- Signals added: Auth başarılı/başarısız log'ları (ILogger) — userId, email, başarı/hata, timestamp
- How a future agent inspects: API log çıktısında "Auth login succeeded/failed" mesajları, 401/403 HTTP response
- Failure state exposed: 401 response body `{ error, message }`, log'da failed login attempt

## Inputs

- `GurkanApi/` — T01'den çalışır proje, entity'ler, DbContext, migration
- `GurkanApi/Entities/` — User, RefreshToken, GroupMember entity'leri
- `GurkanApi/Data/ApplicationDbContext.cs` — DbContext
- `GurkanApi/appsettings.json` — JWT settings (Secret, Issuer, Audience, expiry), seed admin bilgileri

## Expected Output

- `GurkanApi/DTOs/Auth/` — LoginRequest.cs, RegisterRequest.cs, TokenResponse.cs, ChangePasswordRequest.cs
- `GurkanApi/Services/` — IAuthService.cs, AuthService.cs, ITokenService.cs, TokenService.cs
- `GurkanApi/Controllers/AuthController.cs` — 4 endpoint
- `GurkanApi/Extensions/ClaimsPrincipalExtensions.cs` — JWT claim helper'ları
- `GurkanApi/Program.cs` — JWT auth configuration + DI kayıtları eklendi
