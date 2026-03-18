# Requirements

This file is the explicit capability and coverage contract for the project.

## Active

### R001 — Mülk ekleme, düzenleme, silme, detay görüntüleme. Her mülk bir gruba atanır.
- Class: core-capability
- Status: active
- Description: Mülk ekleme, düzenleme, silme, detay görüntüleme. Her mülk bir gruba atanır.
- Why it matters: Sistemin temel veri birimi — her şey mülk etrafında dönüyor.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Mülk tipi (daire, ev, dükkan vs.), konum, metrekare gibi temel bilgiler.

### R002 — Mülkler gruplara atanır, kullanıcılar gruplara eklenir. Kullanıcı sadece kendi gruplarındaki mülkleri görür. Bir kullanıcı birden fazla grupta olabilir.
- Class: core-capability
- Status: active
- Description: Mülkler gruplara atanır, kullanıcılar gruplara eklenir. Kullanıcı sadece kendi gruplarındaki mülkleri görür. Bir kullanıcı birden fazla grupta olabilir.
- Why it matters: Aile içi kullanımda herkes sadece ilgili mülkleri görmeli.
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: M001/S02
- Validation: unmapped
- Notes: Grup örnekleri: "Aile" (ben + babam), "Geniş Aile" (ben + babam + kuzenim).

### R003 — Superadmin rolü tüm mülkleri, tüm grupları, tüm kullanıcıları görür ve yönetir.
- Class: core-capability
- Status: active
- Description: Superadmin rolü tüm mülkleri, tüm grupları, tüm kullanıcıları görür ve yönetir.
- Why it matters: Tek bir kişinin (mal sahibi) tam kontrol sahibi olması.
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: none
- Validation: unmapped
- Notes: İlk kullanıcı otomatik superadmin olur.

### R004 — Superadmin başka bir kullanıcıyı grup admini yapabilir. Grup admini kendi grubuna kullanıcı ekleyebilir ve mülk atayabilir.
- Class: core-capability
- Status: active
- Description: Superadmin başka bir kullanıcıyı grup admini yapabilir. Grup admini kendi grubuna kullanıcı ekleyebilir ve mülk atayabilir.
- Why it matters: Baban gibi güvenilen biri kendi grubunu yönetebilmeli.
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Superadmin > Grup Admin > Üye hiyerarşisi. Grup içi herkes eşit erişime sahip.

### R005 — Email ve şifre ile login. JWT token tabanlı API authentication.
- Class: core-capability
- Status: active
- Description: Email ve şifre ile login. JWT token tabanlı API authentication.
- Why it matters: Kullanıcı kimlik doğrulaması — erişim kontrolünün temeli.
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Refresh token mekanizması dahil.

### R014 — TL, USD ve EUR cinsinden kira/gider/fatura kaydı. Para birimi mülk veya işlem bazında seçilebilir.
- Class: core-capability
- Status: active
- Description: TL, USD ve EUR cinsinden kira/gider/fatura kaydı. Para birimi mülk veya işlem bazında seçilebilir.
- Why it matters: Bazı mülklerde kira dolar veya euro cinsinden alınıyor.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: M001/S03, M001/S04
- Validation: unmapped
- Notes: Kur dönüşümü şimdilik scope dışı — raporlarda her para birimi ayrı gösterilir.

### R015 — Kiracı bilgileri (isim, telefon, email, TC kimlik), sözleşme başlangıç-bitiş tarihi, depozito bilgisi. Kiracı mülke bağlanır.
- Class: primary-user-loop
- Status: active
- Description: Kiracı bilgileri (isim, telefon, email, TC kimlik), sözleşme başlangıç-bitiş tarihi, depozito bilgisi. Kiracı mülke bağlanır.
- Why it matters: Kira takibi kiracı bilgisi olmadan eksik kalır.
- Source: inferred
- Primary owning slice: M001/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Uzun dönem kiracılar için zorunlu, kısa dönem için opsiyonel.

### R023 — Mülke not/yorum ekleyebilme — bakım geçmişi, önemli bilgiler, hatırlatmalar.
- Class: core-capability
- Status: active
- Description: Mülke not/yorum ekleyebilme — bakım geçmişi, önemli bilgiler, hatırlatmalar.
- Why it matters: Bir mülk hakkında bilinen ama başka bir modüle sığmayan bilgilerin kaydı.
- Source: research
- Primary owning slice: M001/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Kronolojik sıralı, tarih damgalı notlar.

## Validated

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

## Deferred

### R016 — Mevcut Excel/Google Sheets verilerini uygulamaya import etme.
- Class: operability
- Status: deferred
- Description: Mevcut Excel/Google Sheets verilerini uygulamaya import etme.
- Why it matters: Mevcut verilerin taşınması zaman kazandırır.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: M001 tamamlandıktan sonra değerlendirilecek.

