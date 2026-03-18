# S03: Kira & Kiracı Takibi

**Goal:** Uzun dönem kiracı kaydı, aylık kira ödeme takibi (otomatik oluşturma + gecikme algılama), kısa dönem rezervasyon kaydı, kira artış takibi çalışır. S06 dashboard için gerekli tüm veri altyapısı hazır.
**Demo:** Mülke kiracı eklenir → aylık ödemeler otomatik oluşur → ödeme "ödendi" işaretlenir → gecikmiş ödeme kırmızı görünür → kısa dönem rezervasyon kaydedilir → kira artışı uygulanır ve gelecek ödemeler güncellenir → sözleşme sonlandırılır ve gelecek ödemeler iptal edilir.

## Must-Haves

- Kiracı CRUD: isim, telefon, email, TC kimlik, sözleşme tarihleri, aylık kira, depozito, para birimi
- Tek aktif kiracı kuralı: bir mülkte aynı anda sadece bir aktif kiracı
- Otomatik ödeme oluşturma: kiracı kaydedildiğinde sözleşme süresi boyunca aylık ödeme kayıtları oluşur
- Ödeme durumu: Pending → Paid (kullanıcı işaretler) veya Late (DueDate + 5 gün tolerans geçince otomatik)
- Ödeme yöntemi: Cash, BankTransfer, Check
- Sözleşme sonlandırma: erken çıkışta gelecek ödemeler Cancelled olarak işaretlenir
- Kira artışı: yeni tutar kaydedilir, gelecek ödemelerin tutarları güncellenir
- Kısa dönem kiralama CRUD: giriş/çıkış, tutar, platform komisyonu, platform (Airbnb/Booking/Direct)
- Geçmiş kiracılar arşivi: IsActive=false olan kiracılar ayrı listede görünür
- Grup bazlı erişim kontrolü tüm endpoint'lerde (S02 pattern'i takip)
- Frontend: kiracı listesi/formu/detayı, ödeme tablosu, kısa dönem kiralama listesi/formu
- PropertyDetail sayfasında "Kiralar" tab'ı entegrasyonu
- Multi-currency desteği tüm parasal entity'lerde (R014)

## Proof Level

- This slice proves: contract + integration
- Real runtime required: yes (EF Core migration, API integration tests, browser verification)
- Human/UAT required: no

## Verification

- `dotnet test GurkanApi.Tests/ --filter "Category=S03"` — all S03 integration tests pass (tenant CRUD, access control, payment generation, late detection, termination, short-term rental CRUD, rent increase)
- `dotnet test GurkanApi.Tests/` — full regression (S01 + S02 tests still pass)
- `cd gurkan-ui && npm run build` — TypeScript compiles without errors
- Browser verification: create tenant → verify auto-generated payments → mark payment as paid → verify late detection on overdue payment → create short-term rental → apply rent increase → terminate lease and verify cancelled payments

## Observability / Diagnostics

- Runtime signals: structured logs on all tenant/payment/rental CRUD: `"Tenant {action}: TenantId={TenantId}, PropertyId={PropertyId}, By={UserId}"`, `"RentPayment {action}: PaymentId={PaymentId}, TenantId={TenantId}, By={UserId}"`, `"ShortTermRental {action}: RentalId={RentalId}, PropertyId={PropertyId}, By={UserId}"`
- Inspection surfaces: Swagger UI at `/swagger/index.html` shows all new endpoints; `GET /api/properties/{id}/tenants` shows active/inactive tenant list; rent payment status reflects real-time late detection
- Failure visibility: 403 responses with `{ error: "forbidden", message: "..." }` for access violations; 409 Conflict when adding active tenant to property with existing active tenant; 400 for validation errors with descriptive messages
- Redaction constraints: Tenant TC kimlik numarası (IdentityNumber) is PII — logged only as existence check, never as full value

## Integration Closure

- Upstream surfaces consumed: `Property` entity + `IGroupAccessService` (S02), JWT middleware (S01), `ApplicationDbContext` (S01/S02), `PropertyDetail.tsx` tab structure (S02), frontend API client pattern (S02)
- New wiring introduced: 4 new DbSets, 4 new controllers registered via `[ApiController]`, new routes in React Router, new tab content in PropertyDetail
- What remains before milestone is truly usable end-to-end: S04 (expense/bill tracking), S05 (document management), S06 (dashboard, notifications, reporting)

## Tasks

