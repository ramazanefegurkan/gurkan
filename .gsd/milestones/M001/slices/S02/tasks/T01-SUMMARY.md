---
id: T01
parent: S02
milestone: M001
provides:
  - Property entity expanded with 13 new fields (Type, Address, City, District, Area, RoomCount, Floor, TotalFloors, BuildYear, Currency, Description, CreatedAt, UpdatedAt)
  - PropertyType and Currency enums
  - PropertyNote entity with FK to Property (cascade) and User (restrict)
  - PropertiesController with 5 CRUD endpoints and group-based access control
  - PropertyNotesController with 4 endpoints nested under /api/properties/{id}/notes
  - 7 DTO classes for request/response mapping
  - EF Core migration that ALTERs Properties table (no data loss)
  - 12 integration tests covering property CRUD, group filtering, access control, notes, multi-currency
key_files:
  - GurkanApi/Entities/Property.cs
  - GurkanApi/Entities/PropertyNote.cs
  - GurkanApi/Entities/Enums.cs
  - GurkanApi/Data/ApplicationDbContext.cs
  - GurkanApi/Controllers/PropertiesController.cs
  - GurkanApi/Controllers/PropertyNotesController.cs
  - GurkanApi/DTOs/Properties/CreatePropertyRequest.cs
  - GurkanApi/DTOs/Properties/UpdatePropertyRequest.cs
  - GurkanApi/DTOs/Properties/PropertyResponse.cs
  - GurkanApi/DTOs/Properties/PropertyListResponse.cs
  - GurkanApi/DTOs/Properties/CreateNoteRequest.cs
  - GurkanApi/DTOs/Properties/UpdateNoteRequest.cs
  - GurkanApi/DTOs/Properties/PropertyNoteResponse.cs
  - GurkanApi/Migrations/20260318114304_AddPropertyFieldsAndNotes.cs
  - GurkanApi.Tests/IntegrationTests/PropertyTests.cs
  - GurkanApi.Tests/IntegrationTests/TestFixture.cs
key_decisions:
  - Kept Property.GroupId as Guid? (nullable) to preserve SetNull cascade on group delete, while CreatePropertyRequest.GroupId is required Guid — unassigned properties exist only as a result of group deletion, not creation
patterns_established:
  - PropertiesController follows GroupsController pattern: constructor DI of DbContext + IGroupAccessService + ILogger, superadmin bypass then group membership check, structured {error, message} responses
  - PropertyNotesController uses nested route api/properties/{propertyId}/notes and verifies property access before any note operation
  - Note update/delete restricted to creator or superadmin (not just any group member)
observability_surfaces:
  - "Property {action}: PropertyId={PropertyId}, By={UserId}" on create/update/delete
  - "PropertyNote {action}: NoteId={NoteId}, PropertyId={PropertyId}, By={UserId}" on note operations
  - "Property access denied: UserId={UserId}, PropertyId={PropertyId}" on 403
  - "PropertyNote access denied: UserId={UserId}, NoteId={NoteId}" on note 403
duration: ~25m
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T01: Expand Property entity, add PropertyNote, create controllers and DTOs

**Built complete property management backend: expanded Property entity with 13 fields, PropertyNote entity, PropertyType/Currency enums, PropertiesController (5 endpoints), PropertyNotesController (4 endpoints), 7 DTOs, EF Core migration, and 12 passing integration tests.**

## What Happened

Expanded the placeholder Property entity (was just Id, Name, GroupId) into a full model with PropertyType enum, address fields, area/room/floor metadata, Currency enum, and timestamps. Created PropertyNote entity with FKs to Property (cascade delete) and User (restrict delete). Updated ApplicationDbContext with enum-to-string conversions, max length constraints, and UTC timestamp defaults.

Generated EF Core migration that correctly uses AddColumn to alter the existing Properties table — no data loss. Created PropertyNotes table with proper FK constraints.

