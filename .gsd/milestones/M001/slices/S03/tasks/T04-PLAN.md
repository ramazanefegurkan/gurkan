---
estimated_steps: 7
estimated_files: 11
---

# T04: Build frontend pages, wire routing, and verify in browser

**Slice:** S03 — Kira & Kiracı Takibi
**Milestone:** M001

## Description

Build all frontend pages for tenant management, rent payments, and short-term rentals. Add TypeScript types, API client functions, React Router routes, and integrate into PropertyDetail with tab-like navigation. Follow the existing design system (warm terracotta accent, DM Sans/Playfair Display fonts, Properties.css patterns). Load the `frontend-design` skill for UI implementation quality.

**Relevant skill:** Load `~/.gsd/agent/skills/frontend-design/SKILL.md` before starting UI work.

**Critical constraints:**
- No TypeScript `enum` keyword — use `as const` objects with string values (K009, Vite erasableSyntaxOnly)
- Enum string values must match backend JsonStringEnumConverter output exactly: "Pending", "Paid", "Late", "Cancelled", "Cash", "BankTransfer", "Check", "Airbnb", "Booking", "Direct" (K011)
- Follow existing patterns in `gurkan-ui/src/types/index.ts` and `gurkan-ui/src/api/client.ts`

## Steps

1. **Read existing frontend patterns** — Read `gurkan-ui/src/types/index.ts` (type + const object conventions), `gurkan-ui/src/api/client.ts` (API function patterns), `gurkan-ui/src/App.tsx` (route structure), `gurkan-ui/src/pages/Properties/PropertyDetail.tsx` (current detail page structure — this gets modified to show tenant info), and `gurkan-ui/src/pages/Properties/Properties.css` (design tokens and component classes to reuse).

2. **Add TypeScript types** — In `gurkan-ui/src/types/index.ts`, add:
   - `RentPaymentStatus` const object: `{ Pending: "Pending", Paid: "Paid", Late: "Late", Cancelled: "Cancelled" } as const` + union type
   - `PaymentMethod` const object: `{ Cash: "Cash", BankTransfer: "BankTransfer", Check: "Check" } as const` + union type
   - `RentalPlatform` const object: `{ Airbnb: "Airbnb", Booking: "Booking", Direct: "Direct" } as const` + union type
   - `Tenant` interface: id, propertyId, fullName, phone?, email?, identityNumber?, leaseStart, leaseEnd, monthlyRent, deposit, currency (Currency type), isActive, createdAt, updatedAt
   - `RentPayment` interface: id, tenantId, amount, currency, dueDate, paidDate?, status (RentPaymentStatus type), paymentMethod? (PaymentMethod type), notes?, createdAt
   - `ShortTermRental` interface: id, propertyId, guestName?, checkIn, checkOut, nightCount, nightlyRate, totalAmount, platformFee, netAmount, platform (RentalPlatform type), currency, notes?, createdAt
   - `RentIncrease` interface: id, tenantId, previousAmount, newAmount, increaseRate, effectiveDate, notes?, createdAt

3. **Add API client functions** — In `gurkan-ui/src/api/client.ts`, add functions:
   - Tenants: `getTenants(propertyId, active?)`, `getTenant(propertyId, tenantId)`, `createTenant(propertyId, data)`, `updateTenant(propertyId, tenantId, data)`, `terminateTenant(propertyId, tenantId)`
   - RentPayments: `getRentPayments(propertyId, tenantId, status?)`, `markPaymentPaid(propertyId, tenantId, paymentId, data)`
   - ShortTermRentals: `getShortTermRentals(propertyId)`, `getShortTermRental(propertyId, rentalId)`, `createShortTermRental(propertyId, data)`, `updateShortTermRental(propertyId, rentalId, data)`, `deleteShortTermRental(propertyId, rentalId)`
   - RentIncreases: `getRentIncreases(propertyId, tenantId)`, `createRentIncrease(propertyId, tenantId, data)`

4. **Build tenant pages** — Create `gurkan-ui/src/pages/Tenants/` directory:
   - `TenantList.tsx` — two sections: "Aktif Kiracı" (single card if exists, or empty state with "Kiracı Ekle" button) and "Geçmiş Kiracılar" (list of inactive tenants with lease dates). Links to TenantDetail and TenantForm.
   - `TenantForm.tsx` — create/edit dual mode form. Fields: FullName (required), Phone, Email, IdentityNumber, LeaseStart (date picker), LeaseEnd (date picker), MonthlyRent, Deposit, Currency (dropdown: TRY/USD/EUR). On create, warn if active tenant exists.
   - `TenantDetail.tsx` — shows tenant info card + rent payment table (DueDate, Amount, Status badge, PaymentMethod, PaidDate, Actions). Status badges: Pending=yellow, Paid=green, Late=red, Cancelled=gray. "Ödendi İşaretle" button opens a small modal/form to set PaidDate and PaymentMethod. Rent increase history section at bottom. "Sözleşmeyi Sonlandır" button with confirmation.
   - `Tenants.css` — shared styles following Properties.css patterns (status badges, tables, cards).

