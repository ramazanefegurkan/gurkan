# M001: Gayrimenkul Portföy Yönetimi

**Gathered:** 2026-03-18
**Status:** Ready for planning

## Project Description

Aile içi kullanıma yönelik bir gayrimenkul portföy yönetim web uygulaması. Mülklerin kira gelirlerini, giderlerini, faturalarını ve dökümanlarını takip eder. Grup bazlı erişim modeli ile aile üyeleri sadece kendilerine atanmış mülkleri görür. Uzun dönem (aylık kira sözleşmeleri) ve kısa dönem (Airbnb-style, gecelik/haftalık) kiralamaları destekler.

## Why This Milestone

Mevcut spreadsheet tabanlı takip yetersiz — birden fazla mülk, birden fazla kullanıcı, farklı para birimleri ve farklı kiralama modelleri var. Tek bir uygulamadan tüm portföyü yönetmek, ödeme takibini otomatikleştirmek ve raporlama yapabilmek temel ihtiyaç.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Login olup kendi grubundaki mülkleri görebilir, kira/gider/fatura/döküman kaydı yapabilir
- Dashboard'dan tüm portföyün finansal özetini görebilir
- Yaklaşan kira ödemeleri, fatura son ödeme tarihleri ve sözleşme bitişleri için bildirim alabilir
- Excel/PDF olarak rapor export edebilir

### Entry point / environment

- Entry point: Web browser — http://localhost:5173 (frontend), http://localhost:5000 (backend API)
- Environment: Local dev → self-hosted VPS (Docker)
- Live dependencies involved: PostgreSQL database

## Completion Class

- Contract complete means: Tüm API endpoint'leri çalışıyor, auth + erişim kontrolü doğru, CRUD operasyonları test edilmiş
- Integration complete means: Frontend backend'le iletişim kuruyor, dosya yükleme çalışıyor, dashboard gerçek veri gösteriyor
- Operational complete means: Docker ile deploy edilebilir durumda (opsiyonel — M001'de lokal dev yeterli)

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- Superadmin login olur, grup oluşturur, kullanıcı ekler, mülk atar → üye login olduğunda sadece kendi mülklerini görür
- Bir mülke uzun dönem kira, gider, fatura kaydı yapılır → dashboard'da doğru kâr/zarar gösterilir
- Kira geciktiğinde bildirim oluşur, sözleşme bitiş yaklaştığında hatırlatma çıkar
- Excel/PDF rapor export edilir ve gerçek veriyi yansıtır

## Risks and Unknowns

- Dosya yükleme storage stratejisi — lokal filesystem mi, object storage mi. Başlangıçta lokal filesystem, deploy'da volume mount ile çözülür.
- Multi-currency raporlama karmaşıklığı — kur dönüşümü yapmadan her para birimi ayrı gösterilecek, bu basitleştirir.
- ASP.NET Core + React ayrı projeler olarak Docker compose ile orchestration — standart pattern ama ilk setup'ta dikkat gerekiyor.

## Existing Codebase / Prior Art

- Greenfield proje — mevcut kod yok.
- Mevcut veriler spreadsheet'lerde — M001'de import yok, R016 olarak deferred.

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- R001-R015, R022-R024 — tüm active requirements bu milestone'da karşılanıyor
- R016 (import) — deferred, M001 sonrası
- R017-R019 — deferred, gelecek milestone'lar

## Scope

### In Scope

- Auth sistemi (email + şifre, JWT, refresh token)
- Rol ve erişim yönetimi (superadmin, grup admin, üye)
- Grup oluşturma, kullanıcı atama, mülk atama
- Mülk CRUD (tip, konum, detaylar, notlar)
- Uzun dönem kira takibi (aylık ödeme, gecikme, kira artışı)
- Kısa dönem kira takibi (rezervasyon bazlı gelir)
- Kiracı yönetimi
- Gider takibi (kategorize, tekrarlayan + tek seferlik)
- Fatura takibi (su, elektrik, doğalgaz, internet, aidat)
- Döküman yükleme ve yönetimi (tapu, sözleşme, sigorta)
- Finansal dashboard
- In-app bildirim sistemi
- Raporlama + export (Excel/PDF, vergi raporu, ROI)
- Multi-currency (TL, USD, EUR)

### Out of Scope / Non-Goals

- Airbnb API entegrasyonu (R020 — partner-only erişim)
- OCR / akıllı döküman işleme (R021)
- Spreadsheet import (R016 — deferred)
- Mobil app (R017 — deferred)
- Email/push bildirimler (R019 — deferred, sadece in-app)
- SaaS multi-tenancy (R018 — deferred)
- Kur dönüşümü (raporlarda her para birimi ayrı gösterilir)

## Technical Constraints

- ASP.NET Core Web API — controller-based, EF Core + PostgreSQL
- React + Vite + TypeScript — SPA frontend
- JWT authentication with refresh tokens
- Dosya storage: lokal filesystem (production'da volume mount)
- Docker Compose ile orchestration (API + frontend + PostgreSQL)

## Integration Points

- PostgreSQL — tek veritabanı, tüm modüller aynı DB'yi kullanır
- Dosya sistemi — döküman yükleme/indirme
- Frontend ↔ Backend — REST API üzerinden JSON, JWT auth header

## Open Questions

- Dashboard'da mülkler arası karşılaştırma nasıl görünsün — bar chart, tablo, her ikisi? Execution sırasında karar verilecek.
- Bildirim zamanlaması — uygulama açıldığında mı kontrol edilsin, yoksa background job ile periyodik mi? Başlangıçta açılışta kontrol, gerekirse background job eklenebilir.
