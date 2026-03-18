# Requirements

This file is the explicit capability and coverage contract for the project.

## Validated

### R001 — Mülk ekleme, düzenleme, silme, detay görüntüleme. Her mülk bir gruba atanır.
- Class: core-capability
- Status: validated
- Description: Mülk ekleme, düzenleme, silme, detay görüntüleme. Her mülk bir gruba atanır.
- Why it matters: Sistemin temel veri birimi — her şey mülk etrafında dönüyor.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: none
- Validation: S02 integration tests (14/14 pass): property create 201, update 200, delete 204, list with group filter, detail. PropertiesController 5 endpoints with group-based access control. Frontend property list/form/detail pages browser-verified.
- Notes: Mülk tipi (daire, ev, dükkan vs.), konum, metrekare gibi temel bilgiler.

### R002 — Mülkler gruplara atanır, kullanıcılar gruplara eklenir. Kullanıcı sadece kendi gruplarındaki mülkleri görür. Bir kullanıcı birden fazla grupta olabilir.
- Class: core-capability
- Status: validated
- Description: Mülkler gruplara atanır, kullanıcılar gruplara eklenir. Kullanıcı sadece kendi gruplarındaki mülkleri görür. Bir kullanıcı birden fazla grupta olabilir.
- Why it matters: Aile içi kullanımda herkes sadece ilgili mülkleri görmeli.
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: M001/S02
- Validation: S01 GroupAccessTests (11 tests): cross-group access denial 403, member sees only own groups. S02 PropertyTests (14 tests): group-filtered property listing, cross-group property access 403. GroupAccessService enforces membership on all downstream controllers (S03-S06).
- Notes: Grup örnekleri: "Aile" (ben + babam), "Geniş Aile" (ben + babam + kuzenim).

### R003 — Superadmin rolü tüm mülkleri, tüm grupları, tüm kullanıcıları görür ve yönetir.
- Class: core-capability
- Status: validated
- Description: Superadmin rolü tüm mülkleri, tüm grupları, tüm kullanıcıları görür ve yönetir.
- Why it matters: Tek bir kişinin (mal sahibi) tam kontrol sahibi olması.
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: none
- Validation: S01 integration tests prove superadmin creates groups, sees all groups/users, manages roles, assigns properties, delegates group admin. Superadmin bypass in GroupAccessService confirmed across all 15 controllers.
- Notes: İlk kullanıcı otomatik superadmin olur.

### R004 — Superadmin başka bir kullanıcıyı grup admini yapabilir. Grup admini kendi grubuna kullanıcı ekleyebilir ve mülk atayabilir.
- Class: core-capability
- Status: validated
- Description: Superadmin başka bir kullanıcıyı grup admini yapabilir. Grup admini kendi grubuna kullanıcı ekleyebilir ve mülk atayabilir.
- Why it matters: Baban gibi güvenilen biri kendi grubunu yönetebilmeli.
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: none
- Validation: S01 integration tests prove superadmin delegates group admin role, group admin adds members to own group (201), group admin blocked from other groups (403). Role hierarchy enforced in GroupAccessService.
- Notes: Superadmin > Grup Admin > Üye hiyerarşisi. Grup içi herkes eşit erişime sahip.

### R005 — Email ve şifre ile login. JWT token tabanlı API authentication.
- Class: core-capability
- Status: validated
- Description: Email ve şifre ile login. JWT token tabanlı API authentication.
- Why it matters: Kullanıcı kimlik doğrulaması — erişim kontrolünün temeli.
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: none
- Validation: S01 AuthTests (7 tests): login returns JWT, register creates user, refresh token rotation (old rejected), change password works, invalid credentials 401, unauthenticated 401, non-superadmin register 403.
- Notes: Refresh token mekanizması dahil.

### R006 — Aylık kira miktarı, ödeme tarihi, ödeme durumu (ödendi/ödenmedi/gecikti). Kira geçmişi.
- Class: primary-user-loop
- Status: validated
- Description: Aylık kira miktarı, ödeme tarihi, ödeme durumu (ödendi/ödenmedi/gecikti). Kira geçmişi.
- Why it matters: Kira gelirinin takibi — uygulamanın ana kullanım amacı.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: M001/S06
- Validation: S03 integration tests (13/13 pass) prove rent payment CRUD, auto-generation, late detection (DueDate+5). S06 integration tests prove dashboard aggregates rent payments into income, counts unpaid rent, generates LateRent notifications. Full lifecycle: create tenant → auto-generate payments → mark paid/overdue → see in dashboard + notifications.
- Notes: Gecikme otomatik hesaplanır (ödeme tarihi geçtiğinde).

