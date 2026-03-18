# S02: Mülk Yönetimi — Research

**Date:** 2026-03-18
**Depth:** Light — standard CRUD extending established S01 patterns, plus React frontend scaffold

## Summary

S02 expands the placeholder `Property` entity (currently Id, Name, GroupId) into a full property model with type, address, area, currency, rooms, etc. It adds a `PropertyNote` sub-entity for chronological notes. A `PropertiesController` provides CRUD + group-filtered listing, and a `PropertyNotesController` handles note CRUD. The access control pattern (`GroupAccessService.CanAccessPropertyAsync`) already exists and works as-is.

The one significant scope item is the **React + Vite + TypeScript frontend** — no frontend project exists yet. The roadmap explicitly requires "Frontend'de mülk listesi ve detay sayfası çalışır" by end of S02. This means scaffolding the SPA, setting up routing, auth context (JWT token management), API client, and building property list + detail pages. This is the largest piece of work in the slice.

Multi-currency (R014) is straightforward at this layer — a `Currency` enum (TRY, USD, EUR) on the Property entity. Downstream slices (S03, S04) will use this as the default currency for transactions on that property.

## Recommendation

Build backend first (entity expansion, migration, controllers, tests), then scaffold the frontend and wire up property pages. The backend is low-risk CRUD following established patterns. The frontend scaffold is the riskiest part — it's greenfield and sets patterns for all subsequent slices.

Split into: (1) Entity + migration + controller + DTOs, (2) PropertyNotes, (3) Integration tests, (4) Frontend scaffold + auth wiring, (5) Property list + detail pages. Tasks 1-2 could potentially merge since they're closely related.

## Implementation Landscape

### Key Files

**Existing — modify:**
- `GurkanApi/Entities/Property.cs` — expand from 3 fields to full model (Type, Address, City, District, Area, RoomCount, Floor, TotalFloors, BuildYear, Currency, Description, CreatedAt, UpdatedAt)
- `GurkanApi/Entities/Enums.cs` — add `PropertyType` (Apartment, House, Shop, Land, Office, Other), `Currency` (TRY, USD, EUR)
- `GurkanApi/Data/ApplicationDbContext.cs` — add `DbSet<PropertyNote>`, expand Property Fluent API config, add PropertyNote config
- `GurkanApi.Tests/IntegrationTests/TestFixture.cs` — add `"PropertyNotes"` to TRUNCATE list

**New — create:**
- `GurkanApi/Entities/PropertyNote.cs` — Id, PropertyId, Content, CreatedBy, CreatedAt
- `GurkanApi/Controllers/PropertiesController.cs` — GET (list, group-filtered), GET/{id}, POST, PUT/{id}, DELETE/{id}
- `GurkanApi/Controllers/PropertyNotesController.cs` — GET /api/properties/{id}/notes, POST, PUT/{noteId}, DELETE/{noteId}
- `GurkanApi/DTOs/Properties/CreatePropertyRequest.cs` — Name, Type, Address, City, District, Area, RoomCount, Floor, TotalFloors, BuildYear, Currency, Description, GroupId
- `GurkanApi/DTOs/Properties/UpdatePropertyRequest.cs` — all fields optional
- `GurkanApi/DTOs/Properties/PropertyResponse.cs` — all fields + GroupId + GroupName
- `GurkanApi/DTOs/Properties/PropertyListResponse.cs` — lightweight version for list endpoint
- `GurkanApi/DTOs/Properties/CreateNoteRequest.cs` — Content
- `GurkanApi/DTOs/Properties/UpdateNoteRequest.cs` — Content
- `GurkanApi/DTOs/Properties/PropertyNoteResponse.cs` — Id, Content, CreatedByName, CreatedAt
- `GurkanApi/Migrations/{timestamp}_AddPropertyFieldsAndNotes.cs` — generated via `dotnet ef migrations add`
- `GurkanApi.Tests/IntegrationTests/PropertyTests.cs` — CRUD, group filtering, access control, notes
- `gurkan-ui/` — React + Vite + TypeScript project (new)
- `gurkan-ui/src/api/client.ts` — axios/fetch wrapper with JWT interceptor
- `gurkan-ui/src/contexts/AuthContext.tsx` — JWT token storage, login/logout, refresh
- `gurkan-ui/src/pages/Properties/PropertyList.tsx` — paginated list with group filter
- `gurkan-ui/src/pages/Properties/PropertyDetail.tsx` — detail view with notes section
- `gurkan-ui/src/pages/Login.tsx` — login form