Built PropertiesController with 5 endpoints following the established GroupsController pattern: GET (group-filtered list), GET/{id} (access-checked), POST (group-verified), PUT/{id} (partial update), DELETE/{id} (admin-only). Built PropertyNotesController with 4 endpoints nested under /api/properties/{propertyId}/notes, with creator-only update/delete enforcement.

Created 7 DTO classes with validation attributes matching the Fluent API constraints. Also wrote 12 integration tests covering the full CRUD lifecycle, group filtering, access denial (403), multi-currency preservation, and note operations — all passing. Updated TestFixture.cs TRUNCATE to include PropertyNotes table.

## Verification

- `dotnet build GurkanApi/` — 0 errors, 0 warnings
- `dotnet test GurkanApi.Tests/ --filter "Category=S02"` — 12/12 tests passed
- `dotnet test GurkanApi.Tests/ --filter "Category=S01"` — 18/18 tests passed (no regressions)
- Migration file inspected — confirms ALTER TABLE with AddColumn, not DROP TABLE

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `dotnet build GurkanApi/` | 0 | ✅ pass | 1.2s |
| 2 | `dotnet test GurkanApi.Tests/ --filter "Category=S02"` | 0 | ✅ pass | 5.2s |
| 3 | `dotnet test GurkanApi.Tests/ --filter "Category=S01"` | 0 | ✅ pass | 10.1s |

## Diagnostics

- **Swagger UI** at `/swagger/index.html` shows all 9 new endpoints (5 property + 4 notes)
- **GET /api/properties** (authenticated) returns group-filtered property list
- **Structured logs** emit Property/PropertyNote create/update/delete events with UserId and PropertyId
- **403 responses** include `{ error: "forbidden", message: "..." }` JSON body
- **404 responses** include `{ error: "not_found", message: "..." }` JSON body
- **DB inspection**: `SELECT "Id","Name","Type","Currency","GroupId" FROM "Properties"`

## Deviations

- T01 plan didn't include integration tests (they were planned for T02), but I wrote them here since the test patterns were straightforward and verifying the backend now gives higher confidence. T02 may still add edge-case coverage if needed.

## Known Issues

None.

## Files Created/Modified

- `GurkanApi/Entities/Enums.cs` — added PropertyType and Currency enums
- `GurkanApi/Entities/Property.cs` — expanded with 13 new fields
- `GurkanApi/Entities/PropertyNote.cs` — new entity with FK to Property and User
- `GurkanApi/Data/ApplicationDbContext.cs` — added PropertyNotes DbSet, expanded Property Fluent API config, added PropertyNote config
- `GurkanApi/Controllers/PropertiesController.cs` — new controller with 5 CRUD endpoints
- `GurkanApi/Controllers/PropertyNotesController.cs` — new controller with 4 note endpoints
- `GurkanApi/DTOs/Properties/CreatePropertyRequest.cs` — create request DTO with validation
- `GurkanApi/DTOs/Properties/UpdatePropertyRequest.cs` — update request DTO (all fields optional)
- `GurkanApi/DTOs/Properties/PropertyResponse.cs` — full property response DTO
- `GurkanApi/DTOs/Properties/PropertyListResponse.cs` — lightweight list response DTO
- `GurkanApi/DTOs/Properties/CreateNoteRequest.cs` — note create request DTO
- `GurkanApi/DTOs/Properties/UpdateNoteRequest.cs` — note update request DTO
- `GurkanApi/DTOs/Properties/PropertyNoteResponse.cs` — note response DTO
- `GurkanApi/Migrations/20260318114304_AddPropertyFieldsAndNotes.cs` — EF migration (ALTER TABLE + CREATE TABLE)
- `GurkanApi/Migrations/20260318114304_AddPropertyFieldsAndNotes.Designer.cs` — migration designer
- `GurkanApi.Tests/IntegrationTests/PropertyTests.cs` — 12 integration tests for S02
- `GurkanApi.Tests/IntegrationTests/TestFixture.cs` — added PropertyNotes to TRUNCATE
