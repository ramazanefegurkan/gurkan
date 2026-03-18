---
id: S06
milestone: M001
status: ready
---

# S06: Dashboard, Bildirimler & Raporlama — Context

<!-- Slice-scoped context. Milestone-only sections (acceptance criteria, completion class,
     milestone sequence) do not belong here — those live in the milestone context. -->

## Goal

Finansal dashboard (özet kartlar + mülk bazlı kâr/zarar tablosu), background job ile bildirim oluşturma (kira gecikme, fatura yaklaşma, sözleşme bitiş, kira artışı, tekrarlayan gider/fatura hatırlatma), raporlama (kâr/zarar, dönemsel özet, vergi raporu, ROI) ve Excel/PDF export çalışır; kullanıcı sadece kendi mülklerinin verilerini görür.

## Why this Slice

Son slice — S03 (kira/kiracı) ve S04 (gider/fatura) verilerini tüketir. Dashboard, bildirimler ve raporlama portföy yönetiminin ana değer önerisi: tüm veriyi anlamlı bir özete dönüştürme. Bu slice tamamlandığında milestone'ın tüm acceptance senaryoları karşılanır.

## Scope

### In Scope

- **Dashboard:**
  - Özet kartlar: toplam gelir, toplam gider, net kâr/zarar, ödenmemiş kiralar, yaklaşan faturalar
  - Mülk bazlı kâr/zarar tablosu: her mülk için gelir, gider, net durum
  - Multi-currency gösterim: her para birimi ayrı gösterilir (ör. "50.000 TL | 3.200 USD | 1.800 EUR") — kur dönüşümü yok (D007)
  - Dönem seçimi: hazır dönemler (bu ay, son 3 ay, son 6 ay, son 1 yıl) + özel tarih aralığı
  - Dashboard login sonrası ana sayfa olarak açılır
  - Grup bazlı erişim: kullanıcı sadece kendi gruplarındaki mülklerin verilerini görür, superadmin tüm verileri görür

- **Bildirimler:**
  - Background job ile periyodik kontrol (ör. günlük) — bildirimler veritabanına yazılır
  - Bildirim türleri (tam liste):
    - Kira gecikme: ödeme tarihi + tolerans süresi geçmiş ödemeler
    - Fatura son ödeme yaklaşma: son ödeme tarihine X gün kala
    - Sözleşme bitiş yaklaşma: bitiş tarihine X gün kala
    - Kira artış hatırlatma: artış tarihine X gün kala
    - Tekrarlayan gider/fatura hatırlatma: dönem başlangıcına X gün kala
  - Bildirim süreleri: sabit varsayılanlar (sözleşme bitiş: 30 gün, fatura yaklaşma: 7 gün, tekrarlayan hatırlatma: 7 gün, kira artışı: 30 gün) — kullanıcı isterse ayarlayabilir
  - Bildirim UX: sidebar'da bildirim ikonu + okunmamış sayı badge'ı, tıklayınca bildirim listesi sayfası açılır
  - Okunmuş/okunmamış durumu
  - Bildirimler grup bazlı — kullanıcı sadece kendi mülkleriyle ilgili bildirimleri görür

- **Raporlama:**
  - Mülk bazlı kâr/zarar raporu: seçilen dönemde gelir vs gider detayı
  - Dönemsel (aylık/yıllık) gelir-gider özeti: tüm portföy veya mülk bazlı
  - Vergi raporu: yıllık gider toplamı kategorize edilmiş (muhasebeci ile paylaşım için)
  - Mülk bazlı ROI hesaplama: ROI = (Toplam Net Gelir / Alım Fiyatı) x 100 — basit formül
  - Export formatları: Excel (.xlsx) ve PDF
  - Dönem seçimi: raporlarda da hazır dönemler + özel tarih aralığı
  - Multi-currency: raporlarda her para birimi ayrı sütun/bölüm olarak gösterilir

### Out of Scope

- Kur dönüşümü — raporlarda her para birimi ayrı gösterilir (D007)
- Grafik/chart dashboard'da — sadece özet kartlar ve mülk tablosu, chart yok (ileride eklenebilir)
- Email/push bildirimler — sadece in-app (R019 deferred)
- Mülkler arası karşılaştırma grafiği — tablo formatında, grafik yok
- Yıllık ROI — sadece toplam ROI (Toplam Net Gelir / Alım Fiyatı)
- Bildirim silme — bildirimler okundu olarak işaretlenir ama silinmez
- Gerçek zamanlı bildirim (WebSocket/SSE) — sayfa yenilendiğinde güncel liste yeterli