### R007 — Rezervasyon bazlı gelir kaydı (giriş-çıkış tarihi, gecelik/toplam tutar, platform komisyonu). Manuel giriş.
- Class: primary-user-loop
- Status: validated
- Description: Rezervasyon bazlı gelir kaydı (giriş-çıkış tarihi, gecelik/toplam tutar, platform komisyonu). Manuel giriş.
- Why it matters: Airbnb'den gelen kısa dönem kira gelirinin takibi.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: M001/S06
- Validation: S03 integration tests prove short-term rental CRUD with platform fee, net amount calculation. S06 dashboard integration test proves short-term rental net income aggregated into property financials. Full lifecycle: create reservation → track income → see aggregated in dashboard.
- Notes: Airbnb API erişimi olmadığı için veriler manuel girilecek.

### R008 — Mülk bazlı gider kaydı — bakım, tamir, vergi, sigorta, yönetim ücreti vs. Kategori, tutar, tarih.
- Class: primary-user-loop
- Status: validated
- Description: Mülk bazlı gider kaydı — bakım, tamir, vergi, sigorta, yönetim ücreti vs. Kategori, tutar, tarih.
- Why it matters: Kâr/zarar hesabı için giderlerin takibi şart.
- Source: user
- Primary owning slice: M001/S04
- Supporting slices: M001/S06
- Validation: S04 integration tests (8/8 pass) + browser-verified CRUD: expense create/edit/delete with 6 categories, recurring support, multi-currency (EUR). Group access control tested.
- Notes: Tekrarlayan giderler (aylık/yıllık) ve tek seferlik giderler.

### R009 — Su, elektrik, doğalgaz faturaları — mülk bazlı. Tutar, son ödeme tarihi, ödeme durumu.
- Class: primary-user-loop
- Status: validated
- Description: Su, elektrik, doğalgaz faturaları — mülk bazlı. Tutar, son ödeme tarihi, ödeme durumu.
- Why it matters: Fatura son ödeme tarihlerini kaçırmamak.
- Source: user
- Primary owning slice: M001/S04
- Supporting slices: M001/S06
- Validation: S04 integration tests (8/8 pass) + browser-verified CRUD: bill create/edit/delete with 5 types, due date tracking, mark-as-paid status transition, multi-currency (USD). Group access control tested.
- Notes: Fatura türleri: su, elektrik, doğalgaz, internet, aidat.

### R010 — Dosya yükleme (tapu, sözleşme, sigorta poliçesi vs.), mülke bağlama, kategorize etme, görüntüleme/indirme.
- Class: core-capability
- Status: validated
- Description: Dosya yükleme (tapu, sözleşme, sigorta poliçesi vs.), mülke bağlama, kategorize etme, görüntüleme/indirme.
- Why it matters: Önemli belgelerin tek yerden erişilebilir olması.
- Source: user
- Primary owning slice: M001/S05
- Supporting slices: none
- Validation: S05 integration tests (8/8 pass) prove upload/list/download/delete API contract + extension/content-type validation + cross-group access denial (403). Browser verification proves end-to-end UI flow: upload with category → document table with badges → download → delete with confirmation. Dökümanlar tab in PropertyLayout.
- Notes: Basit dosya yükleme — OCR veya akıllı işleme yok.

### R011 — Mülk bazlı kâr/zarar, toplam gelir, toplam gider, ödenmemiş kiralar, yaklaşan faturalar. Ana ekran.
- Class: primary-user-loop
- Status: validated
- Description: Mülk bazlı kâr/zarar, toplam gelir, toplam gider, ödenmemiş kiralar, yaklaşan faturalar. Ana ekran.
- Why it matters: Uygulamayı açtığında tüm portföyün finansal durumunu tek bakışta görmek.
- Source: user
- Primary owning slice: M001/S06
- Supporting slices: none
- Validation: S06 integration tests (16/16 pass): DashboardAndNotificationTests prove per-property income/expense/profit aggregation by currency, unpaid rent count, upcoming bill count, cross-group access denial (empty response for non-member). Frontend Dashboard page with summary cards per currency + per-property breakdown table. Default route after login is /dashboard.
- Notes: Kullanıcı sadece kendi erişebildiği mülklerin özetini görür.

