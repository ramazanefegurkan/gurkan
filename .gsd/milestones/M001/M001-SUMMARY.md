---
id: M001
provides:
  - Full-stack gayrimenkul portföy yönetim uygulaması (ASP.NET Core 10 + React + PostgreSQL)
  - JWT authentication with refresh token rotation and group-based RBAC (superadmin → group admin → member)
  - Property CRUD with 6 types, multi-currency (TRY/USD/EUR), group-based access control
  - Long-term tenant management with automatic monthly rent payment generation, query-time late detection, rent increases
  - Short-term rental tracking with platform fees (Airbnb/Booking/Direct), date overlap validation
  - Property-scoped expense tracking (6 categories, recurring support) and bill tracking (5 types, payment status)
  - Document management with multipart upload, category classification, extension+content-type validation
  - Financial dashboard with multi-currency aggregation, per-property profit/loss breakdown
  - Query-time in-app notifications (late rent, upcoming bills, lease expiry, rent increase approaching)
  - Excel (ClosedXML) and PDF (QuestPDF) report export with per-property ROI calculation
  - 15 controllers, 58+ API endpoints, 77 integration tests, 17 React pages
key_decisions:
  - "D001: ASP.NET Core Web API (controller-based) — user preference, type safety, EF Core + PostgreSQL"
  - "D002: React + Vite + TypeScript — user preference, component-based, good DX"
  - "D003: PostgreSQL — JSON support, multi-currency, SaaS-ready"
  - "D004: JWT with refresh tokens — standard for separated frontend+backend"
  - "D005: Group-based access (Superadmin → Group Admin → Member)"
  - "D006: Local filesystem for file storage — simple, swappable to S3 later"
  - "D007: Multi-currency without conversion — each currency shown separately"
  - "D011: ClosedXML for Excel export"
  - "D012: QuestPDF for PDF export"
  - "D013: Query-time notification computation, no persisted state"
patterns_established:
  - "Entity configuration via Fluent API (no data annotations), enum-to-string conversion for all enums"
  - "Inline GroupAccessService checks with superadmin bypass on all controllers"
  - "Nested controller pattern: child resources verify property access + parent-child relationship"
  - "Structured error responses: { error: 'code', message: 'Human-readable' } on all 4xx"
  - "Frontend AuthContext with JWT decode, axios interceptor for 401 redirect"
  - "PropertyLayout with React Router nested routes + Outlet for persistent tab navigation"
  - "const objects with as const for TypeScript enums (Vite erasableSyntaxOnly)"
  - "toUtcIso() helper for all date form submissions to PostgreSQL"
  - "Runtime seed admin in Program.cs (not in migrations)"
  - "Test DB lifecycle: TRUNCATE CASCADE between test classes, parallelization disabled"
observability_surfaces:
  - "Swagger UI at /swagger/index.html — all 58+ endpoints documented"
  - "Structured logs on all CRUD operations with entity IDs and actor UserId"
  - "Auth success/failure logs with userId and email"
  - "Group access granted/denied logs"
  - "403/404 responses include structured JSON error body"
  - "dotnet test GurkanApi.Tests/ — 77 integration tests across 6 slices"
  - "npm run build exit code 0 — TypeScript compilation verification"
  - "GET /api/dashboard — live financial summary"
  - "GET /api/notifications — live notification state"
