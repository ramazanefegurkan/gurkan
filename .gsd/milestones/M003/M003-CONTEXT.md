# M003: Production Ready — Deploy, Mobil Uygulama, Import & Polish

**Gathered:** 2026-03-18
**Status:** Ready for planning

## Project Description

M001'de teslim edilen gayrimenkul portföy yönetim web uygulamasını gerçek günlük kullanıma hazır hale getiren "pişirme" milestone'u. v2 (Servet Yönetimi Evrimi) öncesinde uygulamayı production'a çıkarmak, mobil erişim eklemek, geçmiş verileri import etmek ve web arayüzünü parlatmak.

## Why This Milestone

M001 çalışan bir web uygulaması üretti ama sadece localhost'ta yaşıyor. Gerçek kullanım için:
1. Mobil erişim lazım — aile üyeleri telefonda kullanacak
2. Mevcut veriler sisteme girilmeli — 2 yıldır kirada olan evlerin geçmiş kayıtları var
3. Sistem internetten erişilebilir olmalı — localhost'a mobil cihazdan bağlanamazsın
4. JWT session 15dk'da kopuyor — gerçek kullanımda kabul edilemez
5. Web UI daha polish olmalı — M001'de fonksiyon öncelikliydi

## User-Visible Outcome

### When this milestone is complete, the user can:

- Telefonundan (iOS veya Android) uygulamaya giriş yapıp dashboard'ı görebilir, mülk detaylarına bakabilir
- Airbnb'den indirdiği CSV raporu sisteme yükleyip kısa dönem kiralama kayıtlarını otomatik oluşturabilir
- Geçmiş uzun dönem kira ödemelerini Excel/CSV ile toplu import edebilir
- Kira gecikme veya fatura yaklaşma olduğunda telefonuna push bildirim alabilir
- Web uygulamasına domain üzerinden (HTTPS) erişebilir — session kopmadan uzun süreli kullanabilir
- Web UI daha tutarlı, responsive ve polish görünecek

### Entry point / environment

- Entry point: https://gurkan.example.com (web), Expo Go / standalone app (mobil)
- Environment: Hetzner VPS (Docker Compose) → production
- Live dependencies involved: PostgreSQL database, Expo Push Notification servisi, domain DNS, Let's Encrypt

## Completion Class

- Contract complete means: Mobil app build oluyor (EAS), push notification backend endpoint'i test edilmiş, import endpoint'leri çalışıyor
- Integration complete means: Mobil app production backend'e bağlanıyor, push bildirimleri gerçek cihaza geliyor, CSV import gerçek Airbnb dosyasıyla çalışıyor
- Operational complete means: VPS'te Docker Compose ile çalışıyor, HTTPS aktif, domain erişilebilir

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- Mobil uygulama (Expo) telefondan login olup dashboard ve mülk detaylarını gösteriyor
- Airbnb CSV import ediliyor, kısa dönem kiralama kayıtları oluşuyor
- Geçmiş kira ödemeleri toplu import ediliyor
- Push bildirim (kira gecikme veya fatura yaklaşma) telefona geliyor
- Web uygulaması domain + HTTPS üzerinden erişilebilir, token refresh çalışıyor
- Web UI polish geçilmiş, responsive çalışıyor

## Risks and Unknowns

- **VPS + Docker deploy** — Nginx/Caddy reverse proxy, Let's Encrypt otomatik sertifika, CORS ayarları. Deploy sırasında sorun çıkabilir ama standart pattern.
- **Expo + backend JWT entegrasyonu** — Mobilde token storage (SecureStore), auth akışı, API bağlantısı. Risk orta — Expo'nun iyi dökümantasyonu var.
- **Push notification altyapısı** — Backend'de device token kayıt + push trigger mekanizması. Expo Push servisi ücretsiz ama backend tarafında yeni endpoint'ler ve tetikleme logic'i lazım. Mevcut query-time notification'lar push trigger'a dönüştürülmeli.
- **Airbnb CSV format** — Sütun yapısı, encoding, Türkçe karakter desteği. Gerçek dosya ile test edilmeli.
- **EAS Build** — iOS build için Apple Developer hesabı gerekiyor. Android için Google Play Developer hesabı. Hesap yoksa Expo Go ile test edilebilir.