### R012 — Kira gecikme, fatura son ödeme yaklaşması, sözleşme bitiş tarihi yaklaşması için in-app bildirimler.
- Class: failure-visibility
- Status: validated
- Description: Kira gecikme, fatura son ödeme yaklaşması, sözleşme bitiş tarihi yaklaşması için in-app bildirimler.
- Why it matters: Önemli tarihleri kaçırmamak.
- Source: user
- Primary owning slice: M001/S06
- Supporting slices: none
- Validation: S06 integration tests prove: LateRent (Critical, DueDate+5 threshold), UpcomingBill (Warning, 7-day window), LeaseExpiry (Critical/Warning/Info at 30/60/90 day tiers) notifications generated at query time. Frontend NotificationList page with severity-colored cards. In-app only — email/push deferred to R019.
- Notes: Şimdilik sadece in-app. Email/push bildirimler deferred (R019).

### R013 — Excel/PDF export, vergi raporu, mülk bazlı ROI hesaplama, dönemsel (aylık/yıllık) gelir-gider özeti.
- Class: differentiator
- Status: validated
- Description: Excel/PDF export, vergi raporu, mülk bazlı ROI hesaplama, dönemsel (aylık/yıllık) gelir-gider özeti.
- Why it matters: Muhasebeci ile paylaşım, vergi beyannamesi hazırlığı, yatırım getirisi analizi.
- Source: user
- Primary owning slice: M001/S06
- Supporting slices: none
- Validation: S06 integration tests (9 ReportsTests): profit-loss JSON endpoint with year filtering, Excel export (.xlsx via ClosedXML with correct MIME type), PDF export (via QuestPDF with correct MIME type). Per-property ROI calculation (income - expenses / property value). Frontend export buttons with blob download. Group-based access control on all report endpoints.
- Notes: Mülkler arası karşılaştırma da dahil.

### R014 — TL, USD ve EUR cinsinden kira/gider/fatura kaydı. Para birimi mülk veya işlem bazında seçilebilir.
- Class: core-capability
- Status: validated
- Description: TL, USD ve EUR cinsinden kira/gider/fatura kaydı. Para birimi mülk veya işlem bazında seçilebilir.
- Why it matters: Bazı mülklerde kira dolar veya euro cinsinden alınıyor.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: M001/S03, M001/S04
- Validation: S02 integration test creates properties with TRY/USD/EUR — currency persists correctly. S03 tenant/payment entities carry currency. S04 expense/bill entities carry currency (EUR expense + USD bill tested). S06 dashboard aggregates by currency, no cross-currency summing.
- Notes: Kur dönüşümü şimdilik scope dışı — raporlarda her para birimi ayrı gösterilir.

### R015 — Kiracı bilgileri (isim, telefon, email, TC kimlik), sözleşme başlangıç-bitiş tarihi, depozito bilgisi. Kiracı mülke bağlanır.
- Class: primary-user-loop
- Status: validated
- Description: Kiracı bilgileri (isim, telefon, email, TC kimlik), sözleşme başlangıç-bitiş tarihi, depozito bilgisi. Kiracı mülke bağlanır.
- Why it matters: Kira takibi kiracı bilgisi olmadan eksik kalır.
- Source: inferred
- Primary owning slice: M001/S03
- Supporting slices: none
- Validation: S03 integration tests: tenant CRUD with all fields (name, phone, email, identity number, lease dates, deposit), active tenant enforcement (409 on duplicate), cross-group 403, active/inactive filtering. Frontend TenantList/TenantForm/TenantDetail browser-verified.
- Notes: Uzun dönem kiracılar için zorunlu, kısa dönem için opsiyonel.

### R022 — Kira sözleşmesi bitiş tarihi yaklaştığında hatırlatma. Yapılandırılabilir süre (30/60/90 gün önce).
- Class: failure-visibility
- Status: validated
- Description: Kira sözleşmesi bitiş tarihi yaklaştığında hatırlatma. Yapılandırılabilir süre (30/60/90 gün önce).
- Why it matters: Sözleşme yenileme sürecini zamanında başlatmak.
- Source: research
- Primary owning slice: M001/S06
- Supporting slices: M001/S03
- Validation: S06 integration test Notifications_IncludesLeaseExpiry proves lease expiry notification generated with tiered severity: ≤30 days = Critical, ≤60 days = Warning, ≤90 days = Info. Test uses 25-day-out lease end → Critical severity. Frontend shows severity-colored card.
- Notes: R012 bildirim sistemi ile entegre çalışır.