- [x] **T01: Define entities, enums, DbContext configuration, and EF Core migration** `est:45m`
  - Why: All controllers, tests, and frontend depend on the data model. Entities define the schema, Fluent API ensures correct decimal precision and cascade behavior, migration creates the tables.
  - Files: `GurkanApi/Entities/Tenant.cs`, `GurkanApi/Entities/RentPayment.cs`, `GurkanApi/Entities/ShortTermRental.cs`, `GurkanApi/Entities/RentIncrease.cs`, `GurkanApi/Entities/Enums.cs`, `GurkanApi/Data/ApplicationDbContext.cs`
  - Do: Create 4 entity classes matching research spec. Add `RentPaymentStatus` (Pending, Paid, Late, Cancelled) and `PaymentMethod` (Cash, BankTransfer, Check) and `RentalPlatform` (Airbnb, Booking, Direct) enums to Enums.cs. Configure Fluent API: decimal(18,2) for all money fields, DeleteBehavior.Restrict on Tenant→Property FK, Cascade on RentPayment→Tenant, Cascade on RentIncrease→Tenant, Cascade on ShortTermRental→Property. Add 4 DbSets. Generate EF Core migration. Apply migration to verify it runs.
  - Verify: `dotnet build GurkanApi/` compiles without errors. `dotnet ef database update --project GurkanApi/` applies migration successfully.
  - Done when: All 4 tables exist in DB with correct columns, FKs, and constraints. `dotnet build` clean.

- [x] **T02: Build all controllers and DTOs with business logic** `est:1h30m`
  - Why: The API surface — 4 controllers with ~16 endpoints covering tenant lifecycle, payment management, short-term rentals, and rent increases. Includes the core business logic: automatic payment generation, active tenant enforcement, late detection at query time, termination with payment cancellation, rent increase propagation.
  - Files: `GurkanApi/Controllers/TenantsController.cs`, `GurkanApi/Controllers/RentPaymentsController.cs`, `GurkanApi/Controllers/ShortTermRentalsController.cs`, `GurkanApi/Controllers/RentIncreasesController.cs`, `GurkanApi/DTOs/Tenants/`, `GurkanApi/DTOs/RentPayments/`, `GurkanApi/DTOs/ShortTermRentals/`, `GurkanApi/DTOs/RentIncreases/`
  - Do: TenantsController — CRUD + active tenant enforcement + auto-generate monthly RentPayment records on create + POST terminate endpoint (sets IsActive=false, marks future Pending payments as Cancelled). RentPaymentsController — list with computed late status (Pending + DueDate+5days < now → Late in response), PATCH pay action (set PaidDate + PaymentMethod + Status=Paid). ShortTermRentalsController — straightforward CRUD with date overlap validation. RentIncreasesController — POST creates increase record + updates future Pending payment amounts. All controllers follow PropertyNotesController nested route pattern, check property access first via IGroupAccessService.
  - Verify: `dotnet build GurkanApi/` compiles. Swagger UI shows all new endpoints with correct schemas.
  - Done when: All 4 controllers compile, all DTOs defined, Swagger shows ~16 new endpoints.

- [x] **T03: Write integration tests covering all S03 business logic** `est:1h`
  - Why: Proves the contract — tenant CRUD, access control, payment generation, late detection, termination, short-term rental CRUD, rent increase propagation. These tests are S06's confidence that the data layer works.
  - Files: `GurkanApi.Tests/IntegrationTests/TenantTests.cs`, `GurkanApi.Tests/IntegrationTests/TestFixture.cs`
  - Do: Add new tables to TRUNCATE in TestFixture.cs (RentIncreases, RentPayments, ShortTermRentals, Tenants — before PropertyNotes). Write TenantTests.cs with `[Trait("Category", "S03")]` covering: tenant create (verify payments auto-generated), tenant update, active tenant enforcement (409 on second active), cross-group access denial (403), list active vs inactive, payment late detection (create tenant with past DueDate, verify Late status in response), mark payment as paid, terminate tenant (verify future payments cancelled), short-term rental CRUD with date overlap rejection, rent increase with future payment amount update, multi-currency tenant creation.
  - Verify: `dotnet test GurkanApi.Tests/ --filter "Category=S03"` — all pass. `dotnet test GurkanApi.Tests/` — full regression passes.
  - Done when: ≥12 integration tests pass covering all major business logic paths. S01+S02 tests unbroken.