### Patterns to Follow

- **Controller pattern**: Copy `GroupsController` structure — constructor injection of `ApplicationDbContext`, `IGroupAccessService`, `ILogger<T>`. Use `User.GetUserId()`, `User.GetRole()`, `User.IsSuperAdmin()` from `ClaimsPrincipalExtensions`.
- **Access control**: Superadmin bypass first, then `_access.CanAccessPropertyAsync(userId, propertyId, role)` for single-property operations. For list endpoint: `_access.GetUserGroupIdsAsync(userId)` to filter query (same as `GroupsController.GetAll`).
- **Entity config**: Fluent API in `OnModelCreating`, enum-to-string conversion (`.HasConversion<string>()`), max lengths on all strings.
- **Error responses**: `{ error: "error_code", message: "Human-readable" }` on all 4xx.
- **Logging**: `"Property {action}: PropertyId={PropertyId}, By={UserId}"` pattern.
- **Test pattern**: `[Trait("Category", "S02")]`, `IClassFixture<CustomWebApplicationFactory>`, `IAsyncLifetime` with `ResetDatabaseAsync()` in `InitializeAsync`.

### Build Order

1. **Property entity expansion + PropertyNote entity + migration** — unblocks everything else. The DB schema change is the foundation.
2. **PropertiesController + PropertyNotesController + DTOs** — CRUD endpoints following GroupsController patterns. Include group-filtered listing.
3. **Integration tests** — prove CRUD works, group filtering enforces access control, notes attach to properties correctly. This retires the backend risk.
4. **Frontend scaffold** — `npm create vite@latest gurkan-ui -- --template react-ts`, install dependencies (react-router-dom, axios or similar), set up project structure (pages/, components/, api/, contexts/).
5. **Auth context + API client + login page** — JWT token management, login flow, protected routes. This is the frontend foundation.
6. **Property list + detail pages** — wire up to API, display properties, notes section on detail page.

Tasks 1-2 are tightly coupled and could be one task. Tasks 4-5 are the frontend foundation. Task 6 is the property UI.

### Verification Approach

**Backend:**
- `dotnet test GurkanApi.Tests/ --filter "Category=S02"` — integration tests covering:
  - Superadmin creates property → 201
  - Group admin creates property in own group → 201
  - Member lists properties → sees only own group's properties
  - Member cannot access other group's property → 403
  - Property CRUD (update, delete)
  - Property notes CRUD
  - Multi-currency: create properties with TRY, USD, EUR → all return correct currency
- Manual: `curl` or Swagger UI against running API to verify endpoints

**Frontend:**
- `npm run build` succeeds (TypeScript compilation)
- Browser: navigate to localhost:5173, login with admin@gurkan.com / Admin123!, see property list, create a property, view detail with notes

## Constraints

- Property entity already exists in the InitialCreate migration with 3 columns. The new migration must ALTER TABLE (add columns), not drop and recreate. EF Core handles this correctly via `dotnet ef migrations add`.
- `TestFixture.cs` TRUNCATE list must include `"PropertyNotes"` — otherwise test DB cleanup will fail on FK constraints.
- Frontend CORS is already configured in Program.cs (`AllowAnyOrigin`) — no backend changes needed for dev.
- GroupId on Property is nullable (SetNull on group delete). New properties should require GroupId in the create request since unassigned properties are meaningless in the access model.

## Common Pitfalls

- **Stale JWT GroupMemberships claim** — don't read group membership from JWT claims for access checks. Always use `GroupAccessService` which queries DB. S01 summary explicitly flags this.
- **Migration ordering** — run `dotnet ef migrations add` from the GurkanApi project directory, not the solution root. The EF tools need to find the DbContext.
- **PropertyNote CreatedBy** — store as `Guid` (UserId), resolve to name at query time via Include/Join. Don't denormalize the name into the note entity.
