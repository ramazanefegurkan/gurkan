---
id: S03
milestone: M001
status: ready
---

# S03: Kira & Kiracı Takibi — Context

<!-- Slice-scoped context. Milestone-only sections (acceptance criteria, completion class,
     milestone sequence) do not belong here — those live in the milestone context. -->

## Goal

Uzun dönem kiracı kaydı, otomatik aylık ödeme oluşturma, gecikme algılama (tolerans süresi ile), kira artış hatırlatması, kısa dönem rezervasyon kaydı ve geçmiş kiracı arşivi çalışır; S06 dashboard ve raporlama bu verileri kullanır.

## Why this Slice

S02'nin ürettiği Property entity ve erişim kontrolü üzerine kurulur. Kira geliri uygulamanın ana kullanım amacı — ödeme takibi, gecikme algılama ve kira artış yönetimi burada çözülür. S06 (dashboard, bildirimler, raporlama) Tenant, RentPayment, ShortTermRental ve RentIncrease entity'lerine bağımlı.

## Scope

### In Scope

- Kiracı CRUD: isim, telefon, email, TC kimlik
- Kiracı sözleşme bilgileri: başlangıç tarihi, bitiş tarihi, aylık kira tutarı, depozito tutarı (bilgi amaçlı, iade takibi yok), para birimi (işlem bazında — TL/USD/EUR)
- Tek aktif kiracı kuralı: bir mülkte aynı anda sadece bir aktif kiracı olabilir; yeni kiracı eklemek için eskinin sözleşmesinin bitmesi veya sonlandırılması gerekir
- Otomatik ödeme oluşturma: kiracı kaydedildiğinde sözleşme süresi boyunca aylık ödeme kayıtları otomatik oluşur
- Ödeme durumu: ödendi / ödenmedi / gecikmiş (otomatik algılama)
- Ödeme yöntemi kaydı: nakit, havale/EFT, çek
- Kısmi ödeme yok — ya tam ödendi ya ödenmedi
- Ödeme kaydetme: kullanıcı ödemeyi "ödendi" olarak işaretler (ödeme tarihi ve yöntemi seçer)
- Gecikme algılama: yapılandırılabilir tolerans süresi (varsayılan ör. 5 gün) — ödeme tarihi + tolerans geçtikten sonra otomatik "gecikmiş" olarak işaretlenir
- Kira artış takibi: sistem artış tarihini hatırlatır (S06 bildirim sistemi ile), kullanıcı yeni tutarı manuel girer, sonraki ayların ödemeleri yeni tutarla güncellenir
- Geçmiş kiracı arşivi: sözleşme bittiğinde veya sonlandırıldığında kiracı "geçmiş kiracılar" listesine taşınır, ödeme geçmişi korunur
- Kiracı sözleşme sonlandırma: erken çıkış durumunda sözleşmeyi sonlandırma, oluşturulmuş gelecek ödemelerin iptal edilmesi
- Kısa dönem kiralama: her rezervasyon tek tek girilir — giriş/çıkış tarihi, toplam tutar, platform komisyonu, net gelir, para birimi
- Kısa dönem platform seçimi: sabit liste (Airbnb, Booking.com, Direkt)
- Frontend — mülk detay sayfasındaki "Kiralar" tab'ı: aktif kiracı bilgileri + son 12 ay ödeme tablosu (tarih, tutar, durum, yöntem), gecikmiş ödemeler kırmızı ile vurgulanır
- Frontend — kısa dönem kiralama listesi: rezervasyonlar tablo halinde
- Frontend — geçmiş kiracılar listesi
- Frontend — kiracı ekleme/düzenleme formu
- Frontend — kısa dönem rezervasyon ekleme formu

### Out of Scope

- Kısmi ödeme — ya tam ödendi ya ödenmedi
- Depozito iade takibi — tutar sadece bilgi amaçlı kaydedilir, iade/kesinti durumu takip edilmez
- Otomatik kira artışı uygulama — sistem sadece hatırlatır, kullanıcı yeni tutarı girer
- TÜFE/ÜFE bağlantısı — yasal kira artış oranı sisteme entegre değil, sadece manuel giriş
- Takvim görünümü — ödeme takibi tablo formatında, takvim görünümü yok
- Kısa dönem platform özelleştirmesi — kullanıcı yeni platform ekleyemez, sabit liste
- Gecikme cezası/faiz hesaplama — sadece "gecikmiş" durumu var, ceza tutarı hesaplanmaz