## Existing Codebase / Prior Art

- `GurkanApi/` — ASP.NET Core 10 Web API, 15 controller, 58+ endpoint, JWT auth, group-based RBAC
- `GurkanApi/Controllers/AuthController.cs` — login, register, refresh, change-password endpoint'leri
- `GurkanApi/Services/TokenService.cs` — JWT token generation + refresh token rotation
- `gurkan-ui/` — React + Vite + TypeScript, 17 sayfa, axios API client with interceptor
- `gurkan-ui/src/api/client.ts` — tüm API fonksiyonları, baseURL `localhost:5039`
- `gurkan-ui/src/contexts/AuthContext.tsx` — JWT auth context, localStorage token storage
- `gurkan-ui/src/index.css` — design tokens (terracotta accent, DM Sans, Playfair Display)
- `docker-compose.yml` — PostgreSQL 16 on port 5434
- `GurkanApi/appsettings.json` — connection string, JWT config, file storage path

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- R016 — Airbnb CSV + geçmiş kira ödemeleri import (kısmi — gider/fatura import yok)
- R017 — React Native/Expo mobil uygulama (iOS + Android)
- R019 — Push notification (kira gecikme, fatura yaklaşma, sözleşme bitiş)
- R025 — VPS deploy (Hetzner + domain + HTTPS + Docker Compose)
- R026 — Token refresh mekanizması
- R027 — Web UI polish

## Scope

### In Scope

- Hetzner VPS deploy — Docker Compose + Nginx/Caddy + Let's Encrypt + domain
- Token refresh — frontend axios interceptor + mobil app'te aynı pattern
- Web UI polish — spacing, tutarlılık, responsive, loading state'ler
- Airbnb CSV import — parse + kısa dönem kiralama kayıtlarına dönüştürme
- Geçmiş kira ödemeleri toplu import — Excel/CSV upload + validation + bulk insert
- React Native/Expo mobil uygulama — iOS + Android, tüm sayfalar
- Push notification — Expo Push servisi, backend device token + trigger mekanizması

### Out of Scope / Non-Goals

- Gider/fatura import (kısmi import — sadece kira ve Airbnb)
- Email bildirimler (sadece push notification)
- SaaS multi-tenancy (R018 — deferred)
- Web app'i komple yeniden tasarlama (polish, overhaul değil)
- App Store / Google Play yayınlama (Expo Go veya EAS internal distribution yeterli)

## Technical Constraints

- Backend: ASP.NET Core 10 Web API (mevcut — extend edilecek, yeniden yazılmayacak)
- Mobil: React Native + Expo (managed workflow)
- Deploy: Docker Compose on Hetzner VPS
- HTTPS: Let's Encrypt via Nginx veya Caddy
- Push: Expo Push Notification servisi (ücretsiz)

## Integration Points

- **Hetzner VPS** — Docker Compose ile backend + frontend + PostgreSQL deploy
- **Domain DNS** — A record pointing to VPS IP
- **Let's Encrypt** — Otomatik HTTPS sertifika yenileme
- **Expo Push Service** — Push token registration + notification delivery
- **EAS Build** — iOS + Android build servisi (cloud-based)
- **Airbnb CSV** — External file format parse (earnings export)

## Open Questions

- Hangi domain kullanılacak? Kullanıcı karar verecek. Deploy slice'ında sorulabilir.
- Apple Developer hesabı var mı? iOS build için gerekli. Yoksa Expo Go ile test yeterli.
- Airbnb CSV'nin tam sütun yapısı? Gerçek dosya ile import slice'ında keşfedilecek.
