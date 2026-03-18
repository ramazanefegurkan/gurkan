# S02: Mülk Yönetimi

**Goal:** Property CRUD with group-based access control, multi-currency support, property notes, and a React frontend showing property list and detail pages.
**Demo:** Superadmin creates properties (TRY/USD/EUR) assigned to groups. Group member logs in, sees only their group's properties. Property detail page shows notes. Member cannot access another group's property (403).

## Must-Haves

- Property entity expanded with type, address, city, district, area, rooms, floor, build year, currency, description
- PropertyType enum (Apartment, House, Shop, Land, Office, Other) and Currency enum (TRY, USD, EUR)
- PropertyNote entity (Id, PropertyId, Content, CreatedBy, CreatedAt)
- PropertiesController: GET (group-filtered list), GET/{id}, POST, PUT/{id}, DELETE/{id}
- PropertyNotesController: GET, POST, PUT/{noteId}, DELETE/{noteId} under /api/properties/{id}/notes
- Group-based access control on all property endpoints (superadmin bypass, then group membership check)
- Integration tests proving CRUD, group filtering, access denial (403), multi-currency, notes
- React + Vite + TypeScript frontend with JWT auth context, login page, protected routes
- Property list page (group-filtered) and property detail page with notes section

## Proof Level

- This slice proves: integration (backend API + frontend wiring)
- Real runtime required: yes (frontend against running API)
- Human/UAT required: no (integration tests + build verify)

## Verification

- `dotnet test GurkanApi.Tests/ --filter "Category=S02"` — integration tests covering property CRUD, group filtering, access control, notes, multi-currency
- `cd gurkan-ui && npm run build` — TypeScript compiles without errors
- Browser: navigate to `http://localhost:5173`, login as admin@gurkan.com / Admin123!, see property list, create property, view detail with notes

## Observability / Diagnostics

- Runtime signals: `"Property {action}: PropertyId={PropertyId}, By={UserId}"` structured logs on all CRUD operations; `"PropertyNote {action}: NoteId={NoteId}, PropertyId={PropertyId}, By={UserId}"` for notes
- Inspection surfaces: Swagger UI at `/swagger/index.html` for API exploration; `GET /api/properties` (authenticated) for property state; DB query `SELECT "Id","Name","Currency","GroupId" FROM "Properties"`
- Failure visibility: 403 with `{ error: "forbidden" }` on access denial; 404 with `{ error: "not_found" }` on missing property/note; structured error responses on all 4xx
- Redaction constraints: none (no secrets in property data)

## Integration Closure

- Upstream surfaces consumed: JWT auth middleware (Program.cs), GroupAccessService (IGroupAccessService), ClaimsPrincipalExtensions (GetUserId, GetRole, IsSuperAdmin), ApplicationDbContext, existing Property entity placeholder
- New wiring introduced in this slice: PropertiesController + PropertyNotesController registered via [ApiController]; PropertyNote DbSet added to ApplicationDbContext; React SPA project (gurkan-ui/) with API client wired to backend at localhost:5000
- What remains before the milestone is truly usable end-to-end: S03 (rent tracking), S04 (expenses/bills), S05 (documents), S06 (dashboard/reports)

## Tasks

- [x] **T01: Expand Property entity, add PropertyNote, create controllers and DTOs** `est:45m`
  - Why: Builds the complete property management backend — entity expansion, new PropertyNote entity, Currency/PropertyType enums, EF migration, PropertiesController (5 endpoints) and PropertyNotesController (4 endpoints) with full group-based access control. This is the foundation all downstream slices depend on.
  - Files: `GurkanApi/Entities/Property.cs`, `GurkanApi/Entities/PropertyNote.cs`, `GurkanApi/Entities/Enums.cs`, `GurkanApi/Data/ApplicationDbContext.cs`, `GurkanApi/Controllers/PropertiesController.cs`, `GurkanApi/Controllers/PropertyNotesController.cs`, `GurkanApi/DTOs/Properties/*.cs` (6 DTO files), migration file
  - Do: Expand Property entity with Type, Address, City, District, Area, RoomCount, Floor, TotalFloors, BuildYear, Currency, Description, CreatedAt, UpdatedAt. Add PropertyType and Currency enums to Enums.cs. Create PropertyNote entity. Add DbSet<PropertyNote> and Fluent API config for both expanded Property and PropertyNote in ApplicationDbContext. Run `dotnet ef migrations add AddPropertyFieldsAndNotes`. Build PropertiesController (GET list with group filtering, GET/{id}, POST, PUT/{id}, DELETE/{id}) and PropertyNotesController (GET, POST, PUT/{noteId}, DELETE/{noteId}) following GroupsController patterns. Create all DTO classes. Ensure `dotnet build` passes.
  - Verify: `dotnet build GurkanApi/` succeeds; Swagger UI shows new endpoints
  - Done when: Both controllers compile, migration is generated, all 9 new endpoints are registered

