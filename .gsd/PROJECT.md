# Gürkan — Gayrimenkul Portföy Yönetimi

## What This Is

Aile içi kullanıma yönelik bir gayrimenkul portföy yönetim web uygulaması. Mülklerin kira, gider, fatura ve dökümanlarını takip eder. Grup bazlı erişim modeli ile aile üyeleri sadece kendilerine atanmış mülkleri görür. Hem uzun dönem (aylık kira) hem kısa dönem (Airbnb-style) kiralamaları destekler.

## Core Value

<!-- This is the primary value anchor for prioritization and tradeoffs.
     If scope must shrink, this should survive. -->

Tüm mülklerin finansal durumunu tek bir dashboard'dan görmek — kira gelirleri, giderler, faturalar — ve yaklaşan ödemeleri kaçırmamak.

## Current State

M001 ve M003 tamamlandı ve doğrulandı. Uygulama production-ready: Docker Compose stack (Caddy + API + frontend + PostgreSQL), Expo mobil uygulama, CSV import, push notification pipeline. 93 integration test pass, web + mobile build clean.

**Backend:** ASP.NET Core 10 Web API + PostgreSQL 16 (Docker, port 5434) + JWT auth + grup bazlı RBAC. 18 controllers (Import, DeviceTokens, Push eklendi), 65+ endpoints, 93 integration tests. INotificationComputeService shared between in-app and push. PushNotificationService with Expo Push API batching.

**Frontend (Web):** React + Vite + TypeScript (gurkan-ui/). 18 sayfa (Import eklendi). JWT auth context with token refresh interceptor (401 → refresh → retry). Shared CSS architecture (shared.css). Mobile sidebar hamburger toggle. Responsive at 1280/768/375px.

**Frontend (Mobile):** Expo managed-workflow (SDK 54, TypeScript, React 19) in gurkan-mobile/. 18 screen files, 47 API client functions. SecureStore JWT auth with token refresh. 3-tab navigation (Dashboard/Properties/Notifications). Full CRUD for all entity types. Push notification permission + registration on signIn. Foreground notification handlers.

**Deploy:** Docker Compose production stack — PostgreSQL + ASP.NET Core API + React/nginx + Caddy reverse proxy with automatic HTTPS. VPS deployment guide + smoke test script in deploy/.

## Architecture / Key Patterns

- **Backend:** ASP.NET Core Web API (controller-based) + Entity Framework Core + PostgreSQL
- **Frontend (Web):** React + Vite + TypeScript
- **Frontend (Mobile):** React Native + Expo (managed workflow, SDK 54)
- **Auth:** JWT token tabanlı email + şifre authentication with refresh token rotation. Token refresh interceptors on web (localStorage) and mobile (SecureStore).
- **Erişim modeli:** Superadmin → Gruplar → Mülkler. GroupAccessService enforces on all controllers.
- **Deploy:** Docker Compose on Hetzner VPS — Caddy reverse proxy with automatic HTTPS via Let's Encrypt
- **Multi-currency:** TL + USD/EUR — no conversion, each currency aggregated separately
- **File storage:** Local filesystem with configurable base path
- **Push Notifications:** Expo Push API via IHttpClientFactory, on-demand trigger (POST /api/push/trigger), DeviceToken entity for token storage
- **CSS Architecture:** Single shared.css for cross-page components, page-specific CSS alongside components

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M001: Gayrimenkul Portföy Yönetimi — Kira, gider, fatura takibi, döküman yönetimi, dashboard, raporlama. 77 integration tests, 17 React pages, 15 controllers.
- [x] M003: Production Ready — Docker Compose production stack (Caddy HTTPS), token refresh (web+mobile), Airbnb CSV + rent payment import, Expo mobil uygulama (18 screens, 47 API functions), push notification pipeline. 93 integration tests. All 6 slices complete.
- [ ] M002: Servet Yönetimi Evrimi — Gayrimenkul dışı varlık sınıfları, birleşik portföy görünümü.
