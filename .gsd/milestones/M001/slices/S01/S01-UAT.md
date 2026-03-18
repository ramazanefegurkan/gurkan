# S01: Auth & Grup Bazlı Erişim — UAT

**Milestone:** M001
**Written:** 2026-03-18

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: 18 integration tests cover the full auth + group access control contract against a real PostgreSQL database. All API endpoints tested with real HTTP requests via WebApplicationFactory.

## Preconditions

- Docker Desktop running
- `docker compose up -d db` — PostgreSQL container on port 5434
- `dotnet ef database update --project GurkanApi/` — migrations applied
- Seed admin exists: admin@gurkan.com / Admin123!

## Smoke Test

Run `dotnet test GurkanApi.Tests/ --filter "Category=S01"` — all 18 tests must pass.

## Test Cases

### 1. Seed Admin Login

1. POST `/api/auth/login` with `{"email":"admin@gurkan.com","password":"Admin123!"}`
2. **Expected:** 200 with `{ accessToken, refreshToken, expiresAt }`. Decode JWT payload — should contain `sub` (userId GUID), `email` = admin@gurkan.com, `role` = SuperAdmin.

### 2. Register New User (as Superadmin)

1. Login as seed admin (get JWT)
2. POST `/api/auth/register` with Bearer token, body `{"email":"test@test.com","password":"Test123!","fullName":"Test User"}`
3. **Expected:** 201 with token pair. New user can now login with their credentials.

### 3. Register Blocked for Non-Superadmin

1. Register a user via superadmin
2. Login as the new user (role=User)
3. POST `/api/auth/register` with the new user's token
4. **Expected:** 403 with `{ error: "forbidden", message: "..." }`

### 4. Refresh Token Rotation

1. Login as seed admin — save refreshToken
2. POST `/api/auth/refresh` with `{"refreshToken":"<saved token>"}`
3. **Expected:** 200 with new token pair
4. POST `/api/auth/refresh` with the same old token again
5. **Expected:** 401 — old token is revoked after single use

### 5. Change Password

1. Login as seed admin
2. POST `/api/auth/change-password` with `{"currentPassword":"Admin123!","newPassword":"NewPass123!"}`
3. **Expected:** 200
4. Login with old password → 401
5. Login with new password → 200

### 6. Superadmin Creates Group

1. Login as seed admin
2. POST `/api/groups` with `{"name":"Aile","description":"Aile grubu"}`
3. **Expected:** 201 with group details including id, name, empty members list

### 7. Superadmin Adds User to Group

1. Login as seed admin, create group, register a user
2. POST `/api/groups/{groupId}/members` with `{"userId":"<userId>","role":"Member"}`
3. **Expected:** 201

### 8. Member Sees Only Own Groups

1. Setup: superadmin creates 2 groups, adds user to group A only
2. Login as the user
3. GET `/api/groups`
4. **Expected:** 200, array contains only group A (not group B)

### 9. Member Cannot Access Other Group

1. Setup: superadmin creates 2 groups, adds user to group A only
2. Login as the user
3. GET `/api/groups/{groupBId}`
4. **Expected:** 403 with structured error

### 10. Superadmin Delegates Group Admin

1. Login as superadmin, register a user
2. PATCH `/api/users/{userId}/role` with `{"role":"User"}` (already User, just verifying endpoint)
3. Add user to group with role=Admin via POST `/api/groups/{id}/members` with `{"userId":"...","role":"Admin"}`
4. **Expected:** 201 — user is now group admin

### 11. Group Admin Manages Own Group

1. Setup: superadmin creates group, adds user as group admin
2. Login as group admin
3. Register another user (via superadmin), then as group admin: POST `/api/groups/{ownGroupId}/members` with the new user
4. **Expected:** 201

### 12. Group Admin Blocked from Other Group

1. Setup: superadmin creates 2 groups, makes user admin of group A
2. Login as group admin
3. POST `/api/groups/{groupBId}/members` — try to add someone to group B
4. **Expected:** 403

### 13. Superadmin Assigns Property to Group

1. Login as superadmin, create group
2. Insert a property into DB (or use seed)
3. POST `/api/groups/{groupId}/properties` with `{"propertyId":"<id>"}`
4. **Expected:** 201

### 14. Superadmin Sees All Groups and Users

1. Login as superadmin
2. GET `/api/groups` — should list all groups in system
3. GET `/api/users` — should list all users in system
4. **Expected:** 200 with complete lists

### 15. Regular User Cannot List Users

1. Login as a regular user (role=User)
2. GET `/api/users`
3. **Expected:** 403

## Edge Cases

### Unauthenticated Request

1. GET `/api/groups` without Authorization header
2. **Expected:** 401

### Invalid Credentials

1. POST `/api/auth/login` with wrong password
2. **Expected:** 401 with `{ error: "invalid_credentials", message: "..." }`

### Superadmin Self-Demote Blocked

1. Login as superadmin
2. PATCH `/api/users/{ownId}/role` with `{"role":"User"}`
3. **Expected:** 400 — cannot demote yourself

### Duplicate Member Add

1. Add user to group
2. Try adding same user again
3. **Expected:** 409 Conflict

## Failure Signals

- Any test in `dotnet test --filter "Category=S01"` fails
- Login returns 500 instead of 200/401
- Group creation returns anything other than 201
- Cross-group access returns 200 instead of 403
- Refresh token reuse succeeds instead of returning 401
- Server logs show unhandled exceptions during auth flows

## Requirements Proved By This UAT

- R002 — group-based access control: members see only own groups, 403 on cross-group
- R003 — superadmin full access: sees all groups, all users, creates/manages everything
- R004 — group admin delegation: superadmin delegates, group admin manages own group only
- R005 — JWT auth: login, register, refresh rotation, change password, 401/403 enforcement

## Not Proven By This UAT

- Frontend login/registration UI (no frontend yet)
- Property CRUD beyond placeholder (S02 scope)
- Multi-currency support (S02 scope)
- End-to-end user experience across full application

## Notes for Tester

- Seed admin credentials: admin@gurkan.com / Admin123! (from appsettings.json)
- PostgreSQL runs on port 5434 (not default 5432) — configured in docker-compose.yml
- API runs on http://localhost:5000 by default
- Swagger UI available at http://localhost:5000/swagger/index.html for interactive testing
- All 18 automated tests cover these scenarios — manual testing is supplementary confirmation