### R023 — Mülke not/yorum ekleyebilme — bakım geçmişi, önemli bilgiler, hatırlatmalar.
- Class: core-capability
- Status: validated
- Description: Mülke not/yorum ekleyebilme — bakım geçmişi, önemli bilgiler, hatırlatmalar.
- Why it matters: Bir mülk hakkında bilinen ama başka bir modüle sığmayan bilgilerin kaydı.
- Source: research
- Primary owning slice: M001/S02
- Supporting slices: none
- Validation: S02 integration tests: note add 201, update 200, delete 204, list, cross-group denial 403. PropertyNotesController with creator-only edit/delete enforcement. Frontend inline note editing browser-verified on PropertyDetail page.
- Notes: Kronolojik sıralı, tarih damgalı notlar.

### R024 — Yıllık kira artış oranı kaydı, artış geçmişi, bir sonraki artış tarihi hatırlatması.
- Class: primary-user-loop
- Status: validated
- Description: Yıllık kira artış oranı kaydı, artış geçmişi, bir sonraki artış tarihi hatırlatması.
- Why it matters: Türkiye'de kira artışları yasal sınırlarla düzenleniyor — takibi önemli.
- Source: research
- Primary owning slice: M001/S03
- Supporting slices: M001/S06
- Validation: S03 integration tests prove rent increase CRUD with rate/effective date. S06 notification logic includes RentIncreaseApproaching (Info, within 30 days of effective date). Full lifecycle: record increase → see notification when approaching.
- Notes: TÜFE/ÜFE bağlantısı şimdilik yok, sadece manuel oran girişi.

## Active

### R016 — Airbnb CSV import + geçmiş uzun dönem kira ödemelerini toplu yükleme.
- Class: operability
- Status: active
- Description: Airbnb CSV export dosyasını parse edip kısa dönem kiralama kayıtlarına dönüştürme + geçmiş uzun dönem kira ödemelerini Excel/CSV ile toplu import etme.
- Why it matters: 2 yıldır kirada olan evlerin geçmiş verilerini tek tek girmek pratik değil. Airbnb gelir raporu CSV olarak import edilebilmeli.
- Source: user
- Primary owning slice: M003/S03
- Supporting slices: none
- Validation: unmapped
- Notes: R016 kapsamı daraltıldı — sadece Airbnb CSV + geçmiş kira ödemeleri. Gider/fatura import'u şimdilik yok.

### R017 — React Native/Expo ile iOS + Android mobil uygulama. Mevcut backend API'yi kullanan native uygulama.
- Class: core-capability
- Status: active
- Description: React Native/Expo ile iOS + Android mobil uygulama. Dashboard, mülk listesi/detay, kiracı, gider, fatura, döküman, bildirim sayfaları. JWT auth ile mevcut backend'e bağlanır.
- Why it matters: Aile üyeleri telefonda mülk takibi yapabilmeli — masabaşına bağlı kalmadan.
- Source: user
- Primary owning slice: M003/S04
- Supporting slices: M003/S05
- Validation: unmapped
- Notes: Expo managed workflow. EAS Build ile iOS + Android. Mevcut REST API aynen kullanılır.

### R019 — Push notification — kira gecikme, fatura yaklaşma, sözleşme bitiş bildirimleri telefona gelsin.
- Class: failure-visibility
- Status: active
- Description: Expo Push Notifications ile mobil cihaza push bildirim gönderme. Mevcut query-time notification logic'i tetikleyen push akışı.
- Why it matters: Uygulamayı açmadan önemli tarihleri kaçırmamak.
- Source: user
- Primary owning slice: M003/S06
- Supporting slices: none
- Validation: unmapped
- Notes: Backend'de device token kayıt endpoint'i + push gönderme servisi gerekli. Expo Push servisi ücretsiz.

### R025 — Production deploy — Hetzner VPS + domain + HTTPS + Docker Compose.
- Class: operability
- Status: active
- Description: Backend API + frontend + PostgreSQL'in Hetzner VPS'te Docker Compose ile deploy edilmesi. Domain + Let's Encrypt HTTPS. Reverse proxy (Nginx veya Caddy).
- Why it matters: Mobil uygulama için backend'in internetten erişilebilir olması şart. Localhost'ta kalmak mobil geliştirmeyi imkansız kılar.
- Source: inferred
- Primary owning slice: M003/S01
- Supporting slices: none
- Validation: unmapped
- Notes: İlk slice olmalı — mobil uygulama ve import akışları erişilebilir backend gerektirir.