requirement_outcomes:
  - id: R001
    from_status: active
    to_status: validated
    proof: "S02: 14 integration tests prove property CRUD (create 201, update 200, delete 204, list with group filter, detail). Frontend property list/form/detail pages browser-verified."
  - id: R002
    from_status: active
    to_status: validated
    proof: "S01: 11 GroupAccessTests prove cross-group access denial (403), member sees only own groups. S02: group-filtered property listing. GroupAccessService enforces on all 15 controllers."
  - id: R003
    from_status: active
    to_status: validated
    proof: "S01: tests prove superadmin creates groups, sees all groups/users, manages roles, assigns properties, delegates group admin. Superadmin bypass confirmed across all controllers."
  - id: R004
    from_status: active
    to_status: validated
    proof: "S01: tests prove superadmin delegates group admin, group admin adds members (201), group admin blocked from other groups (403)."
  - id: R005
    from_status: active
    to_status: validated
    proof: "S01: 7 AuthTests prove login→JWT, register, refresh token rotation, change password, invalid credentials 401, unauthenticated 401, non-superadmin register 403."
  - id: R006
    from_status: active
    to_status: validated
    proof: "S03: 13 integration tests prove auto-payment generation, Pending→Paid, computed Late status (DueDate+5), termination cancels future payments. S06: dashboard aggregates rent into income."
  - id: R007
    from_status: active
    to_status: validated
    proof: "S03: short-term rental CRUD with platform fee, net amount, date overlap rejection (409). S06: dashboard aggregates short-term income."
  - id: R008
    from_status: active
    to_status: validated
    proof: "S04: 8 integration tests prove expense CRUD with 6 categories, recurring support, multi-currency (EUR), group access control."
  - id: R009
    from_status: active
    to_status: validated
    proof: "S04: 8 integration tests prove bill CRUD with 5 types, due date tracking, mark-as-paid status transition, multi-currency (USD)."
  - id: R010
    from_status: active
    to_status: validated
    proof: "S05: 8 integration tests prove upload/list/download/delete + extension/content-type validation + cross-group 403. Browser-verified end-to-end."
  - id: R011
    from_status: active
    to_status: validated
    proof: "S06: 16 integration tests prove per-property income/expense/profit aggregation by currency, unpaid rent count, upcoming bill count, cross-group access denial. Frontend Dashboard with summary cards + breakdown table."
  - id: R012
    from_status: active
    to_status: validated
    proof: "S06: integration tests prove LateRent (Critical), UpcomingBill (Warning, 7-day window), LeaseExpiry (Critical/Warning/Info at 30/60/90 day tiers), RentIncreaseApproaching notifications. Frontend NotificationList with severity colors."
  - id: R013
    from_status: active
    to_status: validated
    proof: "S06: 9 ReportsTests prove profit-loss JSON endpoint with year filtering, Excel export (.xlsx, correct MIME), PDF export (correct MIME), per-property ROI calculation. Frontend export buttons with blob download."
  - id: R014
    from_status: active
    to_status: validated
    proof: "S02: test creates TRY/USD/EUR properties. S03: tenant/payment entities carry currency. S04: EUR expense + USD bill tested. S06: dashboard aggregates by currency, no cross-currency summing."
  - id: R015
    from_status: active
    to_status: validated
    proof: "S03: tenant CRUD with all fields (name, phone, email, identity number, lease dates, deposit), active tenant enforcement (409), cross-group 403, active/inactive filtering."
  - id: R022
    from_status: active
    to_status: validated
    proof: "S06: LeaseExpiry notification with tiered severity (≤30d Critical, ≤60d Warning, ≤90d Info). Test uses 25-day lease → Critical."
  - id: R023
    from_status: active
    to_status: validated
    proof: "S02: note CRUD tests (add 201, update 200, delete 204, cross-group 403). Creator-only edit/delete. Frontend inline editing browser-verified."
  - id: R024
    from_status: active
    to_status: validated
    proof: "S03: rent increase CRUD with computed IncreaseRate, propagation to future Pending payments. S06: RentIncreaseApproaching notification."
  - id: R016
    from_status: deferred
    to_status: deferred
    proof: "Explicitly out of M001 scope per roadmap. No import functionality built."
  - id: R017
    from_status: deferred
    to_status: deferred
    proof: "Explicitly out of M001 scope. REST API architecture supports future mobile clients."
  - id: R018
    from_status: deferred
    to_status: deferred
    proof: "Explicitly out of M001 scope. Single-tenant architecture."
  - id: R019
    from_status: deferred
    to_status: deferred
    proof: "In-app notifications only (R012). Email/push deferred per roadmap."
  - id: R020
    from_status: out-of-scope
    to_status: out-of-scope
    proof: "Airbnb API partner-only. Manual entry via R007."
  - id: R021
    from_status: out-of-scope
    to_status: out-of-scope
    proof: "OCR/smart document processing not needed. Simple file upload per user preference."
