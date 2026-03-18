# M003: Production Ready — Deploy, Mobil Uygulama, Import & Polish

**Vision:** M001'de teslim edilen gayrimenkul portföy yönetim web uygulamasını gerçek günlük kullanıma hazır hale getirmek: production deploy, React Native/Expo mobil uygulama, veri import, push notification ve web UI polish.

## Success Criteria

- Web uygulaması domain + HTTPS üzerinden erişilebilir (VPS'te Docker Compose ile çalışıyor)
- Token refresh çalışıyor — 15dk'da session kopmuyor
- Web UI polish geçilmiş — tutarlı spacing, responsive, loading state'ler
- Airbnb CSV import ediliyor → kısa dönem kiralama kayıtları oluşuyor
- Geçmiş kira ödemeleri toplu import ediliyor
- Mobil uygulama (Expo) login + dashboard + mülk listesi/detay + tüm sub-pages çalışıyor
- Push notification telefona geliyor (kira gecikme, fatura yaklaşma, sözleşme bitiş)

## Key Risks / Unknowns

- VPS deploy + HTTPS + reverse proxy konfigürasyonu — standart pattern ama ilk seferde sorun çıkabilir
- Expo + ASP.NET Core JWT entegrasyonu — mobilde SecureStore token storage, auth akışı
- Push notification backend altyapısı — device token kayıt, tetikleme mekanizması, query-time→push dönüşümü
- Airbnb CSV sütun yapısı — gerçek dosya ile test edilmeli

## Proof Strategy

- VPS deploy riski → retire in S01 by proving backend + frontend HTTPS üzerinden erişilebilir
- JWT mobil entegrasyon riski → retire in S04 by proving Expo app login olup API'den veri çekebilir
- Push notification riski → retire in S06 by proving gerçek cihaza push bildirim gelir
- CSV format riski → retire in S03 by proving gerçek Airbnb CSV parse edilip kayıt oluşur

## Verification Classes

- Contract verification: API endpoint testleri, import endpoint'leri, push registration endpoint'i
- Integration verification: Mobil app→production backend, push notification delivery, CSV import→DB records
- Operational verification: VPS uptime, HTTPS sertifika, Docker Compose restart davranışı
- UAT / human verification: Mobil app kullanım deneyimi, push notification alımı, import sonuçları doğruluğu

## Milestone Definition of Done

This milestone is complete only when all are true:

- Backend + frontend Hetzner VPS'te Docker Compose ile çalışıyor, domain + HTTPS erişilebilir
- Token refresh mekanizması çalışıyor (web + mobil), session kopmuyor
- Web UI polish tamamlanmış (spacing, responsive, loading state'ler)
- Airbnb CSV import çalışıyor — gerçek CSV dosyasıyla test edilmiş
- Geçmiş kira ödemeleri toplu import çalışıyor
- Expo mobil uygulama login, dashboard, mülk listesi/detay, kiracılar, giderler, faturalar, dökümanlar, bildirimler çalışıyor
- Push notification backend trigger → telefona bildirim geliyor
- Final integrated acceptance senaryoları geçiyor

## Requirement Coverage

- Covers: R016, R017, R019, R025, R026, R027
- Partially covers: none
- Leaves for later: R018 (SaaS)
- Orphan risks: none

## Slices

- [ ] **S01: Production Deploy** `risk:high` `depends:[]`
  > After this: Backend + frontend Hetzner VPS'te Docker Compose ile çalışıyor, domain + HTTPS ile erişilebilir. PostgreSQL production'da ayakta.

- [ ] **S02: Web Improvements** `risk:low` `depends:[S01]`
  > After this: Token refresh çalışıyor (session 15dk'da kopmuyor). Web UI polish geçilmiş (spacing, responsive, tutarlılık, loading state'ler, boş durum görselleri).

- [ ] **S03: Data Import** `risk:medium` `depends:[S01]`
  > After this: Airbnb CSV import ile kısa dönem kiralama kayıtları oluşuyor. Geçmiş uzun dönem kira ödemeleri toplu import edilebiliyor. Validation ve hata raporlaması çalışıyor.

- [ ] **S04: Mobil App Foundation** `risk:high` `depends:[S01]`
  > After this: Expo app'te login olunabiliyor (JWT + SecureStore), dashboard görüntülenebiliyor, mülk listesi ve detayı çalışıyor. Production backend'e bağlı.

- [ ] **S05: Mobil App Full Features** `risk:medium` `depends:[S04]`
  > After this: Tüm property sub-pages (kiracılar, kısa dönem, giderler, faturalar, dökümanlar, bildirimler) mobilde çalışıyor. CRUD işlemleri ve form'lar mobilde functional.

- [ ] **S06: Push Notifications** `risk:medium` `depends:[S04]`
  > After this: Expo Push ile kira gecikme, fatura yaklaşma, sözleşme bitiş bildirimleri telefona geliyor. Backend'de device token kayıt + periyodik push trigger mekanizması çalışıyor.

## Boundary Map

### S01 (Production Deploy)

Produces:
- Docker Compose production config — API + frontend + PostgreSQL + reverse proxy (Nginx/Caddy)
- Nginx/Caddy config with HTTPS (Let's Encrypt) + reverse proxy rules
- Production `appsettings.Production.json` with real connection string, JWT secret, CORS for domain
- Frontend production build with environment-based API URL (domain, not localhost)
- Deploy script / documentation for VPS setup
- DNS configuration documentation

Consumes:
- nothing (first slice)

### S01 → S02

Produces (consumed by S02):
- Production-accessible backend URL (https://api.domain.com or https://domain.com/api)
- Working CORS config for web frontend on production domain

### S01 → S03

Produces (consumed by S03):
- Production-accessible backend for testing import against real data

### S01 → S04

Produces (consumed by S04):
- Production-accessible backend URL for mobile app API calls
- HTTPS endpoint required for Expo/React Native network requests

### S02 (Web Improvements)

Produces:
- Token refresh interceptor in `gurkan-ui/src/api/client.ts` — 401 → refresh → retry pattern
- Updated AuthContext with refresh token rotation on expiry
- Polished CSS across all pages — consistent spacing, responsive breakpoints, loading spinners, empty states
- Updated `gurkan-ui/src/index.css` with any new design tokens

Consumes from S01:
- Production URL for API client configuration

### S03 (Data Import)

Produces:
- `ImportController` — POST /api/import/airbnb-csv (multipart CSV upload → ShortTermRental records)
- `ImportController` — POST /api/import/rent-payments (multipart CSV/Excel upload → RentPayment records)
- CSV parser for Airbnb earnings format (date, amount, fees, guest name)
- Excel/CSV parser for bulk rent payment import (property, tenant, amount, date, status)
- Import validation + error reporting (row-level errors, summary)
- Frontend import page with file upload, preview, confirmation, and result summary

Consumes from S01:
- Production backend for real-data testing

### S04 (Mobil App Foundation)

Produces:
- `gurkan-mobile/` — Expo project (managed workflow)
- Auth screens (Login) with JWT + SecureStore token storage
- API client module — same endpoints as web, configured for production URL
- Token refresh interceptor (same pattern as S02 web)
- Dashboard screen — summary cards, property breakdown
- Property list screen — card grid with group filtering
- Property detail screen — basic info display
- Navigation — bottom tab or drawer navigation pattern

Consumes from S01:
- Production HTTPS backend URL
- CORS config allowing mobile origin

### S04 → S05

Produces (consumed by S05):
- Expo project structure, navigation pattern, auth context, API client
- Reusable mobile UI components (cards, badges, forms, lists)
- Token refresh interceptor

### S04 → S06

Produces (consumed by S06):
- Expo project with push notification capability
- Auth context with userId for device token association

### S05 (Mobil App Full Features)

Produces:
- Tenant screens (list, detail with payment table, create/edit form)
- Short-term rental screens (list, create/edit form)
- Expense screens (list, create/edit form)
- Bill screens (list with mark-paid action, create/edit form)
- Document screens (list with upload, download)
- Notification screen (list with severity badges)
- Report export (trigger download from mobile)

Consumes from S04:
- Navigation structure, auth context, API client, UI components

### S06 (Push Notifications)

Produces:
- Backend `DeviceToken` entity + migration — stores (UserId, ExpoPushToken, Platform, CreatedAt)
- `DeviceTokensController` — POST /api/device-tokens (register), DELETE (unregister)
- `PushNotificationService` — sends push via Expo Push API (https://exp.host/--/api/v2/push/send)
- Background notification check — periodic or login-triggered push for pending notifications
- Mobile app push permission request + token registration on login
- Push notification handler in Expo app (foreground + background)

Consumes from S04:
- Expo project, auth context, API client
- Expo Notifications library for token + permission management