### R026 — Token refresh mekanizması — frontend'de otomatik token yenileme, session kopmaması.
- Class: continuity
- Status: active
- Description: JWT access token expire olduğunda refresh token ile otomatik yenileme. Kullanıcı 15 dakikada login ekranına atılmasın.
- Why it matters: Gerçek kullanımda 15dk session süresi kabul edilemez — veri girerken session kopması veri kaybına yol açar.
- Source: inferred
- Primary owning slice: M003/S02
- Supporting slices: M003/S04
- Validation: unmapped
- Notes: Backend refresh endpoint zaten var (M001/S01). Frontend axios interceptor'da 401 → refresh → retry pattern'ı lazım. Mobil app'te de aynı pattern.

### R027 — Web UI polish — spacing tutarlılığı, responsive iyileştirme, genel görsel kalite artışı.
- Class: quality-attribute
- Status: active
- Description: Mevcut web arayüzünün üstünden geçme — spacing, tipografi, renk tutarlılığı, responsive davranış, loading state'ler, boş durum görselleri.
- Why it matters: M001'de fonksiyon öncelikliydi, artık günlük kullanım için görsel kalite artırılmalı.
- Source: user
- Primary owning slice: M003/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Mevcut tasarım sistemi korunacak (terracotta accent, DM Sans, Playfair Display). Overhaul değil, polish.

## Deferred

### R018 — Multi-tenant mimari, ödeme planları, onboarding akışı.
- Class: core-capability
- Status: deferred
- Description: Multi-tenant mimari, ödeme planları, onboarding akışı.
- Why it matters: Uzun vadeli ticari potansiyel.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Çok ileri — M001 ve M002'den sonra.

## Out of Scope

### R020 — Airbnb API'si ile otomatik rezervasyon/gelir çekme.
- Class: integration
- Status: out-of-scope
- Description: Airbnb API'si ile otomatik rezervasyon/gelir çekme.
- Why it matters: Airbnb API sadece onaylı partnerlere açık (public API yok). Bireysel erişim mümkün değil.
- Source: research
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Kısa dönem kira verileri manuel girilecek (R007).