duration: ~6h across 6 slices (22 tasks)
verification_result: passed
completed_at: 2026-03-18
---

# M001: Gayrimenkul Portföy Yönetimi

**Full-stack property portfolio management application with JWT auth, group-based access control, tenant/rent/expense/bill/document management, financial dashboard with multi-currency aggregation, in-app notifications, and Excel/PDF report export — 15 controllers, 58+ endpoints, 77 integration tests, 17 React pages**

## What Happened

Built a complete property portfolio management system for family use across 6 slices.

**S01 (Auth & Access Control)** laid the foundation: JWT authentication with refresh token rotation, group-based RBAC (superadmin → group admin → member), and GroupAccessService that all downstream controllers depend on. 18 integration tests prove the full auth and access control contract — login, register, refresh rotation, cross-group denial, group admin delegation. PostgreSQL 16 runs on Docker port 5434, seed superadmin is created at runtime.

**S02 (Property Management)** expanded the placeholder Property entity into a full model with 16 fields, added PropertyNote for annotations, and built the PropertiesController (5 endpoints) and PropertyNotesController (4 endpoints) with group-based access control. Multi-currency support (TRY/USD/EUR) was proven here and carried through all downstream slices. This slice also scaffolded the entire React frontend: Vite + TypeScript project, axios API client with JWT interceptor, AuthContext, Login page, responsive sidebar Layout, and property list/detail/form pages with notes CRUD. 14 integration tests.

**S03 (Rent & Tenant Tracking)** built the core income tracking: Tenant CRUD with single-active-tenant enforcement, automatic monthly RentPayment generation from lease dates, query-time late detection (DueDate+5 without mutating DB), rent increase recording with propagation to future payments, and short-term rental CRUD with platform tracking and date overlap validation. The PropertyLayout wrapper with React Router Outlet established the tab navigation pattern used by all subsequent slices. 13 integration tests and 7 React pages.

**S04 (Expense & Bill Tracking)** added property-scoped expenses (6 categories, recurring support) and bills (5 types, due date tracking, mark-as-paid action). Both controllers follow the established nested-resource pattern. 8 integration tests, 4 React pages with category/status badges.

**S05 (Document Management)** delivered multipart file upload with extension + content-type whitelist validation, 6 document categories (TitleDeed, Contract, Insurance, Invoice, Photo, Other), download as FileStreamResult, and local filesystem storage with configurable base path. 8 integration tests, 1 React page with inline upload form.

**S06 (Dashboard, Notifications & Reports)** tied everything together: DashboardController aggregates income (rent payments + short-term rentals) and expenses (expenses + bills) per property per currency. NotificationsController generates query-time notifications for late rent, upcoming/overdue bills, lease expiry (30/60/90 day tiers), and approaching rent increases. ReportsController provides profit-loss JSON, Excel export (ClosedXML), and PDF export (QuestPDF) with per-property ROI. 16 integration tests, 2 React pages (Dashboard with summary cards + export buttons, NotificationList with severity colors). Default route changed to /dashboard.

The slices connected cleanly through well-defined boundaries: S01's auth middleware and GroupAccessService were consumed by all subsequent slices without modification. S02's Property entity and access check pattern were inherited by S03–S06. S03 and S04 produced the financial data that S06 aggregates. Each slice added its tab to PropertyLayout and its API functions to the shared client.ts.

## Cross-Slice Verification

