---
estimated_steps: 6
estimated_files: 11
---

# T03: Implement GroupsController, UsersController and group-based access control

**Slice:** S01 — Auth & Grup Bazlı Erişim
**Milestone:** M001

## Description

Grup CRUD, üye yönetimi, mülk atama, grup admin delegasyonu ve erişim kontrolü servisi oluşturulur. Tamamlandığında superadmin grup oluşturur/yönetir, grup admin kendi grubunda tam yetki sahibidir, üye sadece kendi gruplarını görür. R002 (grup bazlı erişim), R003 (superadmin tüm yetki), R004 (grup admin delegasyonu) burada karşılanır.

## Steps

1. **DTO class'larını oluştur:**
   - `DTOs/Groups/CreateGroupRequest`: Name [Required], Description
   - `DTOs/Groups/UpdateGroupRequest`: Name, Description
   - `DTOs/Groups/AddMemberRequest`: UserId [Required], Role [Required] (GroupMemberRole enum)
   - `DTOs/Groups/GroupResponse`: Id, Name, Description, CreatedAt, Members (list of GroupMemberResponse), PropertyCount
   - `DTOs/Groups/GroupMemberResponse`: UserId, FullName, Email, Role, JoinedAt
   - `DTOs/Users/UserResponse`: Id, Email, FullName, Role, CreatedAt, GroupCount
   - `DTOs/Users/UpdateRoleRequest`: Role [Required] (UserRole enum)

2. **IGroupAccessService + GroupAccessService oluştur** (`Services/`):
   - `IsUserInGroup(Guid userId, Guid groupId)` → bool — DB'den GroupMember kontrolü
   - `IsGroupAdmin(Guid userId, Guid groupId)` → bool — GroupMember.Role == Admin kontrolü
   - `GetUserGroupIds(Guid userId)` → List<Guid> — kullanıcının tüm grup ID'leri
   - `CanManageGroup(Guid userId, Guid groupId, UserRole globalRole)` → bool — superadmin: true, grup admin: sadece kendi grubu, üye: false
   - `CanAccessProperty(Guid userId, Guid propertyId, UserRole globalRole)` → bool — superadmin: true, yoksa property'nin GroupId'si üzerinden grup üyeliği kontrolü
   - **Superadmin her zaman true döner** — tüm metotlarda ilk kontrol

3. **GroupsController oluştur** (`Controllers/GroupsController.cs`):
   - `GET /api/groups` — [Authorize]. Superadmin: tüm gruplar. Üye: sadece kendi grupları (GroupAccessService.GetUserGroupIds ile filtrele). Include Members count.
   - `GET /api/groups/{id}` — [Authorize]. Erişim kontrolü: superadmin veya grup üyesi. 403 yoksa. Include Members listesi.
   - `POST /api/groups` — [Authorize]. Superadmin only (ClaimsPrincipalExtensions.IsSuperAdmin kontrolü). 403 yoksa. Return 201 + GroupResponse.
   - `PUT /api/groups/{id}` — [Authorize]. Superadmin veya grup admin. CanManageGroup kontrolü.
   - `DELETE /api/groups/{id}` — [Authorize]. Superadmin only. Silme: GroupMembers cascade, Property'lerin GroupId null yapılır (unassigned).
   - `POST /api/groups/{id}/members` — [Authorize]. Superadmin veya grup admin (CanManageGroup). AddMemberRequest ile userId + role. Kullanıcı zaten üyeyse → 409 Conflict. Return 201 + GroupMemberResponse.
   - `DELETE /api/groups/{id}/members/{userId}` — [Authorize]. Superadmin veya grup admin. Üye çıkarma.
   - `POST /api/groups/{id}/properties` — [Authorize]. Superadmin veya grup admin. Body: `{ propertyId }`. Property'nin GroupId'sini set et.
   - `DELETE /api/groups/{id}/properties/{propertyId}` — [Authorize]. Superadmin veya grup admin. Property'nin GroupId'sini null yap.

