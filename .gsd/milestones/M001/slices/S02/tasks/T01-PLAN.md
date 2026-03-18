---
estimated_steps: 8
estimated_files: 12
---

# T01: Expand Property entity, add PropertyNote, create controllers and DTOs

**Slice:** S02 — Mülk Yönetimi
**Milestone:** M001

## Description

Build the complete property management backend. Expand the existing placeholder Property entity (currently Id, Name, GroupId) into a full model with type, address, area, currency, etc. Add PropertyType and Currency enums. Create PropertyNote entity for chronological notes. Generate EF Core migration. Build PropertiesController (5 CRUD endpoints with group-based access control) and PropertyNotesController (4 endpoints nested under /api/properties/{id}/notes). Create all request/response DTOs.

Follow established patterns from GroupsController: constructor injection of ApplicationDbContext + IGroupAccessService + ILogger, superadmin bypass then group membership check, structured error responses, structured logging.

## Steps

1. **Expand enums** — Add `PropertyType` (Apartment, House, Shop, Land, Office, Other) and `Currency` (TRY, USD, EUR) to `GurkanApi/Entities/Enums.cs`.

2. **Expand Property entity** — Add fields to `GurkanApi/Entities/Property.cs`: Type (PropertyType), Address (string), City (string), District (string), Area (decimal?, square meters), RoomCount (int?), Floor (int?), TotalFloors (int?), BuildYear (int?), Currency (Currency), Description (string?), CreatedAt (DateTime), UpdatedAt (DateTime?). Keep existing Id, Name, GroupId, Group navigation property.

3. **Create PropertyNote entity** — New file `GurkanApi/Entities/PropertyNote.cs`: Id (Guid), PropertyId (Guid), Content (string), CreatedBy (Guid — userId), CreatedAt (DateTime). Navigation properties: Property, CreatedByUser (User).