## Constraints

- Para birimi işlem bazında seçilir (S02 kararı ile uyumlu) — kiracı sözleşmesinde ve her ödeme kaydında currency alanı bulunur
- Bir mülkte aynı anda sadece bir aktif kiracı — yeni kiracı eklenmeden önce mevcut kiracının sözleşmesi kapatılmalı
- Otomatik oluşturulan ödemeler sözleşme başlangıcından bitişine kadar aylık olarak oluşur — ödeme günü sözleşme başlangıç tarihinin gününden alınır (ör. sözleşme 15 Ocak'ta başladıysa her ayın 15'i)
- Gecikme tolerans süresi yapılandırılabilir olmalı — varsayılan değerle başlanır, gerekirse ayarlanır
- Kira artışı uygulandığında sadece gelecek ayların ödeme tutarları güncellenir, geçmiş aylar etkilenmez
- Sözleşme erken sonlandırıldığında gelecek ayların otomatik oluşturulmuş ödemeleri iptal edilir (silinir veya "iptal" olarak işaretlenir)
- S02'den gelen Property access check service kullanılmalı — kullanıcı sadece kendi gruplarındaki mülklerin kiracı ve ödeme bilgilerini görebilir
- Mülk detay sayfasındaki tab yapısı S02'de kuruldu — S03 "Kiralar" tab içeriğini dolduracak

## Integration Points

### Consumes

- `Property` entity + access check service — S02'den, mülke erişim kontrolü
- `PropertyGroup` join entity — S02'den, çoklu grup desteği
- JWT middleware — S01'den, endpoint koruması
- Mülk detay sayfası tab yapısı — S02'den, "Kiralar" tab'ını dolduracak
- Frontend layout (sidebar + responsive) — S02'den

### Produces

- `TenantsController` → CRUD /api/properties/{id}/tenants, POST /api/properties/{id}/tenants/{tenantId}/terminate
- `RentPaymentsController` → GET /api/properties/{id}/rent-payments, PATCH /api/rent-payments/{id}/pay (ödeme işaretleme)
- `ShortTermRentalsController` → CRUD /api/properties/{id}/short-term-rentals
- `RentIncreasesController` → POST /api/tenants/{id}/rent-increase (yeni tutar uygulama)
- `Tenant` entity → Id, PropertyId, Name, Phone, Email, IdentityNumber, LeaseStart, LeaseEnd, MonthlyRent, Deposit, Currency, IsActive
- `RentPayment` entity → Id, TenantId, Amount, DueDate, PaidDate, Status (pending/paid/overdue), PaymentMethod (cash/transfer/check), Currency
- `ShortTermRental` entity → Id, PropertyId, Platform (Airbnb/Booking/Direct), CheckIn, CheckOut, TotalAmount, PlatformFee, NetIncome, Currency
- `RentIncrease` entity → Id, TenantId, PreviousAmount, NewAmount, EffectiveDate, IncreaseRate
- Frontend "Kiralar" tab içeriği — aktif kiracı + ödeme tablosu + gecikme vurgulama
- Frontend kısa dönem kiralama listesi
- Frontend geçmiş kiracılar listesi

## Open Questions

- Gecikme tolerans süresinin varsayılan değeri (3 gün? 5 gün? 7 gün?) — execution sırasında karar verilir, başlangıçta 5 gün ile başlanır.
- Tolerans süresi global mi yoksa kiracı/mülk bazında mı yapılandırılabilir — başlangıçta global tek ayar, gerekirse genişletilir.
- Sözleşme erken sonlandırıldığında gelecek ödemeler silinsin mi yoksa "iptal" durumunda mı kalsın — execution sırasında karar verilir, muhtemelen "iptal" durumu tutmak raporlama için daha faydalı.
- Kısa dönem kiralamada giriş-çıkış tarihi çakışma kontrolü — aynı mülkte aynı tarihe birden fazla rezervasyon girilmesin mi? Execution sırasında karar verilir, muhtemelen basit validasyon eklenir.
