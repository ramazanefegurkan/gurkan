---
id: S04
milestone: M001
status: ready
---

# S04: Gider & Fatura Takibi — Context

<!-- Slice-scoped context. Milestone-only sections (acceptance criteria, completion class,
     milestone sequence) do not belong here — those live in the milestone context. -->

## Goal

Mülk bazlı gider ve fatura kaydı, ödeme durumu takibi, fatura gecikme algılama, tekrarlayan gider/fatura hatırlatma mekanizması çalışır; S06 dashboard ve raporlama bu verileri kullanır.

## Why this Slice

S02'nin ürettiği Property entity ve erişim kontrolü üzerine kurulur. Kâr/zarar hesabı için kira gelirinin yanında gider ve fatura takibi de gerekli. S06 (dashboard, bildirimler, raporlama) Expense ve Bill entity'lerine bağımlı. S03 ile paralel olarak S02'ye bağımlı ama birbirinden bağımsız çalışır.

## Scope

### In Scope

- Gider ve fatura ayrı entity'ler olarak takip edilir — ayrı listeler, ayrı formlar
- **Giderler (Expense):** tek seferlik veya tekrarlayan harcamalar
  - Gider kategorileri sabit liste: bakım/tamir, vergi, sigorta, yönetim ücreti, tadilat, diğer
  - Gider alanları: kategori, tutar, tarih, açıklama, para birimi (TL/USD/EUR)
  - Gider silinebilir (hard delete — yanlış giriş düzeltmesi için)
  - Tekrarlayan gider tanımı: isim, kategori, periyot (aylık/yıllık) — tutar her dönem değişebileceği için otomatik kayıt oluşmaz, sadece hatırlatma yapılır
- **Faturalar (Bill):** periyodik tüketim faturaları
  - Fatura tipleri sabit liste: su, elektrik, doğalgaz, internet, aidat (5 tip)
  - Fatura alanları: tip, tutar, son ödeme tarihi, ödeme tarihi, ödeme durumu, açıklama, para birimi
  - Fatura ödeme durumu: ödenmedi / ödendi / gecikmiş
  - Fatura gecikme: son ödeme tarihi geçtiği an otomatik "gecikmiş" — tolerans süresi yok (kiradan farklı)
  - Fatura silinebilir (hard delete)
  - Tekrarlayan fatura tanımı: tip, periyot — her dönem hatırlatma, kullanıcı tutarla birlikte yeni kayıt girer
- Tüm gider ve faturalar mülk sahibi tarafından ödeniyor olarak kabul edilir — "ödeyen taraf" alanı yok
- Gider ve faturalarda ödeme yöntemi kaydedilmez — sadece ödendi/ödenmedi durumu
- Tek tek giriş — toplu giriş desteği yok
- Frontend — mülk detay sayfasındaki "Giderler" tab'ı: tek tab içinde iki bölüm (Giderler ve Faturalar), tablo formatında
- Frontend — gider ekleme/düzenleme formu
- Frontend — fatura ekleme/düzenleme formu
- Frontend — tekrarlayan gider/fatura tanımlama

### Out of Scope

- Ödeme yöntemi kaydı (gider/faturalarda) — sadece ödendi/ödenmedi durumu yeterli (kiradaki gibi detay gerekmiyor)
- Ödeyen taraf ayrımı (kiracı vs mülk sahibi) — hep mülk sahibi kabul edilir
- Toplu gider/fatura girişi — tek tek girilir
- Kısmi ödeme — ya tam ödendi ya ödenmedi
- Gider/fatura arşivleme — silinebilir (hard delete)
- Kullanıcı tanımlı gider kategorileri — sabit liste
- Kullanıcı tanımlı fatura tipleri — sabit 5 tip
- Otomatik tekrarlayan kayıt oluşturma — tutar her dönem değişebileceği için sadece hatırlatma, kullanıcı manuel girer
- Faturada tolerans süresi — son ödeme tarihi geçtiği an gecikmiş

## Constraints

- Para birimi işlem bazında seçilir (S02 kararı ile uyumlu) — her gider ve fatura kaydında currency alanı bulunur
- Gider kategorileri sabit enum: bakım/tamir, vergi, sigorta, yönetim ücreti, tadilat, diğer
- Fatura tipleri sabit enum: su, elektrik, doğalgaz, internet, aidat
- Tekrarlayan gider/fatura mekanizması: tanım oluşturulur (isim, kategori/tip, periyot), her dönemde S06 bildirim sistemi hatırlatır, kullanıcı tutarla birlikte yeni kayıt girer — otomatik kayıt oluşmaz çünkü tutarlar değişir
- Fatura gecikme algılama: son ödeme tarihi geçtiği an "gecikmiş" — kiradan farklı olarak tolerans süresi yok (fatura tarihler net)
- S02'den gelen Property access check service kullanılmalı — kullanıcı sadece kendi gruplarındaki mülklerin gider ve faturalarını görebilir
- Mülk detay sayfasındaki tab yapısı S02'de kuruldu — S04 "Giderler" tab içeriğini dolduracak (tek tab, iki bölüm)

## Integration Points

### Consumes

- `Property` entity + access check service — S02'den, mülke erişim kontrolü
- `PropertyGroup` join entity — S02'den, çoklu grup desteği
- JWT middleware — S01'den, endpoint koruması
- Mülk detay sayfası tab yapısı — S02'den, "Giderler" tab'ını dolduracak
- Frontend layout (sidebar + responsive) — S02'den

### Produces

- `ExpensesController` → CRUD /api/properties/{id}/expenses
- `BillsController` → CRUD /api/properties/{id}/bills
- `RecurringDefinitionsController` → CRUD /api/properties/{id}/recurring-definitions (tekrarlayan tanımlar)
- `Expense` entity → Id, PropertyId, Category (enum), Amount, Date, Description, Currency, IsRecurring, RecurringDefinitionId (nullable)
- `Bill` entity → Id, PropertyId, Type (enum), Amount, DueDate, PaidDate, Status (pending/paid/overdue), Description, Currency, IsRecurring, RecurringDefinitionId (nullable)
- `RecurringDefinition` entity → Id, PropertyId, Name, Category/Type, Period (monthly/yearly), Kind (expense/bill), IsActive
- Frontend "Giderler" tab içeriği — iki bölüm: gider tablosu + fatura tablosu
- Frontend gider/fatura ekleme formları
- Frontend tekrarlayan tanım yönetimi

## Open Questions

- Gider kategorileri listesinin yeterliliği (bakım/tamir, vergi, sigorta, yönetim ücreti, tadilat, diğer — başka gerekli kategori var mı?) — execution sırasında bu liste ile başlanır.
- Tekrarlayan tanım periyotları (aylık ve yıllık yeterli mi, 3 aylık/6 aylık da gerekir mi?) — başlangıçta aylık ve yıllık, gerekirse genişletilir.
- Gider/fatura listesinde varsayılan sıralama ve filtreleme seçenekleri — execution sırasında karar verilir (muhtemelen tarih bazlı azalan sıra).
- Tekrarlayan hatırlatma bildirim zamanlaması (kaç gün önceden?) — S06 bildirim sistemi ile birlikte karar verilir.
