# Gürkan — Gayrimenkul Portföy Yönetimi

## What This Is

Aile içi kullanıma yönelik bir gayrimenkul portföy yönetim web uygulaması. Mülklerin kira, gider, fatura ve dökümanlarını takip eder. Grup bazlı erişim modeli ile aile üyeleri sadece kendilerine atanmış mülkleri görür. Hem uzun dönem (aylık kira) hem kısa dönem (Airbnb-style) kiralamaları destekler.

## Core Value

<!-- This is the primary value anchor for prioritization and tradeoffs.
     If scope must shrink, this should survive. -->

Tüm mülklerin finansal durumunu tek bir dashboard'dan görmek — kira gelirleri, giderler, faturalar — ve yaklaşan ödemeleri kaçırmamak.

## Current State

S01 tamamlandı: ASP.NET Core 10 Web API + PostgreSQL 16 (Docker, port 5434) + JWT auth + grup bazlı RBAC. Seed admin (admin@gurkan.com), 3 controller (Auth, Groups, Users), 15 endpoint, 18 integration test. Backend çalışır durumda, frontend henüz yok.

## Architecture / Key Patterns

- **Backend:** ASP.NET Core Web API (controller-based) + Entity Framework Core + PostgreSQL
- **Frontend:** React + Vite + TypeScript
- **Auth:** JWT token tabanlı email + şifre authentication
- **Erişim modeli:** Superadmin → Gruplar → Mülkler. Kullanıcılar gruplara, mülkler gruplara atanır.
- **Deploy:** Self-hosted VPS (Docker)
- **Multi-currency:** TL + USD/EUR

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

<!-- Check off milestones as they complete. One-liners should describe intent, not implementation detail. -->

- [ ] M001: Gayrimenkul Portföy Yönetimi — Kira, gider, fatura takibi, döküman yönetimi, dashboard, raporlama
- [ ] M002: Servet Yönetimi Evrimi — Gayrimenkul dışı varlık sınıfları, birleşik portföy görünümü
