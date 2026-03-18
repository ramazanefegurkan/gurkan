# Gürkan — Gayrimenkul Portföy Yönetimi

## What This Is

Aile içi kullanıma yönelik bir gayrimenkul portföy yönetim web uygulaması. Mülklerin kira, gider, fatura ve dökümanlarını takip eder. Grup bazlı erişim modeli ile aile üyeleri sadece kendilerine atanmış mülkleri görür. Hem uzun dönem (aylık kira) hem kısa dönem (Airbnb-style) kiralamaları destekler.

## Core Value

<!-- This is the primary value anchor for prioritization and tradeoffs.
     If scope must shrink, this should survive. -->

Tüm mülklerin finansal durumunu tek bir dashboard'dan görmek — kira gelirleri, giderler, faturalar — ve yaklaşan ödemeleri kaçırmamak.

## Current State

M001 tamamlandı ve doğrulandı (77/77 integration test pass, frontend build clean). Tüm 6 slice (S01–S06) başarıyla teslim edildi.

**Backend:** ASP.NET Core 10 Web API + PostgreSQL 16 (Docker, port 5434) + JWT auth + grup bazlı RBAC. 15 controller, 58+ endpoint, 77 integration test. Controllers: Auth, Groups, Users, Properties, PropertyNotes, Tenants, RentPayments, ShortTermRentals, RentIncreases, Expenses, Bills, Documents, Dashboard, Notifications, Reports.

**Frontend:** React + Vite + TypeScript (gurkan-ui/). 17 sayfa: Login, Dashboard, NotificationList, PropertyList/Detail/Form, PropertyLayout (6-tab navigation: Detaylar / Kiracılar / Kısa Dönem / Giderler / Faturalar / Dökümanlar), TenantList/Form/Detail, ShortTermRentalList/Form, ExpenseList/Form, BillList/Form, DocumentList. JWT auth context, axios API client with interceptor, responsive sidebar layout.

**Capabilities delivered:**
- JWT authentication with refresh token rotation
- Group-based RBAC (superadmin → group admin → member)
- Property CRUD with 6 types, multi-currency (TRY/USD/EUR)
- Long-term tenant management with automatic monthly rent payment generation, query-time late detection (DueDate+5), rent increases with future payment propagation
- Short-term rental tracking with platform fees (Airbnb/Booking/Direct), date overlap validation
- Property-scoped expense tracking (6 categories, recurring support)
- Bill tracking (5 types: water/electric/gas/internet/dues) with payment status and mark-as-paid
- Document management with multipart upload, 6 categories, extension+content-type validation, local filesystem storage
- Financial dashboard with multi-currency aggregation, per-property profit/loss breakdown
- Query-time in-app notifications (late rent, upcoming bills, lease expiry at 30/60/90 day tiers, rent increase approaching)
- Excel export (ClosedXML) and PDF export (QuestPDF) with per-property ROI calculation

## Architecture / Key Patterns

- **Backend:** ASP.NET Core Web API (controller-based) + Entity Framework Core + PostgreSQL
- **Frontend:** React + Vite + TypeScript
- **Auth:** JWT token tabanlı email + şifre authentication with refresh token rotation
- **Erişim modeli:** Superadmin → Gruplar → Mülkler. Kullanıcılar gruplara, mülkler gruplara atanır. GroupAccessService enforces on all controllers.
- **Deploy:** Self-hosted VPS (Docker)
- **Multi-currency:** TL + USD/EUR — no conversion, each currency aggregated separately
- **File storage:** Local filesystem with configurable base path (FileStorage:BasePath)
- **Notifications:** Query-time computation, no persisted state
- **Reports:** ClosedXML for Excel, QuestPDF for PDF

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

<!-- Check off milestones as they complete. One-liners should describe intent, not implementation detail. -->

- [x] M001: Gayrimenkul Portföy Yönetimi — Kira, gider, fatura takibi, döküman yönetimi, dashboard, raporlama. 77 integration tests, 17 React pages, 15 controllers.
- [ ] M002: Servet Yönetimi Evrimi — Gayrimenkul dışı varlık sınıfları, birleşik portföy görünümü