- [x] **T04: Build frontend pages, wire routing, and verify in browser** `est:1h30m`
  - Why: Closes the slice — users need to see and interact with tenant data, rent payments, and short-term rentals through the UI. PropertyDetail gets the "Kiralar" tab content.
  - Files: `gurkan-ui/src/types/index.ts`, `gurkan-ui/src/api/client.ts`, `gurkan-ui/src/App.tsx`, `gurkan-ui/src/pages/Properties/PropertyDetail.tsx`, `gurkan-ui/src/pages/Tenants/TenantList.tsx`, `gurkan-ui/src/pages/Tenants/TenantForm.tsx`, `gurkan-ui/src/pages/Tenants/TenantDetail.tsx`, `gurkan-ui/src/pages/ShortTermRentals/ShortTermRentalList.tsx`, `gurkan-ui/src/pages/ShortTermRentals/ShortTermRentalForm.tsx`, `gurkan-ui/src/pages/Tenants/Tenants.css`, `gurkan-ui/src/pages/ShortTermRentals/ShortTermRentals.css`
  - Do: Add TypeScript types (Tenant, RentPayment, ShortTermRental, RentIncrease, RentPaymentStatus, PaymentMethod, RentalPlatform — all as const with string values). Add API functions for all endpoints. Build TenantList (active + past tenants sections), TenantForm (create/edit with all fields), TenantDetail (tenant info + rent payment table with status badges + rent increase history). Build ShortTermRentalList and ShortTermRentalForm. Integrate into PropertyDetail with tab navigation for "Kiracılar" and "Kısa Dönem". Add routes in App.tsx. Follow existing design system (Properties.css patterns, warm terracotta accent). Load `frontend-design` skill for UI work.
  - Verify: `cd gurkan-ui && npm run build` — TypeScript compiles. Browser: login → navigate to property → see tenant tab → create tenant → verify payments appear → mark paid → create short-term rental.
  - Done when: All frontend pages render correctly, TypeScript compiles, browser verification of full tenant lifecycle.

## Files Likely Touched

- `GurkanApi/Entities/Tenant.cs` (new)
- `GurkanApi/Entities/RentPayment.cs` (new)
- `GurkanApi/Entities/ShortTermRental.cs` (new)
- `GurkanApi/Entities/RentIncrease.cs` (new)
- `GurkanApi/Entities/Enums.cs` (modified — add RentPaymentStatus, PaymentMethod, RentalPlatform)
- `GurkanApi/Data/ApplicationDbContext.cs` (modified — add DbSets + Fluent API)
- `GurkanApi/Controllers/TenantsController.cs` (new)
- `GurkanApi/Controllers/RentPaymentsController.cs` (new)
- `GurkanApi/Controllers/ShortTermRentalsController.cs` (new)
- `GurkanApi/Controllers/RentIncreasesController.cs` (new)
- `GurkanApi/DTOs/Tenants/*.cs` (new — 4 files)
- `GurkanApi/DTOs/RentPayments/*.cs` (new — 4 files)
- `GurkanApi/DTOs/ShortTermRentals/*.cs` (new — 3 files)
- `GurkanApi/DTOs/RentIncreases/*.cs` (new — 2 files)
- `GurkanApi/Migrations/*_AddTenantAndRentalEntities.cs` (new)
- `GurkanApi.Tests/IntegrationTests/TenantTests.cs` (new)
- `GurkanApi.Tests/IntegrationTests/TestFixture.cs` (modified — TRUNCATE)
- `gurkan-ui/src/types/index.ts` (modified)
- `gurkan-ui/src/api/client.ts` (modified)
- `gurkan-ui/src/App.tsx` (modified)
- `gurkan-ui/src/pages/Properties/PropertyDetail.tsx` (modified)
- `gurkan-ui/src/pages/Tenants/TenantList.tsx` (new)
- `gurkan-ui/src/pages/Tenants/TenantForm.tsx` (new)
- `gurkan-ui/src/pages/Tenants/TenantDetail.tsx` (new)
- `gurkan-ui/src/pages/Tenants/Tenants.css` (new)
- `gurkan-ui/src/pages/ShortTermRentals/ShortTermRentalList.tsx` (new)
- `gurkan-ui/src/pages/ShortTermRentals/ShortTermRentalForm.tsx` (new)
- `gurkan-ui/src/pages/ShortTermRentals/ShortTermRentals.css` (new)