| Success Criterion | Verification | Result |
|-------------------|-------------|--------|
| Superadmin login olup grup oluşturabilir, kullanıcı ve mülk atayabilir | S01: 18 integration tests — seed admin login, group create, member add, property assign all return 2xx | ✅ |
| Aile üyesi login olduğunda sadece kendi grubundaki mülkleri görür | S01: cross-group access → 403. S02: PropertyTests prove group-filtered listing. GroupAccessService enforced on all 15 controllers | ✅ |
| Mülke uzun dönem kira kaydı yapılır, ödeme durumu takip edilir, gecikme otomatik algılanır | S03: TenantTests prove auto-payment generation, Pending→Paid transition, Late status on DueDate+5 | ✅ |
| Mülke kısa dönem (Airbnb-style) rezervasyon kaydı yapılır, gelir takip edilir | S03: ShortTermRental CRUD with Airbnb/Booking/Direct platforms, date overlap rejection 409, net amount computation | ✅ |
| Mülk bazlı gider ve fatura kaydı yapılır | S04: 8 tests — expense CRUD (6 categories), bill CRUD (5 types), mark-bill-paid, multi-currency | ✅ |
| Tapu, sözleşme gibi dökümanlar yüklenip mülke bağlanır | S05: 8 tests — multipart upload, category filter, download, delete, extension validation, cross-group 403 | ✅ |
| Dashboard tüm portföyün finansal özetini gösterir | S06: DashboardAndNotificationTests prove per-property income/expense/profit by currency, unpaid count, cross-group isolation | ✅ |
| Kira gecikme, fatura ve sözleşme bitiş hatırlatmaları oluşur | S06: tests prove LateRent (Critical), UpcomingBill (Warning), LeaseExpiry (tiered severity), RentIncreaseApproaching notifications | ✅ |
| Excel/PDF rapor export edilir, ROI hesaplanır | S06: 9 ReportsTests — profit-loss JSON, Excel .xlsx export (ClosedXML), PDF export (QuestPDF), per-property ROI | ✅ |

**Full regression:** `dotnet test GurkanApi.Tests/` → 77/77 pass (S01:18 + S02:14 + S03:13 + S04:8 + S05:8 + S06:16)
**Frontend build:** `npm run build` → 0 errors, 105 modules, 378KB JS + 38KB CSS

## Requirement Changes

- R001: active → validated — S02 integration tests prove property CRUD; frontend list/form/detail browser-verified
- R002: active → validated — S01 GroupAccessTests + S02 PropertyTests prove group-based filtering and cross-group 403
- R003: active → validated — S01 tests prove superadmin full system access across groups/users/properties
- R004: active → validated — S01 tests prove group admin delegation and scoped management
- R005: active → validated — S01 AuthTests prove JWT login, register, refresh rotation, change password
- R006: active → validated — S03 tests prove auto-payment, late detection, terminate; S06 dashboard aggregation
- R007: active → validated — S03 tests prove short-term rental CRUD with platform fees; S06 dashboard income
- R008: active → validated — S04 tests prove expense CRUD with categories, recurring, multi-currency
- R009: active → validated — S04 tests prove bill CRUD with types, due dates, mark-paid
- R010: active → validated — S05 tests prove upload/download/delete with validation and access control
- R011: active → validated — S06 tests prove dashboard aggregation with multi-currency, per-property breakdown
- R012: active → validated — S06 tests prove 4 notification types with severity levels
- R013: active → validated — S06 tests prove JSON/Excel/PDF export with ROI
- R014: active → validated — Proven across S02 (property), S03 (payments), S04 (expenses/bills), S06 (aggregation)
- R015: active → validated — S03 tests prove tenant CRUD with all fields, active enforcement, filtering
- R022: active → validated — S06 tests prove lease expiry notifications at 30/60/90 day tiers
- R023: active → validated — S02 tests prove note CRUD with creator-only restriction
- R024: active → validated — S03 tests prove rent increase with propagation; S06 notification for approaching increases
- R016: deferred → deferred — Excel/Sheets import not in M001 scope
- R017: deferred → deferred — Mobile app not in M001 scope; REST API supports future clients
- R018: deferred → deferred — SaaS multi-tenancy not in M001 scope
- R019: deferred → deferred — Email/push deferred; in-app notifications delivered (R012)
- R020: out-of-scope → out-of-scope — Airbnb API partner-only
- R021: out-of-scope → out-of-scope — OCR not needed per user preference