## Constraints

- Multi-currency: kur dönüşümü yok (D007), her para birimi ayrı gösterilir — dashboard kartlarında, mülk tablosunda ve raporlarda ayrı satır/sütun
- Background job bildirim sistemi: veritabanına Notification entity yazılır, frontend GET ile çeker — gerçek zamanlı push yok
- Bildirim süreleri yapılandırılabilir: varsayılan değerlerle başlanır, kullanıcı isterse ayarlayabilir (settings sayfası veya admin panelinden)
- ROI hesaplama: S02'deki PurchasePrice alanına bağımlı — alım fiyatı girilmemiş mülklerde ROI hesaplanamaz
- S03'ten gelen kira gecikme tolerans süresi bildirim oluşturmada kullanılmalı
- S04'ten gelen tekrarlayan gider/fatura tanımları bildirim oluşturmada kullanılmalı
- Dashboard login sonrası varsayılan sayfa — sidebar'da ilk menü öğesi
- Tüm veriler grup bazlı erişim kontrolüne tabi — superadmin hariç

## Integration Points

### Consumes

- `Tenant` entity + `RentPayment` entity — S03'ten, kira geliri ve gecikme verileri
- `ShortTermRental` entity — S03'ten, kısa dönem kira geliri
- `RentIncrease` entity — S03'ten, kira artış tarihleri (hatırlatma için)
- `Expense` entity — S04'ten, gider verileri
- `Bill` entity — S04'ten, fatura verileri ve gecikme durumu
- `RecurringDefinition` entity — S04'ten, tekrarlayan tanımlar (hatırlatma için)
- `Property` entity + access check service — S02'den, mülk bilgileri ve erişim kontrolü
- `PropertyGroup` join entity — S02'den, çoklu grup desteği
- JWT middleware — S01'den, endpoint koruması
- Frontend layout (sidebar + responsive) — S02'den

### Produces

- `DashboardController` → GET /api/dashboard (aggregated financial summary, dönem parametreli)
- `NotificationsController` → GET /api/notifications (kullanıcının bildirimleri), PATCH /api/notifications/{id}/read (okundu işaretleme)
- `ReportsController` → GET /api/reports/profit-loss, GET /api/reports/summary, GET /api/reports/tax, GET /api/reports/roi, GET /api/reports/export (Excel/PDF, format + dönem parametreli)
- `NotificationSettingsController` → GET/PUT /api/notification-settings (bildirim süresi ayarları)
- `Notification` entity → Id, UserId, PropertyId, Type (enum), Title, Message, IsRead, CreatedAt
- `NotificationSettings` entity → Id, UserId, LeaseExpiryDays, BillDueDays, RentIncreaseDays, RecurringReminderDays
- Background job/service → periyodik bildirim oluşturma logic
- Frontend dashboard sayfası — özet kartlar + mülk kâr/zarar tablosu + dönem seçici
- Frontend bildirim listesi sayfası + sidebar bildirim ikonu/badge
- Frontend rapor sayfası — rapor tipi seçimi, dönem seçimi, export butonları
- Frontend bildirim ayarları (basit form)

## Open Questions

- Background job implementasyonu (hosted service mi, Hangfire gibi library mi?) — execution/research sırasında karar verilir, muhtemelen basit IHostedService ile başlanır.
- PDF export kütüphanesi — execution/research sırasında karar verilir.
- Excel export kütüphanesi — execution/research sırasında karar verilir (muhtemelen ClosedXML veya EPPlus).
- Dashboard'da varsayılan dönem (bu ay mı, son 1 yıl mı?) — execution sırasında karar verilir, muhtemelen "bu ay" varsayılan.
- Bildirim oluşturma periyodu (günlük mı, saatlik mi?) — başlangıçta günlük, gerekirse sıklaştırılır.
- Bildirim ayarlarının kapsamı (global mi, kullanıcı bazlı mı?) — kullanıcı bazlı tercih edilir ama başlangıçta global varsayılanlarla başlanabilir.
