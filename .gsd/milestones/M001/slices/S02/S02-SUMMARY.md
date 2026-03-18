---
id: S02
parent: M001
milestone: M001
provides:
  - Property entity with 16 fields (Type, Address, City, District, Area, RoomCount, Floor, TotalFloors, BuildYear, Currency, Description, CreatedAt, UpdatedAt + existing Id, Name, GroupId)
  - PropertyNote entity with FK to Property (cascade) and User (restrict)
  - PropertyType enum (Apartment, House, Shop, Land, Office, Other) and Currency enum (TRY, USD, EUR)
  - PropertiesController with 5 CRUD endpoints and group-based access control
  - PropertyNotesController with 4 endpoints nested under /api/properties/{id}/notes
  - 7 DTO classes for request/response mapping
  - EF Core migration (ALTER TABLE + CREATE TABLE PropertyNotes)
  - 14 integration tests covering property CRUD, group filtering, access control, multi-currency, notes
  - React + Vite + TypeScript frontend project (gurkan-ui/) with JWT auth, routing, API client
  - Login page with form validation and error handling
  - Layout component with responsive sidebar navigation
  - PropertyList page with card grid and group-filtered data
  - PropertyForm page (create + edit dual mode) with all property fields
  - PropertyDetail page with structured field layout and full notes CRUD
requires:
  - slice: S01
    provides: JWT auth middleware, GroupAccessService (IGroupAccessService), ClaimsPrincipalExtensions, ApplicationDbContext with User/Group/GroupMember entities, seed admin user
affects:
  - S03
  - S04
  - S05
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
  - gurkan-ui/src/api/client.ts
  - gurkan-ui/src/contexts/AuthContext.tsx
  - gurkan-ui/src/pages/Login.tsx
  - gurkan-ui/src/pages/Properties/PropertyList.tsx
  - gurkan-ui/src/pages/Properties/PropertyForm.tsx
  - gurkan-ui/src/pages/Properties/PropertyDetail.tsx
  - gurkan-ui/src/types/index.ts
  - gurkan-ui/src/App.tsx