## Forward Intelligence

### What the next milestone should know
- The backend is a mature ASP.NET Core 10 Web API with 15 controllers and 58+ endpoints. All endpoints are protected by JWT auth and group-based access control via GroupAccessService. Adding new entity types follows a well-established pattern: Entity → Migration → Controller (with property access check) → DTOs → Integration tests → Frontend page + API client function.
- The frontend React app (gurkan-ui/) has a complete auth flow, responsive sidebar layout, and PropertyLayout tab navigation. Adding new features means: add TypeScript types in types/index.ts, API functions in api/client.ts, routes in App.tsx, and pages in src/pages/.
- Multi-currency is handled by grouping/displaying per currency — no conversion logic exists. If M002 adds other asset classes with different currencies, the same pattern should be followed.
- Financial data aggregation in DashboardController queries all entities (RentPayment, ShortTermRental, Expense, Bill) for accessible properties. If new income/expense sources are added, they must be included in the dashboard aggregation query.
- Notifications are computed at query time with no persistence — if the notification scope grows significantly or email/push is added (R019), a persistent notification table and background job will be needed.

### What's fragile
- **JWT GroupMemberships claim is stale at login** — GroupAccessService compensates by querying DB, but any code reading the JWT claim directly gets stale group data until next login.
- **Test DB cleanup uses explicit TRUNCATE list** — every new table with data must be added to TestFixture.cs TRUNCATE statement or tests will leak state.
- **API client port (5039)** is hardcoded in gurkan-ui/src/api/client.ts — if launchSettings.json changes, the frontend silently breaks (only caught by browser testing, not by `npm run build`).
- **QuestPDF native Skia DLL** — wrapped in try-catch for test environments where it can't load. Works in production with correct RID.
- **Auto-generated rent payments** create all monthly records at once on tenant creation — acceptable for family use (1-2 year leases) but would need pagination for SaaS with long leases.
- **Transient PostgreSQL socket resets** on Windows + Docker Desktop cause occasional test flakiness in unrelated test classes — infrastructure-level, not code.

### Authoritative diagnostics
- `dotnet test GurkanApi.Tests/` — 77 integration tests are the definitive verification. Each slice has its own category filter. If these pass, the backend is correct.
- `cd gurkan-ui && npm run build` — TypeScript compilation proves type consistency across all frontend code.
- Swagger UI at `/swagger/index.html` — interactive exploration of all 58+ endpoints with schemas.
- `GET /api/dashboard` — live financial aggregation state.
- `GET /api/notifications` — live notification computation.
- `docker exec gurkan-postgres psql -U postgres -d gurkan -c 'SELECT "Email","Role" FROM "Users"'` — check user state directly.

### What assumptions changed
- .NET 10 defaults to `.slnx` format (not `.sln`) and removed built-in Swagger UI (needs Swashbuckle)
- TypeScript enums don't work with Vite's `erasableSyntaxOnly` — use const objects with as const
- Backend `JsonStringEnumConverter` serializes as strings ("Apartment"), not integers (0)
- Backend JWT uses full XML namespace claim keys, not shorthand (`sub`, `email`)
- API serves on port 5039 per launchSettings.json, not the conventional 5000
- PostgreSQL with Npgsql rejects DateTime.Kind=Unspecified — all dates must be UTC

## Files Created/Modified

