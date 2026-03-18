# Gürkan — Gayrimenkul Portföy Yönetimi

## What This Is

Aile içi kullanıma yönelik bir gayrimenkul portföy yönetim web uygulaması. Mülklerin kira, gider, fatura ve dökümanlarını takip eder. Grup bazlı erişim modeli ile aile üyeleri sadece kendilerine atanmış mülkleri görür. Hem uzun dönem (aylık kira) hem kısa dönem (Airbnb-style) kiralamaları destekler.

## Core Value

<!-- This is the primary value anchor for prioritization and tradeoffs.
     If scope must shrink, this should survive. -->

Tüm mülklerin finansal durumunu tek bir dashboard'dan görmek — kira gelirleri, giderler, faturalar — ve yaklaşan ödemeleri kaçırmamak.

## Current State

M001 tamamlandı ve doğrulandı (77/77 integration test pass, frontend build clean). Tüm 6 slice (S01–S06) başarıyla teslim edildi. Uygulama sadece localhost'ta çalışıyor — production deploy, mobil uygulama ve veri import M003'te yapılacak.

**Backend:** ASP.NET Core 10 Web API + PostgreSQL 16 (Docker, port 5434) + JWT auth + grup bazlı RBAC. 15 controller, 58+ endpoint, 77 integration test.

**Frontend:** React + Vite + TypeScript (gurkan-ui/). 17 sayfa. JWT auth context, axios API client, responsive sidebar layout. PropertyLayout 6-tab navigation.

## Architecture / Key Patterns

- **Backend:** ASP.NET Core Web API (controller-based) + Entity Framework Core + PostgreSQL
- **Frontend:** React + Vite + TypeScript
- **Auth:** JWT token tabanlı email + şifre authentication with refresh token rotation
- **Erişim modeli:** Superadmin → Gruplar → Mülkler. GroupAccessService enforces on all controllers.
- **Deploy:** Self-hosted VPS (Docker) — M003'te Hetzner VPS'e deploy edilecek
- **Multi-currency:** TL + USD/EUR — no conversion, each currency aggregated separately
- **File storage:** Local filesystem with configurable base path

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M001: Gayrimenkul Portföy Yönetimi — Kira, gider, fatura takibi, döküman yönetimi, dashboard, raporlama. 77 integration tests, 17 React pages, 15 controllers.
- [ ] M003: Production Ready — Deploy, mobil uygulama (React Native/Expo), veri import (Airbnb CSV + geçmiş kira), push notification, web UI polish, token refresh.
- [ ] M002: Servet Yönetimi Evrimi — Gayrimenkul dışı varlık sınıfları, birleşik portföy görünümü.
