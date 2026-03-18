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

### R006 — Aylık kira miktarı, ödeme tarihi, ödeme durumu (ödendi/ödenmedi/gecikti). Kira geçmişi.
- Class: primary-user-loop
- Status: active
- Description: Aylık kira miktarı, ödeme tarihi, ödeme durumu (ödendi/ödenmedi/gecikti). Kira geçmişi.
- Why it matters: Kira gelirinin takibi — uygulamanın ana kullanım amacı.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: M001/S06
- Validation: unmapped
- Notes: Gecikme otomatik hesaplanır (ödeme tarihi geçtiğinde).

### R007 — Rezervasyon bazlı gelir kaydı (giriş-çıkış tarihi, gecelik/toplam tutar, platform komisyonu). Manuel giriş.
- Class: primary-user-loop
- Status: active
- Description: Rezervasyon bazlı gelir kaydı (giriş-çıkış tarihi, gecelik/toplam tutar, platform komisyonu). Manuel giriş.
- Why it matters: Airbnb'den gelen kısa dönem kira gelirinin takibi.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: M001/S06
- Validation: unmapped
- Notes: Airbnb API erişimi olmadığı için veriler manuel girilecek.

### R010 — Dosya yükleme (tapu, sözleşme, sigorta poliçesi vs.), mülke bağlama, kategorize etme, görüntüleme/indirme.
- Class: core-capability
- Status: active
- Description: Dosya yükleme (tapu, sözleşme, sigorta poliçesi vs.), mülke bağlama, kategorize etme, görüntüleme/indirme.
- Why it matters: Önemli belgelerin tek yerden erişilebilir olması.
- Source: user
- Primary owning slice: M001/S05
- Supporting slices: none
- Validation: T01 integration tests prove upload/list/download/delete API contract + access control. T02 browser verification proves end-to-end UI flow.
- Notes: Basit dosya yükleme — OCR veya akıllı işleme yok.

### R011 — Mülk bazlı kâr/zarar, toplam gelir, toplam gider, ödenmemiş kiralar, yaklaşan faturalar. Ana ekran.
- Class: primary-user-loop
- Status: active
- Description: Mülk bazlı kâr/zarar, toplam gelir, toplam gider, ödenmemiş kiralar, yaklaşan faturalar. Ana ekran.
- Why it matters: Uygulamayı açtığında tüm portföyün finansal durumunu tek bakışta görmek.
- Source: user
- Primary owning slice: M001/S06
- Supporting slices: none
- Validation: unmapped
- Notes: Kullanıcı sadece kendi erişebildiği mülklerin özetini görür.

### R012 — Kira gecikme, fatura son ödeme yaklaşması, sözleşme bitiş tarihi yaklaşması için in-app bildirimler.
- Class: failure-visibility
- Status: active
- Description: Kira gecikme, fatura son ödeme yaklaşması, sözleşme bitiş tarihi yaklaşması için in-app bildirimler.
- Why it matters: Önemli tarihleri kaçırmamak.
- Source: user
- Primary owning slice: M001/S06
- Supporting slices: none
- Validation: unmapped
- Notes: Şimdilik sadece in-app. Email/push bildirimler deferred (R019).

### R013 — Excel/PDF export, vergi raporu, mülk bazlı ROI hesaplama, dönemsel (aylık/yıllık) gelir-gider özeti.
- Class: differentiator
- Status: active
- Description: Excel/PDF export, vergi raporu, mülk bazlı ROI hesaplama, dönemsel (aylık/yıllık) gelir-gider özeti.
- Why it matters: Muhasebeci ile paylaşım, vergi beyannamesi hazırlığı, yatırım getirisi analizi.
- Source: user
- Primary owning slice: M001/S06
- Supporting slices: none
- Validation: unmapped
- Notes: Mülkler arası karşılaştırma da dahil.

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

### R022 — Kira sözleşmesi bitiş tarihi yaklaştığında hatırlatma. Yapılandırılabilir süre (30/60/90 gün önce).
- Class: failure-visibility
- Status: active
- Description: Kira sözleşmesi bitiş tarihi yaklaştığında hatırlatma. Yapılandırılabilir süre (30/60/90 gün önce).
- Why it matters: Sözleşme yenileme sürecini zamanında başlatmak.
- Source: research
- Primary owning slice: M001/S06
- Supporting slices: M001/S03
- Validation: unmapped
- Notes: R012 bildirim sistemi ile entegre çalışır.

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

### R024 — Yıllık kira artış oranı kaydı, artış geçmişi, bir sonraki artış tarihi hatırlatması.
- Class: primary-user-loop
- Status: active
- Description: Yıllık kira artış oranı kaydı, artış geçmişi, bir sonraki artış tarihi hatırlatması.
- Why it matters: Türkiye'de kira artışları yasal sınırlarla düzenleniyor — takibi önemli.
- Source: research
- Primary owning slice: M001/S03
- Supporting slices: M001/S06
- Validation: unmapped
- Notes: TÜFE/ÜFE bağlantısı şimdilik yok, sadece manuel oran girişi.

## Validated

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
| R006 | primary-user-loop | active | M001/S03 | M001/S06 | unmapped |
| R007 | primary-user-loop | active | M001/S03 | M001/S06 | unmapped |
| R008 | primary-user-loop | validated | M001/S04 | M001/S06 | S04 integration tests (8/8 pass) + browser-verified CRUD: expense create/edit/delete with 6 categories, recurring support, multi-currency (EUR). Group access control tested. |
| R009 | primary-user-loop | validated | M001/S04 | M001/S06 | S04 integration tests (8/8 pass) + browser-verified CRUD: bill create/edit/delete with 5 types, due date tracking, mark-as-paid status transition, multi-currency (USD). Group access control tested. |
| R010 | core-capability | active | M001/S05 | none | T01 integration tests prove upload/list/download/delete API contract + access control. T02 browser verification proves end-to-end UI flow. |
| R011 | primary-user-loop | active | M001/S06 | none | unmapped |
| R012 | failure-visibility | active | M001/S06 | none | unmapped |
| R013 | differentiator | active | M001/S06 | none | unmapped |
| R014 | core-capability | active | M001/S02 | M001/S03, M001/S04 | unmapped |
| R015 | primary-user-loop | active | M001/S03 | none | unmapped |
| R016 | operability | deferred | none | none | unmapped |
| R017 | core-capability | deferred | none | none | unmapped |
| R018 | core-capability | deferred | none | none | unmapped |
| R019 | failure-visibility | deferred | none | none | unmapped |
| R020 | integration | out-of-scope | none | none | n/a |
| R021 | differentiator | out-of-scope | none | none | n/a |
| R022 | failure-visibility | active | M001/S06 | M001/S03 | unmapped |
| R023 | core-capability | active | M001/S02 | none | unmapped |
| R024 | primary-user-loop | active | M001/S03 | M001/S06 | unmapped |

## Coverage Summary

- Active requirements: 16
- Mapped to slices: 16
- Validated: 2 (R008, R009)
- Unmapped active requirements: 0