5. **Build short-term rental pages** — Create `gurkan-ui/src/pages/ShortTermRentals/`:
   - `ShortTermRentalList.tsx` — table of reservations (GuestName, CheckIn, CheckOut, NightCount, TotalAmount, PlatformFee, NetAmount, Platform badge). "Yeni Rezervasyon" button.
   - `ShortTermRentalForm.tsx` — create/edit form. Fields: GuestName, CheckIn (date), CheckOut (date), NightlyRate, TotalAmount, PlatformFee, NetAmount, Platform (dropdown: Airbnb/Booking/Direct), Currency, Notes. Auto-compute NightCount from dates.
   - `ShortTermRentals.css` — table and form styles.

6. **Wire into PropertyDetail and App.tsx routing** — Modify PropertyDetail.tsx to add tab-like navigation: existing content becomes "Detaylar" tab, new "Kiracılar" tab links to TenantList, new "Kısa Dönem" tab links to ShortTermRentalList. Add routes in App.tsx:
   - `/properties/:id/tenants` → TenantList
   - `/properties/:id/tenants/new` → TenantForm (create)
   - `/properties/:id/tenants/:tenantId` → TenantDetail
   - `/properties/:id/tenants/:tenantId/edit` → TenantForm (edit)
   - `/properties/:id/short-term-rentals` → ShortTermRentalList
   - `/properties/:id/short-term-rentals/new` → ShortTermRentalForm (create)
   - `/properties/:id/short-term-rentals/:rentalId/edit` → ShortTermRentalForm (edit)

7. **Build and browser verify** — Run `npm run build` to verify TypeScript compiles. Start dev server. Browser verification: login → property detail → "Kiracılar" tab → create tenant → verify auto-generated payments in TenantDetail → mark a payment as paid → navigate to "Kısa Dönem" tab → create short-term rental → verify list.

## Must-Haves

- [ ] TypeScript types for all 4 entities + 3 enums using `as const` pattern with string values
- [ ] API client functions for all tenant/payment/rental/increase endpoints
- [ ] TenantList with active/past tenant sections
- [ ] TenantForm with create/edit dual mode
- [ ] TenantDetail with rent payment table (status badges: green/yellow/red/gray) and rent increase history
- [ ] "Ödendi İşaretle" action on pending payments
- [ ] "Sözleşmeyi Sonlandır" action on active tenant
- [ ] ShortTermRentalList and ShortTermRentalForm
- [ ] PropertyDetail tab navigation (Detaylar / Kiracılar / Kısa Dönem)
- [ ] Routes wired in App.tsx
- [ ] `npm run build` compiles without errors
- [ ] Browser verification of tenant creation and payment display

## Verification

- `cd gurkan-ui && npm run build` — TypeScript compiles, Vite bundles without errors
- Browser: login → property detail → Kiracılar tab → create tenant → see payments → mark paid → Kısa Dönem tab → create rental
- No console errors during navigation and form submissions

## Inputs

- `gurkan-ui/src/types/index.ts` — existing types to extend
- `gurkan-ui/src/api/client.ts` — existing API client to extend
- `gurkan-ui/src/App.tsx` — existing routes to extend
- `gurkan-ui/src/pages/Properties/PropertyDetail.tsx` — existing page to modify with tab navigation
- `gurkan-ui/src/pages/Properties/Properties.css` — design tokens and component patterns to reuse
- T02 controller endpoints — the API surface being consumed

## Expected Output

- `gurkan-ui/src/types/index.ts` — modified, 4 new interfaces + 3 const enum objects
- `gurkan-ui/src/api/client.ts` — modified, ~15 new API functions
- `gurkan-ui/src/App.tsx` — modified, ~7 new routes
- `gurkan-ui/src/pages/Properties/PropertyDetail.tsx` — modified, tab navigation added
- `gurkan-ui/src/pages/Tenants/TenantList.tsx` — new
- `gurkan-ui/src/pages/Tenants/TenantForm.tsx` — new
- `gurkan-ui/src/pages/Tenants/TenantDetail.tsx` — new
- `gurkan-ui/src/pages/Tenants/Tenants.css` — new
- `gurkan-ui/src/pages/ShortTermRentals/ShortTermRentalList.tsx` — new
- `gurkan-ui/src/pages/ShortTermRentals/ShortTermRentalForm.tsx` — new
- `gurkan-ui/src/pages/ShortTermRentals/ShortTermRentals.css` — new

## Observability Impact

- **Browser console**: No JS errors during tenant/payment/rental CRUD flows. Network errors surface as inline error banners with descriptive messages from backend.
- **API error surfaces**: 409 Conflict (active tenant exists), 400 (validation), 403 (access denied) all render as user-visible error banners on forms.
- **Status badges**: Payment status (Pending=yellow, Paid=green, Late=red, Cancelled=gray) and platform badges (Airbnb=coral, Booking=blue, Direct=terracotta) provide visual diagnostic signal.
- **Future agent inspection**: Navigate to any property → Kiracılar tab to see tenant state; Kısa Dönem tab for rental records. Browser DevTools Network tab shows all API calls to `/api/properties/{id}/tenants/*` and `/api/properties/{id}/short-term-rentals/*`.
