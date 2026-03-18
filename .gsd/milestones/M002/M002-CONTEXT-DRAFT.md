---
depends_on: [M001]
---

# M002: Servet Yönetimi Evrimi — Context Draft

**Gathered:** 2026-03-18
**Status:** DRAFT — needs dedicated discussion before planning

## Seed Material

M001'de inşa edilen gayrimenkul portföy yönetimi, daha geniş bir servet yönetimi platformunun ilk parçası. M002'de gayrimenkul dışı varlık sınıfları eklenerek kullanıcının tüm finansal portföyünü tek bir yerden yönetmesi hedefleniyor.

## Provisional Scope

- Gayrimenkul dışı varlık sınıfları (hisse senedi, birikim hesapları, kripto, altın vs.)
- Birleşik portföy dashboard'u (tüm varlıklar tek ekranda)
- Varlık sınıfları arası toplam servet görünümü
- Genel servet raporu ve trend analizi

## Key Ideas from Discussion

- Kullanıcı gayrimenkulü zaten M001'de detaylı takip ediyor — M002 diğer varlıkları ekleyerek "servet yönetimi"ne genişletir
- Grup bazlı erişim modeli muhtemelen burada da geçerli olacak
- Multi-currency desteği M001'de zaten var — hisse/kripto için farklı birimler gerekebilir

## Open Questions

- Hisse senedi fiyatları otomatik çekilecek mi (API), yoksa manuel mi girilecek?
- Kripto wallet entegrasyonu var mı, yoksa sadece manuel kayıt mı?
- Birleşik raporda kur dönüşümü gerekiyor mu?
- Varlık sınıflarının detay seviyesi ne olmalı (sadece toplam değer mi, yoksa işlem bazlı mı)?

## Dependencies

- M001 tamamlanmalı — auth, grup erişim, mülk yönetimi, dashboard altyapısı gerekli.

## What "Done" Looks Like

- Kullanıcı gayrimenkul dışında en az 2-3 varlık sınıfı ekleyebilir
- Birleşik dashboard tüm varlıkları tek ekranda gösterir
- Toplam servet değeri hesaplanır
