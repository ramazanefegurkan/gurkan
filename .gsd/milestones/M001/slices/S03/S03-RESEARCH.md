# S03: Kira & Kiracı Takibi — Research

**Date:** 2026-03-18

## Summary

S03 adds tenant management, long-term rent payment tracking (with automatic late detection), short-term rental (Airbnb-style) reservations, and rent increase history. This is primarily CRUD work following the exact patterns established in S02 — nested controllers under `/api/properties/{id}/...`, group-based access via `IGroupAccessService`, EF Core entities with Fluent API, and React pages matching the existing design system.

The slice introduces 4 new entities (Tenant, RentPayment, ShortTermRental, RentIncrease), 4 controllers with ~16 endpoints, a matching set of DTOs, one EF Core migration, integration tests, and frontend pages for tenant/rent management within the PropertyDetail context.

Requirements R006 (rent tracking), R007 (short-term rentals), R014 (multi-currency support in rent), R015 (tenant info), R022 (lease expiry reminders — data foundation), and R024 (rent increase tracking) are all addressed. R022's actual notification logic belongs to S06, but S03 provides the LeaseEnd date field that S06 will query.

## Recommendation

Follow S02's exact patterns — this is known technology applied to known code. Each entity gets a nested controller under `/api/properties/{propertyId}/...`, property access is checked first, then child entity operations proceed. Frontend pages integrate into the existing PropertyDetail view with tab-like sections or dedicated sub-routes.

Key design decisions needed:
- **RentPayment.Status** should be a string enum (`Pending`, `Paid`, `Late`) with late detection computed at query time (compare `DueDate < DateTime.UtcNow` when status is still `Pending`) rather than a background job. This keeps it simple and accurate without scheduled tasks.
- **Tenant is per-property** — a Tenant entity with `PropertyId` FK. One property has at most one active long-term tenant (enforced by `IsActive` flag), but historical tenants are preserved.
- **RentPayment belongs to Tenant** (not Property directly) — because rent is tied to a lease agreement with a specific tenant. This matches the boundary map: `RentPayment.TenantId`.
- **ShortTermRental belongs to Property** directly — no tenant entity needed for short-term; guest info is optional fields on the rental record.
- **RentIncrease belongs to Tenant** — tracks yearly increases tied to a specific lease.
- **Currency on payment/rental records** — each record carries its own `Currency` field, defaulting to the property's currency at creation time (per S02 forward intelligence).

## Implementation Landscape

### Key Files — Existing (read, follow patterns)

- `GurkanApi/Controllers/PropertiesController.cs` — pattern for access checks: load property → check group membership → operate
- `GurkanApi/Controllers/PropertyNotesController.cs` — pattern for nested controller: `[Route("api/properties/{propertyId:guid}/notes")]`
- `GurkanApi/Services/GroupAccessService.cs` — `CanAccessPropertyAsync(userId, propertyId, role)` — reuse directly
- `GurkanApi/Entities/Enums.cs` — add new enums here (RentPaymentStatus, ExpenseCategory etc. if needed)
- `GurkanApi/Data/ApplicationDbContext.cs` — add DbSets and Fluent API configs for new entities
- `GurkanApi/DTOs/Properties/` — follow DTO naming: `Create*Request`, `Update*Request`, `*Response`
- `GurkanApi.Tests/IntegrationTests/HttpClientExtensions.cs` — `LoginAsAsync`, `ReadAsApiJsonAsync<T>` helpers
- `GurkanApi.Tests/IntegrationTests/TestFixture.cs` — add new tables to TRUNCATE statement
- `gurkan-ui/src/types/index.ts` — add TypeScript types for new entities (use `as const` pattern, string enum values)
- `gurkan-ui/src/api/client.ts` — add API functions for tenant/rent/short-term/increase endpoints
- `gurkan-ui/src/App.tsx` — add routes for tenant pages (nested under properties)
- `gurkan-ui/src/pages/Properties/PropertyDetail.tsx` — integrate tenant/rent summary or navigation links
- `gurkan-ui/src/components/Layout.tsx` — sidebar already has "Mülkler"; tenant management is accessed through property detail, no new sidebar item needed

### Key Files — New

**Backend entities:**
- `GurkanApi/Entities/Tenant.cs` — Id, PropertyId, FullName, Phone, Email, IdentityNumber, LeaseStart, LeaseEnd, MonthlyRent, Deposit, Currency, IsActive, CreatedAt, UpdatedAt
- `GurkanApi/Entities/RentPayment.cs` — Id, TenantId, Amount, Currency, DueDate, PaidDate?, Status (Pending/Paid/Late), Notes?, CreatedAt
- `GurkanApi/Entities/ShortTermRental.cs` — Id, PropertyId, GuestName?, CheckIn, CheckOut, NightCount, NightlyRate, TotalAmount, PlatformFee, NetAmount, Platform?, Currency, Notes?, CreatedAt
- `GurkanApi/Entities/RentIncrease.cs` — Id, TenantId, PreviousAmount, NewAmount, IncreaseRate, EffectiveDate, Notes?, CreatedAt

**Backend enums (in Enums.cs):**
- `RentPaymentStatus` — Pending, Paid, Late
- (ShortTermRental doesn't need a status enum — it's a completed reservation record)