4. **UsersController oluştur** (`Controllers/UsersController.cs`):
   - `GET /api/users` — [Authorize]. Superadmin only: tüm kullanıcılar listesi (UserResponse). 403 yoksa.
   - `PATCH /api/users/{id}/role` — [Authorize]. Superadmin only. UpdateRoleRequest ile UserRole değiştir. Kendini demote edemez kontrolü. Return updated UserResponse.

5. **Program.cs güncellemeleri:**
   - `builder.Services.AddScoped<IGroupAccessService, GroupAccessService>()` DI kaydı
   - Gerekirse authorization policy tanımları: `options.AddPolicy("SuperAdminOnly", p => p.RequireClaim(ClaimTypes.Role, "SuperAdmin"))` — ama action-level check de yeterli, tercih controller'da inline kontrol.

6. **Manuel test:** API çalışırken seed admin ile login, grup oluştur, register ile yeni kullanıcı, gruba ekle, kullanıcı ile login, GET /api/groups → sadece kendi grubu, başka gruba erişim → 403.

## Must-Haves

- [ ] Superadmin tüm grupları görür ve yönetir (oluşturma, silme, üye ekleme/çıkarma)
- [ ] Grup admin kendi grubunda tam yetki — üye ekleme/çıkarma, mülk atama/çıkarma
- [ ] Grup admin başka gruba erişemez → 403
- [ ] Üye sadece kendi gruplarını görür (GET /api/groups)
- [ ] Üye başka grubun detayına erişemez → 403
- [ ] Superadmin başka kullanıcıyı grup admin veya superadmin yapabilir (PATCH role)
- [ ] Üye kullanıcı listesine erişemez → 403
- [ ] GroupAccessService downstream slice'lar (S02+) tarafından kullanılabilir

## Verification

- `dotnet build GurkanApi/` — hatasız
- API çalışırken:
  - Superadmin ile login → POST /api/groups → 201
  - Register yeni kullanıcı → POST /api/groups/{id}/members → 201
  - Yeni kullanıcı login → GET /api/groups → sadece kendi grubu
  - Yeni kullanıcı → GET /api/groups/{başkaGrupId} → 403
  - Superadmin → PATCH /api/users/{id}/role → grup admin yapma
  - Grup admin → POST /api/groups/{id}/members → kendi grubuna üye ekleme başarılı

## Observability Impact

- Signals added: Grup erişim kontrol log'ları — userId, groupId, erişim kabul/red, işlem tipi
- How a future agent inspects: 403 response body structured error, API log'larında access denied mesajları
- Failure state exposed: 403 `{ error: "forbidden", message: "You don't have access to this group" }`, 404 `{ error: "not_found", message: "..." }`

## Inputs

- `GurkanApi/` — T01+T02'den çalışır proje, auth sistemi, entity'ler
- `GurkanApi/Controllers/AuthController.cs` — register endpoint (kullanıcı oluşturma)
- `GurkanApi/Services/IAuthService.cs` — register metodu
- `GurkanApi/Extensions/ClaimsPrincipalExtensions.cs` — GetUserId(), GetRole(), IsSuperAdmin()
- `GurkanApi/Entities/` — User, Group, GroupMember, Property entity'leri
- `GurkanApi/Data/ApplicationDbContext.cs` — DbContext

## Expected Output

- `GurkanApi/DTOs/Groups/` — CreateGroupRequest.cs, UpdateGroupRequest.cs, AddMemberRequest.cs, GroupResponse.cs, GroupMemberResponse.cs
- `GurkanApi/DTOs/Users/` — UserResponse.cs, UpdateRoleRequest.cs
- `GurkanApi/Services/IGroupAccessService.cs` + `GroupAccessService.cs` — erişim kontrolü servisi
- `GurkanApi/Controllers/GroupsController.cs` — 9 endpoint
- `GurkanApi/Controllers/UsersController.cs` — 2 endpoint
- `GurkanApi/Program.cs` — GroupAccessService DI kaydı eklendi