### R017 — Native iOS/Android uygulama. Ayrı frontend + backend API mimarisi bunu kolaylaştırır.
- Class: core-capability
- Status: deferred
- Description: Native iOS/Android uygulama. Ayrı frontend + backend API mimarisi bunu kolaylaştırır.
- Why it matters: Hareket halinde mülk takibi.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Web app öncelikli. Mobil ilerde.

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

### R019 — In-app bildirimlerin yanı sıra email ve/veya push notification.
- Class: failure-visibility
- Status: deferred
- Description: In-app bildirimlerin yanı sıra email ve/veya push notification.
- Why it matters: Uygulamayı açmadan da önemli bildirimleri almak.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: M001'de sadece in-app bildirim (R012).

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
| R001 | core-capability | active | M001/S02 | none | unmapped |
| R002 | core-capability | active | M001/S01 | M001/S02 | unmapped |
| R003 | core-capability | active | M001/S01 | none | unmapped |
| R004 | core-capability | active | M001/S01 | none | unmapped |
| R005 | core-capability | active | M001/S01 | none | unmapped |
| R006 | primary-user-loop | validated | M001/S03 | M001/S06 | S03 integration tests (13/13 pass) prove rent payment CRUD, auto-generation, late detection (DueDate+5). S06 integration tests prove dashboard aggregates rent payments into income, counts unpaid rent, generates LateRent notifications. Full lifecycle: create tenant → auto-generate payments → mark paid/overdue → see in dashboard + notifications. |
| R007 | primary-user-loop | validated | M001/S03 | M001/S06 | S03 integration tests prove short-term rental CRUD with platform fee, net amount calculation. S06 dashboard integration test proves short-term rental net income aggregated into property financials. Full lifecycle: create reservation → track income → see aggregated in dashboard. |
| R008 | primary-user-loop | validated | M001/S04 | M001/S06 | S04 integration tests (8/8 pass) + browser-verified CRUD: expense create/edit/delete with 6 categories, recurring support, multi-currency (EUR). Group access control tested. |
| R009 | primary-user-loop | validated | M001/S04 | M001/S06 | S04 integration tests (8/8 pass) + browser-verified CRUD: bill create/edit/delete with 5 types, due date tracking, mark-as-paid status transition, multi-currency (USD). Group access control tested. |
| R010 | core-capability | validated | M001/S05 | none | S05 integration tests (8/8 pass) prove upload/list/download/delete API contract + extension/content-type validation + cross-group access denial (403). Browser verification proves end-to-end UI flow: upload with category → document table with badges → download → delete with confirmation. Dökümanlar tab in PropertyLayout. |
| R011 | primary-user-loop | validated | M001/S06 | none | S06 integration tests (16/16 pass): DashboardAndNotificationTests prove per-property income/expense/profit aggregation by currency, unpaid rent count, upcoming bill count, cross-group access denial (empty response for non-member). Frontend Dashboard page with summary cards per currency + per-property breakdown table. Default route after login is /dashboard. |
| R012 | failure-visibility | validated | M001/S06 | none | S06 integration tests prove: LateRent (Critical, DueDate+5 threshold), UpcomingBill (Warning, 7-day window), LeaseExpiry (Critical/Warning/Info at 30/60/90 day tiers) notifications generated at query time. Frontend NotificationList page with severity-colored cards. In-app only — email/push deferred to R019. |
| R013 | differentiator | validated | M001/S06 | none | S06 integration tests (9 ReportsTests): profit-loss JSON endpoint with year filtering, Excel export (.xlsx via ClosedXML with correct MIME type), PDF export (via QuestPDF with correct MIME type). Per-property ROI calculation (income - expenses / property value). Frontend export buttons with blob download. Group-based access control on all report endpoints. |
| R014 | core-capability | active | M001/S02 | M001/S03, M001/S04 | unmapped |
| R015 | primary-user-loop | active | M001/S03 | none | unmapped |
| R016 | operability | deferred | none | none | unmapped |
| R017 | core-capability | deferred | none | none | unmapped |
| R018 | core-capability | deferred | none | none | unmapped |
| R019 | failure-visibility | deferred | none | none | unmapped |
| R020 | integration | out-of-scope | none | none | n/a |
| R021 | differentiator | out-of-scope | none | none | n/a |
| R022 | failure-visibility | validated | M001/S06 | M001/S03 | S06 integration test Notifications_IncludesLeaseExpiry proves lease expiry notification generated with tiered severity: ≤30 days = Critical, ≤60 days = Warning, ≤90 days = Info. Test uses 25-day-out lease end → Critical severity. Frontend shows severity-colored card. |
| R023 | core-capability | active | M001/S02 | none | unmapped |
| R024 | primary-user-loop | validated | M001/S03 | M001/S06 | S03 integration tests prove rent increase CRUD with rate/effective date. S06 notification logic includes RentIncreaseApproaching (Info, within 30 days of effective date). Full lifecycle: record increase → see notification when approaching. |

## Coverage Summary

- Active requirements: 8
- Mapped to slices: 8
- Validated: 10 (R006, R007, R008, R009, R010, R011, R012, R013, R022, R024)
- Unmapped active requirements: 0