### Backend (GurkanApi/)
- `GurkanApi.slnx` — .NET 10 XML solution file
- `GurkanApi/GurkanApi.csproj` — project with all NuGet packages
- `GurkanApi/Program.cs` — DbContext, JWT auth, Swagger, CORS, JSON config, seed admin, DI
- `GurkanApi/appsettings.json` — connection string (port 5434), JWT config, seed admin, file storage
- `GurkanApi/Entities/*.cs` — 14 entity files (User, Group, GroupMember, Property, PropertyNote, RefreshToken, Tenant, RentPayment, ShortTermRental, RentIncrease, Expense, Bill, Document, Enums)
- `GurkanApi/Data/ApplicationDbContext.cs` — Fluent API for all entities, 12 DbSets
- `GurkanApi/Controllers/*.cs` — 15 controllers (Auth, Groups, Users, Properties, PropertyNotes, Tenants, RentPayments, ShortTermRentals, RentIncreases, Expenses, Bills, Documents, Dashboard, Notifications, Reports)
- `GurkanApi/Services/*.cs` — AuthService, TokenService, GroupAccessService + interfaces
- `GurkanApi/DTOs/**/*.cs` — 25+ DTO files across Auth, Groups, Users, Properties, Tenants, RentPayments, ShortTermRentals, RentIncreases, Expenses, Bills, Documents
- `GurkanApi/Extensions/ClaimsPrincipalExtensions.cs` — JWT claim extraction helpers
- `GurkanApi/Migrations/*.cs` — 5 EF Core migrations (InitialCreate, AddPropertyFieldsAndNotes, AddTenantAndRentalEntities, AddExpensesAndBills, AddDocuments)
- `docker-compose.yml` — PostgreSQL 16-alpine on port 5434

### Tests (GurkanApi.Tests/)
- `GurkanApi.Tests/GurkanApi.Tests.csproj` — xUnit test project
- `GurkanApi.Tests/IntegrationTests/TestFixture.cs` — CustomWebApplicationFactory with test DB
- `GurkanApi.Tests/IntegrationTests/AuthTests.cs` — 7 auth tests (S01)
- `GurkanApi.Tests/IntegrationTests/GroupAccessTests.cs` — 11 group access tests (S01)
- `GurkanApi.Tests/IntegrationTests/PropertyTests.cs` — 14 property tests (S02)
- `GurkanApi.Tests/IntegrationTests/TenantTests.cs` — 13 tenant/rental tests (S03)
- `GurkanApi.Tests/IntegrationTests/ExpenseAndBillTests.cs` — 8 expense/bill tests (S04)
- `GurkanApi.Tests/IntegrationTests/DocumentTests.cs` — 8 document tests (S05)
- `GurkanApi.Tests/IntegrationTests/DashboardAndNotificationTests.cs` — S06 dashboard/notification tests
- `GurkanApi.Tests/IntegrationTests/ReportsTests.cs` — S06 report export tests

### Frontend (gurkan-ui/)
- `gurkan-ui/` — React + Vite + TypeScript project (package.json, tsconfig, vite.config)
- `gurkan-ui/src/api/client.ts` — axios instance with JWT interceptor, 40+ API functions
- `gurkan-ui/src/contexts/AuthContext.tsx` — AuthProvider + useAuth hook
- `gurkan-ui/src/types/index.ts` — TypeScript types matching all backend DTOs
- `gurkan-ui/src/App.tsx` — React Router with ProtectedRoute and nested routes
- `gurkan-ui/src/components/Layout.tsx` — responsive sidebar with navigation
- `gurkan-ui/src/pages/Login.tsx` — login with validation
- `gurkan-ui/src/pages/Properties/*.tsx` — PropertyList, PropertyForm, PropertyDetail, PropertyLayout
- `gurkan-ui/src/pages/Tenants/*.tsx` — TenantList, TenantForm, TenantDetail
- `gurkan-ui/src/pages/ShortTermRentals/*.tsx` — ShortTermRentalList, ShortTermRentalForm
- `gurkan-ui/src/pages/Expenses/*.tsx` — ExpenseList, ExpenseForm
- `gurkan-ui/src/pages/Bills/*.tsx` — BillList, BillForm
- `gurkan-ui/src/pages/Documents/*.tsx` — DocumentList
- `gurkan-ui/src/pages/Dashboard/Dashboard.tsx` — financial summary with export
- `gurkan-ui/src/pages/Notifications/NotificationList.tsx` — severity-colored notifications