**Backend controllers:**
- `GurkanApi/Controllers/TenantsController.cs` — CRUD at `api/properties/{propertyId}/tenants`, plus GET active tenant
- `GurkanApi/Controllers/RentPaymentsController.cs` — CRUD at `api/properties/{propertyId}/tenants/{tenantId}/rent-payments`, plus bulk generate monthly payments
- `GurkanApi/Controllers/ShortTermRentalsController.cs` — CRUD at `api/properties/{propertyId}/short-term-rentals`
- `GurkanApi/Controllers/RentIncreasesController.cs` — CRUD at `api/properties/{propertyId}/tenants/{tenantId}/rent-increases`

**Backend DTOs (one folder per domain):**
- `GurkanApi/DTOs/Tenants/` — CreateTenantRequest, UpdateTenantRequest, TenantResponse, TenantListResponse
- `GurkanApi/DTOs/RentPayments/` — CreateRentPaymentRequest, UpdateRentPaymentRequest, RentPaymentResponse, GeneratePaymentsRequest
- `GurkanApi/DTOs/ShortTermRentals/` — CreateShortTermRentalRequest, UpdateShortTermRentalRequest, ShortTermRentalResponse
- `GurkanApi/DTOs/RentIncreases/` — CreateRentIncreaseRequest, RentIncreaseResponse

**EF Core migration:**
- One migration adding Tenants, RentPayments, ShortTermRentals, RentIncreases tables

**Integration tests:**
- `GurkanApi.Tests/IntegrationTests/TenantTests.cs` — `[Trait("Category", "S03")]`

**Frontend:**
- `gurkan-ui/src/pages/Tenants/TenantList.tsx` — list tenants for a property (linked from PropertyDetail)
- `gurkan-ui/src/pages/Tenants/TenantForm.tsx` — create/edit tenant
- `gurkan-ui/src/pages/Tenants/TenantDetail.tsx` — tenant detail with rent payments, increases
- `gurkan-ui/src/pages/Tenants/RentPaymentList.tsx` — rent payment table with status badges (or inline in TenantDetail)
- `gurkan-ui/src/pages/ShortTermRentals/ShortTermRentalList.tsx` — short-term rental list for a property
- `gurkan-ui/src/pages/ShortTermRentals/ShortTermRentalForm.tsx` — create/edit short-term rental
- `gurkan-ui/src/pages/Tenants/Tenants.css` — shared styles (follow Properties.css patterns)

### Build Order

1. **Backend entities + migration** — Define all 4 entities, add enums, configure DbContext Fluent API, generate migration. This is the foundation everything else depends on.
2. **Backend controllers + DTOs** — TenantsController first (it's the parent), then RentPaymentsController and RentIncreasesController (nested under tenant), then ShortTermRentalsController (independent, property-level). All follow PropertyNotesController's nested pattern.
3. **Integration tests** — Cover tenant CRUD, access control (cross-group denial), rent payment lifecycle (create, mark paid, late detection), short-term rental CRUD, rent increase recording. Use `[Trait("Category", "S03")]`.
4. **Frontend types + API client** — Add TypeScript interfaces and API functions. This is a prerequisite for all frontend pages.
5. **Frontend pages** — PropertyDetail gets tenant/rental summary sections with links. Tenant pages show lease info and rent payments. Short-term rental pages are simpler list+form. Rent increases are inline in tenant detail.

### Verification Approach

- `dotnet test GurkanApi.Tests/ --filter "Category=S03"` — all S03 integration tests pass
- `dotnet test GurkanApi.Tests/` — full regression (S01 + S02 tests still pass)
- `cd gurkan-ui && npm run build` — TypeScript compiles without errors
- Browser verification: create tenant → generate payments → verify late detection → create short-term rental → record rent increase
- Swagger UI at `/swagger/index.html` — all new endpoints visible with schemas

## Constraints

- **Vite `erasableSyntaxOnly: true`** — no TypeScript `enum` keyword on frontend. Use `as const` objects with string values matching backend `JsonStringEnumConverter` output (K009, K011).
- **Backend `JsonStringEnumConverter`** — new enums (RentPaymentStatus) will serialize as strings ("Pending", "Paid", "Late"). Frontend types must match exactly.
- **EF Core decimal precision** — MonthlyRent, Amount, Deposit, NightlyRate, TotalAmount, PlatformFee, NetAmount all need `HasColumnType("decimal(18,2)")` in Fluent API (matching Property.Area pattern).
- **PostgreSQL port 5434** — test DB uses `Port=5434` (K004). No change needed — TestFixture.cs already handles this.

## Common Pitfalls

- **Late detection timing** — Don't store "Late" as an initial status. Store "Pending" and compute late status at query time: `if (Status == Pending && DueDate < DateTime.UtcNow) → Late`. This avoids needing a background job and is always accurate. The response DTO maps the computed status.
- **Cascade delete chains** — Tenant cascade-deletes RentPayments and RentIncreases. ShortTermRental cascade-deletes with Property. But Tenant should NOT cascade-delete with Property (SetNull or Restrict) — deleting a property with active tenants should fail or require explicit tenant removal first. Use `DeleteBehavior.Restrict` on Tenant→Property FK.
- **Multiple active tenants** — Long-term rental assumes one active tenant per property. Don't enforce this at DB level (unique constraint would be complex with IsActive flag). Enforce in the controller: reject creating a tenant with `IsActive=true` when another active tenant exists for the same property.
- **Currency defaulting** — When creating a RentPayment or ShortTermRental, default Currency to the property's currency. Load the property to get the default, but allow override in the request.
- **TRUNCATE order in TestFixture** — New tables must be added to the TRUNCATE statement. Order: `"RentIncreases", "RentPayments", "ShortTermRentals", "Tenants"` before `"PropertyNotes"`. Or just use CASCADE (already present).