4. **Update ApplicationDbContext** — Add `DbSet<PropertyNote> PropertyNotes`. Expand Property Fluent API config: enum-to-string conversions for Type and Currency (`HasConversion<string>()`), max lengths on all string fields (Address: 500, City: 100, District: 100, Description: 2000), CreatedAt default `now() at time zone 'utc'`. Add PropertyNote config: FK to Property (Cascade delete), FK to User (Restrict delete — don't delete notes when user is deleted), Content required max 5000, CreatedAt default.

5. **Generate migration** — Run `cd GurkanApi && dotnet ef migrations add AddPropertyFieldsAndNotes`. Verify the migration alters the existing Properties table (adds columns) rather than dropping/recreating it.

6. **Create DTOs** — All under `GurkanApi/DTOs/Properties/`:
   - `CreatePropertyRequest.cs`: Name (required), Type (PropertyType), Address, City, District, Area, RoomCount, Floor, TotalFloors, BuildYear, Currency (Currency), Description, GroupId (Guid, required — unassigned properties are meaningless)
   - `UpdatePropertyRequest.cs`: All fields optional (nullable)
   - `PropertyResponse.cs`: All fields + Id + GroupId + GroupName + CreatedAt + UpdatedAt
   - `PropertyListResponse.cs`: Id, Name, Type, City, Currency, GroupId, GroupName (lightweight for list)
   - `CreateNoteRequest.cs`: Content (required)
   - `UpdateNoteRequest.cs`: Content (required)
   - `PropertyNoteResponse.cs`: Id, Content, CreatedByName (string — resolved from User), CreatedAt

7. **Build PropertiesController** — `GurkanApi/Controllers/PropertiesController.cs` at route `api/properties`:
   - `GET /` — List properties. Superadmin sees all; others see only properties in their groups (use `_access.GetUserGroupIdsAsync` to filter). Include group name via Include. Return `List<PropertyListResponse>`.
   - `GET /{id}` — Get single property. Check access via `_access.CanAccessPropertyAsync`. Include group name. Return `PropertyResponse`.
   - `POST /` — Create property. Superadmin can create in any group; group admin/member must be in the specified group (check via `_access.CanManageGroupAsync` or `_access.IsUserInGroupAsync`). Set CreatedAt = DateTime.UtcNow. Return 201 with `PropertyResponse`.
   - `PUT /{id}` — Update property. Check access via `_access.CanAccessPropertyAsync`. Apply only non-null fields from UpdatePropertyRequest. Set UpdatedAt = DateTime.UtcNow. Return `PropertyResponse`.
   - `DELETE /{id}` — Delete property. Superadmin or group admin only (check via `_access.CanManageGroupAsync` on the property's group). Return 204.
   - All endpoints: `[Authorize]`, structured error responses `{ error, message }`, structured logging.

8. **Build PropertyNotesController** — `GurkanApi/Controllers/PropertyNotesController.cs` at route `api/properties/{propertyId}/notes`:
   - All endpoints first verify property exists and user has access via `_access.CanAccessPropertyAsync`.
   - `GET /` — List notes for property, ordered by CreatedAt descending. Include CreatedByUser for name resolution. Return `List<PropertyNoteResponse>`.
   - `POST /` — Create note. Set CreatedBy = User.GetUserId(), CreatedAt = DateTime.UtcNow. Return 201 with `PropertyNoteResponse`.
   - `PUT /{noteId}` — Update note. Only note creator or superadmin can update. Return `PropertyNoteResponse`.
   - `DELETE /{noteId}` — Delete note. Only note creator or superadmin can delete. Return 204.

9. **Verify build** — Run `dotnet build GurkanApi/` and fix any compilation errors.

## Must-Haves

- [ ] Property entity has all planned fields (Type, Address, City, District, Area, RoomCount, Floor, TotalFloors, BuildYear, Currency, Description, CreatedAt, UpdatedAt)
- [ ] PropertyType and Currency enums exist with correct values
- [ ] PropertyNote entity exists with FK to Property and User
- [ ] EF Core migration generated that ALTERs (not drops) Properties table
- [ ] PropertiesController has 5 endpoints with group-based access control
- [ ] PropertyNotesController has 4 endpoints with property access check
- [ ] All DTOs exist and map correctly
- [ ] `dotnet build GurkanApi/` succeeds

## Verification

- `dotnet build GurkanApi/` — compiles without errors
- Inspect generated migration file — confirms ALTER TABLE with ADD COLUMN statements, not DROP TABLE

## Observability Impact

- Signals added: `"Property {action}: PropertyId={PropertyId}, By={UserId}"` on create/update/delete; `"PropertyNote {action}: NoteId={NoteId}, PropertyId={PropertyId}, By={UserId}"` on note operations; `"Property access denied: UserId={UserId}, PropertyId={PropertyId}"` on 403
- How a future agent inspects: Swagger UI shows all new endpoints; `GET /api/properties` returns property state
- Failure state exposed: 403/404 responses with `{ error, message }` JSON body

## Inputs

- `GurkanApi/Entities/Property.cs` — existing placeholder entity (Id, Name, GroupId)
- `GurkanApi/Entities/Enums.cs` — existing enums (UserRole, GroupMemberRole)
- `GurkanApi/Data/ApplicationDbContext.cs` — existing DbContext with Property config
- `GurkanApi/Controllers/GroupsController.cs` — pattern reference for controller structure, access control, error responses, logging
- `GurkanApi/Services/GroupAccessService.cs` — CanAccessPropertyAsync, GetUserGroupIdsAsync, CanManageGroupAsync, IsUserInGroupAsync methods
- `GurkanApi/Extensions/ClaimsPrincipalExtensions.cs` — GetUserId(), GetRole(), IsSuperAdmin() helpers

## Expected Output

- `GurkanApi/Entities/Property.cs` — expanded with all fields
- `GurkanApi/Entities/PropertyNote.cs` — new entity
- `GurkanApi/Entities/Enums.cs` — PropertyType and Currency enums added
- `GurkanApi/Data/ApplicationDbContext.cs` — PropertyNote DbSet + expanded Fluent API config
- `GurkanApi/Controllers/PropertiesController.cs` — 5 CRUD endpoints
- `GurkanApi/Controllers/PropertyNotesController.cs` — 4 note endpoints
- `GurkanApi/DTOs/Properties/CreatePropertyRequest.cs`
- `GurkanApi/DTOs/Properties/UpdatePropertyRequest.cs`
- `GurkanApi/DTOs/Properties/PropertyResponse.cs`
- `GurkanApi/DTOs/Properties/PropertyListResponse.cs`
- `GurkanApi/DTOs/Properties/CreateNoteRequest.cs`
- `GurkanApi/DTOs/Properties/UpdateNoteRequest.cs`
- `GurkanApi/DTOs/Properties/PropertyNoteResponse.cs`
- `GurkanApi/Migrations/*_AddPropertyFieldsAndNotes.cs` — ALTER TABLE migration
