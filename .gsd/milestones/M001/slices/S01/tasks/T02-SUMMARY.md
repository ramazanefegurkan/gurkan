---
id: T02
parent: S01
milestone: M001
provides:
  - JWT authentication pipeline (login, register, refresh, change-password)
  - TokenService for JWT generation and refresh token rotation
  - AuthService for user authentication and registration
  - ClaimsPrincipalExtensions for extracting userId, role, groupMemberships from JWT
  - AuthController with 4 endpoints (all anonymous/authorized correctly)
  - Structured error responses ({error, message} format)
key_files:
  - GurkanApi/Controllers/AuthController.cs
  - GurkanApi/Services/AuthService.cs
  - GurkanApi/Services/TokenService.cs
  - GurkanApi/Services/IAuthService.cs
  - GurkanApi/Services/ITokenService.cs
  - GurkanApi/Extensions/ClaimsPrincipalExtensions.cs
  - GurkanApi/DTOs/Auth/LoginRequest.cs
  - GurkanApi/DTOs/Auth/RegisterRequest.cs
  - GurkanApi/DTOs/Auth/TokenResponse.cs
  - GurkanApi/DTOs/Auth/ChangePasswordRequest.cs
  - GurkanApi/DTOs/Auth/RefreshRequest.cs
  - GurkanApi/Program.cs
key_decisions:
  - "ClockSkew=TimeSpan.Zero for JWT validation — exact expiry enforcement, no 5-minute default slack"
  - "RefreshRequest DTO wrapping refreshToken in JSON body (not query param or raw string) for proper model binding"
patterns_established:
  - "Auth service logs: 'Auth {action} succeeded/failed: {UserId} ({Email})' pattern for structured auth auditing"
  - "Structured error responses: { error: 'error_code', message: 'Human-readable message' } on all 4xx/401/403"
  - "Token rotation: old refresh token revoked immediately on use, new pair issued"
  - "Superadmin-only check via ClaimsPrincipalExtensions.IsSuperAdmin() in controller actions"
observability_surfaces:
  - "Auth login succeeded/failed logs with userId and email"
  - "Auth register succeeded/failed logs with userId and email"
  - "Auth refresh succeeded/failed logs with userId"
  - "Auth change-password succeeded/failed logs with userId"
  - "401 response body: { error: 'invalid_credentials', message: '...' }"
  - "403 response body: { error: 'forbidden', message: '...' }"
duration: 15m
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T02: Implement auth services and AuthController (login, register, refresh, change-password)

**Implemented JWT auth pipeline with login, register, refresh token rotation, and change-password — all verified against running API with seed admin**

## What Happened

Built the full JWT authentication layer on top of T01's scaffold. Created DTOs with DataAnnotations validation (LoginRequest, RegisterRequest, TokenResponse, ChangePasswordRequest, RefreshRequest), ClaimsPrincipalExtensions for JWT claim parsing, TokenService for JWT generation (HmacSha256, configurable expiry from appsettings) and refresh token CRUD with rotation, and AuthService for login/register/refresh/change-password business logic with PasswordHasher<User>.

Program.cs was updated with JWT Bearer authentication configuration (symmetric key, issuer/audience validation, ClockSkew=Zero), DI registrations for ITokenService, IAuthService, and middleware ordering (UseAuthentication before UseAuthorization).

AuthController exposes four endpoints: POST /api/auth/login (AllowAnonymous), POST /api/auth/register (Authorize + superadmin check), POST /api/auth/refresh (AllowAnonymous), POST /api/auth/change-password (Authorize). All error responses use structured JSON format.

JWT claims include: NameIdentifier (userId), Email, Role (UserRole enum), GroupMemberships (JSON array of {groupId, role}). The GroupMemberships claim is empty for users with no group memberships and will be populated when T03 adds group management.

## Verification