### R021 — Yüklenen belgelerden otomatik bilgi çıkarma (tapu no, sözleşme tarihi vs.)
- Class: differentiator
- Status: out-of-scope
- Description: Yüklenen belgelerden otomatik bilgi çıkarma (tapu no, sözleşme tarihi vs.)
- Why it matters: Manuel giriş yükünü azaltır ama karmaşıklık ekler.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Kullanıcı basit dosya yüklemeyi tercih etti.

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| R001 | core-capability | validated | M001/S02 | none | S02 integration tests (14/14 pass): property create 201, update 200, delete 204, list with group filter, detail. PropertiesController 5 endpoints with group-based access control. Frontend property list/form/detail pages browser-verified. |
| R002 | core-capability | validated | M001/S01 | M001/S02 | S01 GroupAccessTests (11 tests): cross-group access denial 403, member sees only own groups. S02 PropertyTests (14 tests): group-filtered property listing, cross-group property access 403. GroupAccessService enforces membership on all downstream controllers (S03-S06). |
| R003 | core-capability | validated | M001/S01 | none | S01 integration tests prove superadmin creates groups, sees all groups/users, manages roles, assigns properties, delegates group admin. Superadmin bypass in GroupAccessService confirmed across all 15 controllers. |
| R004 | core-capability | validated | M001/S01 | none | S01 integration tests prove superadmin delegates group admin role, group admin adds members to own group (201), group admin blocked from other groups (403). Role hierarchy enforced in GroupAccessService. |
| R005 | core-capability | validated | M001/S01 | none | S01 AuthTests (7 tests): login returns JWT, register creates user, refresh token rotation (old rejected), change password works, invalid credentials 401, unauthenticated 401, non-superadmin register 403. |
| R006 | primary-user-loop | validated | M001/S03 | M001/S06 | S03 integration tests (13/13 pass) prove rent payment CRUD, auto-generation, late detection (DueDate+5). S06 integration tests prove dashboard aggregates rent payments into income, counts unpaid rent, generates LateRent notifications. Full lifecycle: create tenant → auto-generate payments → mark paid/overdue → see in dashboard + notifications. |
| R007 | primary-user-loop | validated | M001/S03 | M001/S06 | S03 integration tests prove short-term rental CRUD with platform fee, net amount calculation. S06 dashboard integration test proves short-term rental net income aggregated into property financials. Full lifecycle: create reservation → track income → see aggregated in dashboard. |
| R008 | primary-user-loop | validated | M001/S04 | M001/S06 | S04 integration tests (8/8 pass) + browser-verified CRUD: expense create/edit/delete with 6 categories, recurring support, multi-currency (EUR). Group access control tested. |
| R009 | primary-user-loop | validated | M001/S04 | M001/S06 | S04 integration tests (8/8 pass) + browser-verified CRUD: bill create/edit/delete with 5 types, due date tracking, mark-as-paid status transition, multi-currency (USD). Group access control tested. |
| R010 | core-capability | validated | M001/S05 | none | S05 integration tests (8/8 pass) prove upload/list/download/delete API contract + extension/content-type validation + cross-group access denial (403). Browser verification proves end-to-end UI flow: upload with category → document table with badges → download → delete with confirmation. Dökümanlar tab in PropertyLayout. |
| R011 | primary-user-loop | validated | M001/S06 | none | S06 integration tests (16/16 pass): DashboardAndNotificationTests prove per-property income/expense/profit aggregation by currency, unpaid rent count, upcoming bill count, cross-group access denial (empty response for non-member). Frontend Dashboard page with summary cards per currency + per-property breakdown table. Default route after login is /dashboard. |
| R012 | failure-visibility | validated | M001/S06 | none | S06 integration tests prove: LateRent (Critical, DueDate+5 threshold), UpcomingBill (Warning, 7-day window), LeaseExpiry (Critical/Warning/Info at 30/60/90 day tiers) notifications generated at query time. Frontend NotificationList page with severity-colored cards. In-app only — email/push deferred to R019. |
| R013 | differentiator | validated | M001/S06 | none | S06 integration tests (9 ReportsTests): profit-loss JSON endpoint with year filtering, Excel export (.xlsx via ClosedXML with correct MIME type), PDF export (via QuestPDF with correct MIME type). Per-property ROI calculation (income - expenses / property value). Frontend export buttons with blob download. Group-based access control on all report endpoints. |
| R014 | core-capability | validated | M001/S02 | M001/S03, M001/S04 | S02 integration test creates properties with TRY/USD/EUR — currency persists correctly. S03 tenant/payment entities carry currency. S04 expense/bill entities carry currency (EUR expense + USD bill tested). S06 dashboard aggregates by currency, no cross-currency summing. |
| R015 | primary-user-loop | validated | M001/S03 | none | S03 integration tests: tenant CRUD with all fields (name, phone, email, identity number, lease dates, deposit), active tenant enforcement (409 on duplicate), cross-group 403, active/inactive filtering. Frontend TenantList/TenantForm/TenantDetail browser-verified. |
| R016 | operability | active | M003/S03 | none | unmapped |
| R017 | core-capability | active | M003/S04 | M003/S05 | unmapped |
| R018 | core-capability | deferred | none | none | unmapped |
| R019 | failure-visibility | active | M003/S06 | none | unmapped |
| R020 | integration | out-of-scope | none | none | n/a |
| R021 | differentiator | out-of-scope | none | none | n/a |
| R022 | failure-visibility | validated | M001/S06 | M001/S03 | S06 integration test Notifications_IncludesLeaseExpiry proves lease expiry notification generated with tiered severity: ≤30 days = Critical, ≤60 days = Warning, ≤90 days = Info. Test uses 25-day-out lease end → Critical severity. Frontend shows severity-colored card. |
| R023 | core-capability | validated | M001/S02 | none | S02 integration tests: note add 201, update 200, delete 204, list, cross-group denial 403. PropertyNotesController with creator-only edit/delete enforcement. Frontend inline note editing browser-verified on PropertyDetail page. |
| R024 | primary-user-loop | validated | M001/S03 | M001/S06 | S03 integration tests prove rent increase CRUD with rate/effective date. S06 notification logic includes RentIncreaseApproaching (Info, within 30 days of effective date). Full lifecycle: record increase → see notification when approaching. |
| R025 | operability | active | M003/S01 | none | unmapped |
| R026 | continuity | active | M003/S02 | M003/S04 | unmapped |
| R027 | quality-attribute | active | M003/S02 | none | unmapped |

## Coverage Summary

- Active requirements: 6 (R016, R017, R019, R025, R026, R027)
- Mapped to slices: 6
- Validated: 18 (R001–R015, R022–R024)
- Unmapped active requirements: 0