- [ ] **T02: Integration tests for property and notes API** `est:30m`
  - Why: Proves the backend contract — CRUD works, group filtering enforces access control, multi-currency persists correctly, notes attach to properties. This is the objective verification that S02 backend is correct before building the frontend.
  - Files: `GurkanApi.Tests/IntegrationTests/PropertyTests.cs`, `GurkanApi.Tests/IntegrationTests/TestFixture.cs`
  - Do: Add `"PropertyNotes"` to TRUNCATE list in TestFixture.cs (before "Properties" for FK ordering). Create PropertyTests.cs with `[Trait("Category", "S02")]` covering: superadmin creates property → 201; group admin creates property in own group → 201; member lists properties → sees only own group; member cannot access other group's property → 403; property update → 200; property delete → 204; create properties with TRY/USD/EUR → correct currency in response; note CRUD on a property; member cannot add note to other group's property → 403. Follow existing test patterns from AuthTests.cs and GroupAccessTests.cs (IClassFixture<CustomWebApplicationFactory>, IAsyncLifetime, LoginAsAsync, ApiJsonOptions).
  - Verify: `dotnet test GurkanApi.Tests/ --filter "Category=S02"` — all tests pass
  - Done when: All S02 integration tests pass with 0 failures

- [ ] **T03: Scaffold React frontend with auth context, API client, and login page** `est:40m`
  - Why: No frontend exists yet. This creates the React + Vite + TypeScript project, sets up JWT auth context (token storage, login/logout, refresh), an API client with auth interceptor, routing with protected routes, and a functional login page. This is the frontend foundation all subsequent slices build on.
  - Files: `gurkan-ui/package.json`, `gurkan-ui/vite.config.ts`, `gurkan-ui/tsconfig.json`, `gurkan-ui/src/main.tsx`, `gurkan-ui/src/App.tsx`, `gurkan-ui/src/api/client.ts`, `gurkan-ui/src/contexts/AuthContext.tsx`, `gurkan-ui/src/pages/Login.tsx`, `gurkan-ui/src/components/Layout.tsx`, `gurkan-ui/src/types/index.ts`
  - Do: Run `npm create vite@latest gurkan-ui -- --template react-ts`. Install react-router-dom and axios. Create API client (`src/api/client.ts`) with axios instance pointing at `http://localhost:5000/api`, JWT interceptor that reads token from localStorage, and 401 response interceptor that clears auth. Create AuthContext (`src/contexts/AuthContext.tsx`) with login/logout/refresh, token persistence in localStorage, user state. Create Login page with email+password form. Create Layout component with nav header and logout button. Set up React Router in App.tsx with public route (/login) and protected routes (/ redirects to /properties). Relevant skill for executors: `~/.gsd/agent/skills/frontend-design/SKILL.md` — load for UI design guidance.
  - Verify: `cd gurkan-ui && npm run build` succeeds; `npm run dev` serves at localhost:5173; login form renders
  - Done when: TypeScript compiles, login page renders, successful login redirects to a placeholder properties route

- [ ] **T04: Build property list and detail pages with notes** `est:40m`
  - Why: Completes the slice demo — users see their group's properties in a list, can create/edit properties, and view property details with notes. This is the user-facing payoff that proves frontend-backend integration works end-to-end.
  - Files: `gurkan-ui/src/pages/Properties/PropertyList.tsx`, `gurkan-ui/src/pages/Properties/PropertyDetail.tsx`, `gurkan-ui/src/pages/Properties/PropertyForm.tsx`, `gurkan-ui/src/types/index.ts`, `gurkan-ui/src/App.tsx`
  - Do: Create PropertyList page that fetches GET /api/properties and displays a card/table layout with name, type, city, currency. Add "New Property" button that opens PropertyForm. Create PropertyForm component (modal or page) with fields for name, type (dropdown), address, city, district, area, rooms, floor, total floors, build year, currency (dropdown), description, groupId (dropdown — fetched from GET /api/groups). Create PropertyDetail page at /properties/:id that fetches GET /api/properties/{id} and displays all fields, plus a notes section that fetches GET /api/properties/{id}/notes. Notes section has an "add note" input and displays notes chronologically. Wire routes in App.tsx: /properties → PropertyList, /properties/new → PropertyForm, /properties/:id → PropertyDetail. Relevant skill for executors: `~/.gsd/agent/skills/frontend-design/SKILL.md` — load for UI design guidance.
  - Verify: `cd gurkan-ui && npm run build` succeeds; browser: login → see property list → create property → view detail → add note
  - Done when: Property list shows group-filtered properties, property creation works, detail page shows notes, TypeScript build passes

## Files Likely Touched

- `GurkanApi/Entities/Property.cs`
- `GurkanApi/Entities/PropertyNote.cs`
- `GurkanApi/Entities/Enums.cs`
- `GurkanApi/Data/ApplicationDbContext.cs`
- `GurkanApi/Controllers/PropertiesController.cs`
- `GurkanApi/Controllers/PropertyNotesController.cs`
- `GurkanApi/DTOs/Properties/CreatePropertyRequest.cs`
- `GurkanApi/DTOs/Properties/UpdatePropertyRequest.cs`
- `GurkanApi/DTOs/Properties/PropertyResponse.cs`
- `GurkanApi/DTOs/Properties/PropertyListResponse.cs`
- `GurkanApi/DTOs/Properties/CreateNoteRequest.cs`
- `GurkanApi/DTOs/Properties/UpdateNoteRequest.cs`
- `GurkanApi/DTOs/Properties/PropertyNoteResponse.cs`
- `GurkanApi/Migrations/*_AddPropertyFieldsAndNotes.cs`
- `GurkanApi.Tests/IntegrationTests/PropertyTests.cs`
- `GurkanApi.Tests/IntegrationTests/TestFixture.cs`
- `gurkan-ui/` (entire new React project)