- `dotnet build GurkanApi/` — 0 warnings, 0 errors ✅
- Login with seed admin (admin@gurkan.com / Admin123!) → 200 + valid JWT ✅
- JWT payload decoded: userId, email, role=SuperAdmin, GroupMemberships=[], iss=GurkanApi, aud=GurkanClient ✅
- Register new user with superadmin token → 201 + token pair ✅
- Login with newly registered user → 200 ✅
- Non-superadmin register attempt → 403 with structured error ✅
- Register without token → 401 ✅
- Refresh token → 200 + new token pair ✅
- Refresh with revoked token (same token reused) → 401 ✅
- Change password → 200 ✅
- Login with old password after change → 401 ✅
- Login with new password after change → 200 ✅
- Invalid credentials → 401 with structured error ✅
- Server logs show auth success/failure messages with userId and email ✅

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `dotnet build GurkanApi/` | 0 | ✅ pass | 1.1s |
| 2 | `curl POST /api/auth/login (seed admin)` | 0 (HTTP 200) | ✅ pass | <1s |
| 3 | `curl POST /api/auth/register (with JWT)` | 0 (HTTP 201) | ✅ pass | <1s |
| 4 | `curl POST /api/auth/register (no token)` | 0 (HTTP 401) | ✅ pass | <1s |
| 5 | `curl POST /api/auth/register (non-superadmin)` | 0 (HTTP 403) | ✅ pass | <1s |
| 6 | `curl POST /api/auth/refresh` | 0 (HTTP 200) | ✅ pass | <1s |
| 7 | `curl POST /api/auth/refresh (revoked token)` | 0 (HTTP 401) | ✅ pass | <1s |
| 8 | `curl POST /api/auth/change-password` | 0 (HTTP 200) | ✅ pass | <1s |
| 9 | `curl POST /api/auth/login (old password)` | 0 (HTTP 401) | ✅ pass | <1s |
| 10 | `curl POST /api/auth/login (new password)` | 0 (HTTP 200) | ✅ pass | <1s |

Slice-level verification (`dotnet test GurkanApi.Tests/ --filter "Category=S01"`) — not applicable yet, test project created in T04.

## Diagnostics

- **Auth test:** `curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@gurkan.com","password":"Admin123!"}'` → 200 + token
- **Token decode:** Base64-decode the JWT payload (second dot-delimited segment) to inspect claims
- **Refresh tokens in DB:** `docker exec gurkan-postgres psql -U postgres -d gurkan -c 'SELECT "UserId","Token","ExpiresAt","RevokedAt" FROM "RefreshTokens"'`
- **Auth logs:** Server stdout contains "Auth login/register/refresh/change-password succeeded/failed" messages

## Deviations

- Added `RefreshRequest` DTO (not in plan) — needed to properly bind the refresh token from JSON body instead of raw string, which caused model binding issues.

## Known Issues

None.

## Files Created/Modified

- `GurkanApi/DTOs/Auth/LoginRequest.cs` — Login DTO with Email + Password validation
- `GurkanApi/DTOs/Auth/RegisterRequest.cs` — Register DTO with Email + Password + FullName validation
- `GurkanApi/DTOs/Auth/TokenResponse.cs` — Response DTO with AccessToken + RefreshToken + ExpiresAt
- `GurkanApi/DTOs/Auth/ChangePasswordRequest.cs` — Change password DTO with CurrentPassword + NewPassword validation
- `GurkanApi/DTOs/Auth/RefreshRequest.cs` — Refresh DTO wrapping refreshToken string
- `GurkanApi/Extensions/ClaimsPrincipalExtensions.cs` — GetUserId(), GetRole(), GetGroupMemberships(), IsSuperAdmin() helpers
- `GurkanApi/Services/ITokenService.cs` — Token service interface
- `GurkanApi/Services/TokenService.cs` — JWT generation, refresh token CRUD with rotation
- `GurkanApi/Services/IAuthService.cs` — Auth service interface
- `GurkanApi/Services/AuthService.cs` — Login, register, refresh, change-password logic
- `GurkanApi/Controllers/AuthController.cs` — 4 auth endpoints with proper authorization
- `GurkanApi/Program.cs` — JWT Bearer auth config, DI registrations, middleware ordering
