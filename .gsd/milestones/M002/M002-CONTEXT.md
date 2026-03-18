---
depends_on: [M001, M003]
---

# M002: Servet Yönetimi Evrimi — Context

**Gathered:** 2026-03-18
**Status:** Ready for planning (after M003 completes)

## Project Description

M001'de inşa edilen gayrimenkul portföy yönetimi, daha geniş bir servet yönetimi platformunun ilk parçası. M002'de gayrimenkul dışı varlık sınıfları eklenerek kullanıcının tüm finansal portföyünü tek bir yerden yönetmesi hedefleniyor.

## Why This Milestone

Gayrimenkul sadece bir varlık sınıfı. Kullanıcının hisse senedi, birikim hesapları, kripto, altın gibi diğer varlıkları da var. Tüm servetin tek bir yerden görüntülenmesi ve yönetilmesi için gayrimenkul dışı varlık sınıflarının eklenmesi gerekiyor.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Gayrimenkul dışında en az 2-3 varlık sınıfı (hisse, birikim, kripto, altın) ekleyebilir
- Birleşik dashboard'da tüm varlıkları tek ekranda görebilir
- Toplam servet değerini hesaplayabilir

### Entry point / environment

- Entry point: Mevcut web + mobil uygulama (M003'te deploy edilmiş)
- Environment: Production VPS
- Live dependencies involved: Potansiyel fiyat API'leri (hisse, kripto, altın)

## Provisional Scope

- Gayrimenkul dışı varlık sınıfları (hisse senedi, birikim hesapları, kripto, altın vs.)
- Birleşik portföy dashboard'u (tüm varlıklar tek ekranda)
- Varlık sınıfları arası toplam servet görünümü
- Genel servet raporu ve trend analizi

## Key Ideas from Prior Discussion

- Kullanıcı gayrimenkulü zaten M001'de detaylı takip ediyor — M002 diğer varlıkları ekleyerek "servet yönetimi"ne genişletir
- Grup bazlı erişim modeli muhtemelen burada da geçerli olacak
- Multi-currency desteği M001'de zaten var — hisse/kripto için farklı birimler gerekebilir

## Open Questions (to resolve before roadmap planning)

- Hisse senedi fiyatları otomatik çekilecek mi (API), yoksa manuel mi girilecek?
- Kripto wallet entegrasyonu var mı, yoksa sadece manuel kayıt mı?
- Birleşik raporda kur dönüşümü gerekiyor mu?
- Varlık sınıflarının detay seviyesi ne olmalı (sadece toplam değer mi, yoksa işlem bazlı mı)?

## Dependencies

- M001 tamamlanmış olmalı — auth, grup erişim, mülk yönetimi, dashboard altyapısı gerekli
- M003 tamamlanmış olmalı — production deploy, mobil uygulama, push notification altyapısı

## Risks and Unknowns

- Fiyat API'leri (hisse, kripto, altın) — ücretsiz vs ücretli, rate limit, güvenilirlik
- Kur dönüşümü karmaşıklığı — birden fazla para birimi arası çevrim
- Varlık sınıfı çeşitliliği — her sınıf farklı veri modeli gerektirebilir