key_decisions:
  - Property.GroupId kept as Guid? (nullable) to preserve SetNull cascade on group delete, while CreatePropertyRequest.GroupId is required Guid — unassigned properties exist only as result of group deletion
  - Used const objects with as const instead of TypeScript enums because Vite's erasableSyntaxOnly tsconfig forbids enum declarations
  - JWT decode uses full XML namespace claim keys from ASP.NET Core ClaimTypes — not shorthand sub/email
  - Frontend enum values use strings matching backend JsonStringEnumConverter output ("Apartment", "TRY"), not numeric ordinals
  - Note update/delete restricted to creator or superadmin, not any group member
  - Design system uses warm terracotta accent (#c4653a), DM Sans body font, Playfair Display serif headings
patterns_established:
  - PropertiesController follows GroupsController pattern: constructor DI of DbContext + IGroupAccessService + ILogger, superadmin bypass then group membership check, structured {error, message} responses
  - PropertyNotesController uses nested route api/properties/{propertyId}/notes and verifies property access before any note operation
  - Frontend AuthContext pattern: createContext + useAuth hook, login/logout with useNavigate, localStorage token persistence, JWT payload decode
  - Frontend API client: single axios instance with request interceptor (attach token) and response interceptor (401 → clear + redirect)
  - ProtectedRoute component wrapping Layout with Outlet for nested authenticated routes
  - Frontend design tokens in CSS custom properties on :root — all colors, fonts, radii via var()
  - Property pages share Properties.css with reusable .btn, .badge, .form-*, .detail-*, .note-* classes
  - useEffect cleanup with cancelled flag pattern prevents state updates on unmounted components
observability_surfaces:
  - "Property {action}: PropertyId={PropertyId}, By={UserId}" structured logs on all CRUD operations
  - "PropertyNote {action}: NoteId={NoteId}, PropertyId={PropertyId}, By={UserId}" on note operations
  - "Property access denied: UserId={UserId}, PropertyId={PropertyId}" on 403
  - 403 responses include { error: "forbidden", message: "..." } JSON body
  - 404 responses include { error: "not_found", message: "..." } JSON body
  - Swagger UI at /swagger/index.html shows all 9 new endpoints
  - localStorage keys accessToken/refreshToken/expiresAt reflect auth session state
  - npm run build exit code 0 verifies TypeScript compilation
drill_down_paths:
  - .gsd/milestones/M001/slices/S02/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S02/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001/slices/S02/tasks/T03-SUMMARY.md
  - .gsd/milestones/M001/slices/S02/tasks/T04-SUMMARY.md
duration: ~100m across 4 tasks
verification_result: passed
completed_at: 2026-03-18
---

# S02: Mülk Yönetimi

**Property CRUD backend with group-based access control, multi-currency support, property notes, 14 integration tests, and a complete React frontend with auth, property list/detail/form pages, and notes CRUD.**

## What Happened

T01 expanded the placeholder Property entity (was just Id, Name, GroupId) into a full model with 13 new fields — PropertyType enum, address fields (city, district), physical metadata (area, rooms, floor), Currency enum (TRY/USD/EUR), and timestamps. Created PropertyNote entity with cascade delete on property, restrict on user. Built PropertiesController (5 endpoints: list with group filtering, detail, create, update, delete) and PropertyNotesController (4 endpoints: list, create, update, delete — nested under /api/properties/{id}/notes). All endpoints enforce group-based access control with superadmin bypass. Generated EF Core migration that ALTERs the existing Properties table without data loss.

T02 wrote 14 integration tests covering the full property contract: superadmin and member CRUD, cross-group access denial (403), group-filtered listing, partial update with UpdatedAt, delete with 404 confirmation, three-currency creation (TRY/USD/EUR), and complete note lifecycle including cross-group note denial.

T03 scaffolded the entire React frontend from scratch — Vite + TypeScript project, axios API client with JWT interceptor and 401 redirect, AuthContext with token decode using ASP.NET Core's full namespace claim keys, Login page with validation and error handling, Layout with responsive sidebar, and React Router with ProtectedRoute guards. Design system uses a warm terracotta palette distinct from generic UI frameworks.

T04 built the property pages: PropertyList with responsive card grid, PropertyForm (dual-mode create/edit) with dropdowns for type/currency/group, and PropertyDetail with structured field layout and full notes CRUD (add, inline edit, delete). During browser testing, discovered that backend's JsonStringEnumConverter serializes enums as strings ("Apartment", "TRY") — fixed the T03-created TypeScript types from numeric values to matching strings.

## Verification

- `dotnet test GurkanApi.Tests/ --filter "Category=S02"` — 14/14 tests passed
- `cd gurkan-ui && npm run build` — TypeScript compiles, Vite bundles (296KB JS, 17.9KB CSS)
- Browser verification: login → property list → create property → view detail → add/edit/delete note — all flows working
- S01 regression: all 18 S01 tests still passing

## Requirements Advanced

- R001 — Property CRUD fully implemented: add, edit, delete, detail view. Properties assigned to groups via required GroupId. 6 property types, address/area/floor metadata.
- R002 — Group-based access control enforced on all property endpoints. Users see only their group's properties. Superadmin bypasses group filter. Proven by 14 integration tests including cross-group 403 denial.
- R014 — Multi-currency support implemented: TRY, USD, EUR selectable per property. Currency persists correctly through create/read/update cycle. Proven by integration test creating properties with all three currencies.
- R023 — Property notes system complete: chronological timestamped notes with author tracking, CRUD operations, creator-only edit/delete enforcement.

## Requirements Validated

- R001 — Full CRUD proven by integration tests (create 201, update 200, delete 204, list, detail) plus browser verification of frontend forms
- R014 — Multi-currency proven by integration test `CreatePropertyWithDifferentCurrencies_ReturnsCorrectCurrency` creating TRY/USD/EUR properties and verifying correct currency in response
- R023 — Notes proven by integration tests (add 201, update 200, delete 204, list, cross-group denial 403) plus browser verification of inline note editing

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

- Integration tests were written in T01 instead of T02 as planned — T01 author completed them alongside the controller code since patterns were straightforward. T02 then added additional edge-case tests, bringing the total from 12 to 14.
- TypeScript enum values had to be changed from numeric (0, 1, 2) to string ("Apartment", "TRY") in T04 after discovering the backend's JsonStringEnumConverter behavior during browser testing. This was a T03 bug.

## Known Limitations

- No token refresh mechanism — when the 15-minute access token expires, the 401 interceptor redirects to login rather than attempting refresh via the refresh token endpoint.
- UserInfo.fullName is always null because the backend JWT doesn't include a FullName claim. The sidebar shows email and role instead.
- Property group assignment is immutable after creation (GroupId dropdown hidden in edit form). Moving a property between groups would require delete + recreate.

## Follow-ups

- none

## Files Created/Modified

- `GurkanApi/Entities/Enums.cs` — PropertyType and Currency enums
- `GurkanApi/Entities/Property.cs` — expanded with 13 new fields
- `GurkanApi/Entities/PropertyNote.cs` — new entity with FK to Property and User
- `GurkanApi/Data/ApplicationDbContext.cs` — PropertyNotes DbSet, expanded Fluent API configs
- `GurkanApi/Controllers/PropertiesController.cs` — 5 CRUD endpoints with group access control
- `GurkanApi/Controllers/PropertyNotesController.cs` — 4 note endpoints nested under properties
- `GurkanApi/DTOs/Properties/*.cs` — 7 DTO files (CreatePropertyRequest, UpdatePropertyRequest, PropertyResponse, PropertyListResponse, CreateNoteRequest, UpdateNoteRequest, PropertyNoteResponse)
- `GurkanApi/Migrations/20260318114304_AddPropertyFieldsAndNotes.cs` — EF migration
- `GurkanApi.Tests/IntegrationTests/PropertyTests.cs` — 14 integration tests
- `GurkanApi.Tests/IntegrationTests/TestFixture.cs` — added PropertyNotes to TRUNCATE
- `gurkan-ui/` — entire new React + Vite + TypeScript project
- `gurkan-ui/src/api/client.ts` — axios instance with JWT interceptor
- `gurkan-ui/src/contexts/AuthContext.tsx` — AuthProvider + useAuth hook
- `gurkan-ui/src/pages/Login.tsx` — login page with validation
- `gurkan-ui/src/components/Layout.tsx` — sidebar layout with nav and user badge
- `gurkan-ui/src/types/index.ts` — TypeScript types matching backend DTOs
- `gurkan-ui/src/App.tsx` — React Router with ProtectedRoute
- `gurkan-ui/src/pages/Properties/PropertyList.tsx` — card grid property list
- `gurkan-ui/src/pages/Properties/PropertyForm.tsx` — dual-mode create/edit form
- `gurkan-ui/src/pages/Properties/PropertyDetail.tsx` — detail view with notes CRUD
- `gurkan-ui/src/pages/Properties/Properties.css` — shared property page styles

## Forward Intelligence

### What the next slice should know
- Property entity has Currency field (string enum: "TRY", "USD", "EUR") — downstream entities (Tenant.MonthlyRent, RentPayment, Expense, Bill) should include their own Currency field and default to the property's currency when creating records.
- PropertiesController enforces access via inline group membership check (not middleware) — downstream controllers for tenants/expenses/bills should first load the Property, check GroupId membership, then proceed. Follow the same pattern: load property → check access → operate on child entity.
- The frontend API client at `gurkan-ui/src/api/client.ts` has typed functions for all endpoints. New slices should add their API functions there and import corresponding TypeScript types from `types/index.ts`.
- React Router uses nested routes under ProtectedRoute — new pages go inside the `<Route element={<ProtectedRoute />}>` block in App.tsx.

### What's fragile
- TypeScript enum types use `as const` objects with string values matching backend JsonStringEnumConverter output exactly — if a new C# enum value is added to PropertyType or Currency, the frontend type must be updated manually or it silently won't match any label.
- JWT token decode in AuthContext reads claim keys by full XML namespace URI — any change to backend claim types breaks the decode silently (user appears logged in but with null userId/email/role).

### Authoritative diagnostics
- `dotnet test GurkanApi.Tests/ --filter "Category=S02"` — 14 tests prove the full property API contract including access control edge cases. If these pass, the backend is correct.
- `cd gurkan-ui && npm run build` — TypeScript compilation proves type consistency across all frontend code.
- Swagger UI at `/swagger/index.html` — shows all endpoints with request/response schemas for manual exploration.

### What assumptions changed
- Originally assumed TypeScript enums would work with Vite — Vite's `erasableSyntaxOnly: true` forces const objects instead (K009).
- Originally assumed backend enums serialize as integers — JsonStringEnumConverter sends strings, requiring frontend type values to be "Apartment" not 0 (K011).
