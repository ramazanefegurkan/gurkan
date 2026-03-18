---
id: T03
parent: S01
milestone: M001
provides:
  - GroupsController with 9 endpoints (CRUD, member management, property assignment)
  - UsersController with 2 endpoints (list users, update role)
  - IGroupAccessService + GroupAccessService for group-based access control
  - DTO classes for Groups and Users
key_files:
  - GurkanApi/Controllers/GroupsController.cs
  - GurkanApi/Controllers/UsersController.cs
  - GurkanApi/Services/IGroupAccessService.cs
  - GurkanApi/Services/GroupAccessService.cs
key_decisions:
  - "Inline authorization checks in controller actions (not policy-based) — simpler, explicit, easier to audit per-endpoint"
  - "GroupAccessService queries DB directly rather than relying on JWT group claims — ensures fresh data after membership changes"
patterns_established:
  - "Access control pattern: superadmin check first, then CanManageGroup/IsUserInGroup for group-scoped actions"
  - "Structured 403 responses: { error: 'forbidden', message: '...' } — consistent with T02 auth error format"
  - "Group member management via /api/groups/{id}/members sub-resource, property assignment via /api/groups/{id}/properties"
observability_surfaces:
  - "Group access logs: 'Group access granted/denied: UserId={}, GroupId={}, Action={}' in server logs"
  - "Member/property lifecycle logs: 'Member added/removed', 'Property assigned/unassigned' with actor ID"
  - "User role change log: 'User role updated: UserId={}, From={}, To={}, By={}'"
duration: 25m
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T03: Implement GroupsController, UsersController and group-based access control

**Added GroupsController (9 endpoints), UsersController (2 endpoints), and GroupAccessService for group-based RBAC — superadmin manages all, group admin manages own group, members see only their groups**

## What Happened

Created DTOs for group and user operations (8 files), implemented IGroupAccessService/GroupAccessService with five access-check methods that always short-circuit for superadmin, built GroupsController with full CRUD plus member and property sub-resource management, and UsersController with list-all and role-update endpoints. Registered GroupAccessService in DI.

All 9 GroupsController endpoints: GET (list with role-based filtering), GET by id (member check), POST (superadmin only), PUT (manage check), DELETE (superadmin only, unassigns properties), POST members, DELETE members, POST properties, DELETE properties.

UsersController: GET (superadmin only), PATCH role (superadmin only, self-demote blocked).

## Verification

Full API verification with Node.js test script covering all must-haves:
- Superadmin login → create group → 201 ✅
- Register user → add to group → 201 ✅
- Duplicate member add → 409 ✅
- Member login → GET /api/groups → sees only own group (count=1) ✅
- Member → GET /api/groups/{otherGroup} → 403 ✅
- Member → GET /api/users → 403 ✅
- Superadmin → PATCH role → 200 ✅
- Self-demote → 400 ✅
- Group admin → add member to own group → 201 ✅
- Group admin → add member to other group → 403 ✅
- Superadmin → GET /api/groups → sees all (count=2) ✅
- Superadmin → DELETE groups → 204 ✅
- `dotnet build` → 0 errors, 0 warnings ✅

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `dotnet build GurkanApi/` | 0 | ✅ pass | 1.1s |
| 2 | Superadmin POST /api/groups → 201 | — | ✅ pass | — |
| 3 | POST /api/groups/{id}/members → 201 | — | ✅ pass | — |
| 4 | Member GET /api/groups → own groups only | — | ✅ pass | — |
| 5 | Member GET /api/groups/{other} → 403 | — | ✅ pass | — |
| 6 | Member GET /api/users → 403 | — | ✅ pass | — |
| 7 | PATCH /api/users/{id}/role → 200 | — | ✅ pass | — |
| 8 | Self-demote → 400 | — | ✅ pass | — |
| 9 | Group admin add member own group → 201 | — | ✅ pass | — |
| 10 | Group admin add member other group → 403 | — | ✅ pass | — |
| 11 | Superadmin GET all groups → count=2 | — | ✅ pass | — |
| 12 | DELETE groups → 204 | — | ✅ pass | — |

Slice-level verification (partial — T04 will complete):
- `dotnet test GurkanApi.Tests/ --filter "Category=S01"` — test project not yet created (T04 scope)

## Diagnostics

- **Group access control:** 403 responses include `{ error: "forbidden", message: "..." }` — searchable in logs
- **API logs:** Server stdout shows group access granted/denied, member added/removed, role updated with userId and groupId
- **User listing:** `GET /api/users` (superadmin token) shows all users with role and group count
- **Group inspection:** `GET /api/groups` (superadmin token) shows all groups with member list and property count
- **curl test:** `curl -X POST http://localhost:5000/api/groups -H "Authorization: Bearer {token}" -H "Content-Type: application/json" -d '{"name":"Test"}'`

## Deviations

- Added `AssignPropertyRequest` DTO (not explicitly in plan but needed for POST /api/groups/{id}/properties body binding)
- Used Node.js for verification script instead of curl chain (Python unavailable, jq unavailable on this Windows environment)

## Known Issues

None.

## Files Created/Modified

- `GurkanApi/DTOs/Groups/CreateGroupRequest.cs` — group creation DTO with validation
- `GurkanApi/DTOs/Groups/UpdateGroupRequest.cs` — group update DTO (optional fields)
- `GurkanApi/DTOs/Groups/AddMemberRequest.cs` — member add DTO with UserId + Role
- `GurkanApi/DTOs/Groups/GroupResponse.cs` — group response with members list and property count
- `GurkanApi/DTOs/Groups/GroupMemberResponse.cs` — member response with user details
- `GurkanApi/DTOs/Groups/AssignPropertyRequest.cs` — property assignment DTO
- `GurkanApi/DTOs/Users/UserResponse.cs` — user response with role and group count
- `GurkanApi/DTOs/Users/UpdateRoleRequest.cs` — role update DTO
- `GurkanApi/Services/IGroupAccessService.cs` — access control interface
- `GurkanApi/Services/GroupAccessService.cs` — access control implementation with DB queries and logging
- `GurkanApi/Controllers/GroupsController.cs` — 9 endpoints for group CRUD, members, properties
- `GurkanApi/Controllers/UsersController.cs` — 2 endpoints for user listing and role management
- `GurkanApi/Program.cs` — added GroupAccessService DI registration
