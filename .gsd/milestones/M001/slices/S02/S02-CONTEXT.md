---
id: S02
milestone: M001
status: ready
---

# S02: Mülk Yönetimi — Context

<!-- Slice-scoped context. Milestone-only sections (acceptance criteria, completion class,
     milestone sequence) do not belong here — those live in the milestone context. -->

## Goal

Mülk CRUD, çoklu gruba atama, multi-currency desteği, mülk notları ve ilk frontend layout (sidebar + responsive) ile birlikte mülk listesi ve detay sayfası çalışır; downstream slice'lar (S03-S06) Property entity ve access check altyapısını kullanır.

## Why this Slice

S01'in ürettiği auth + grup altyapısı üzerine kurulur. S03 (kira), S04 (gider), S05 (döküman) ve S06 (dashboard) hepsi Property entity'sine ve erişim kontrolüne bağımlı. Ayrıca uygulamanın ilk frontend'i bu slice'da kurulacağı için layout, navigasyon ve sayfa yapısı kalıbı burada belirlenir. Multi-currency riski bu slice'da retire edilir.

## Scope

### In Scope

- Mülk CRUD (ekleme, düzenleme, arşivleme — hard delete yok)
- Mülk alanları: isim, tip (sabit liste: daire, ev, dükkan, arsa, ofis), adres, metrekare, oda sayısı, kat, bina yaşı, alım tarihi, alım fiyatı
- Mülk tek kapak fotoğrafı yükleme (opsiyonel — yüklenmezse varsayılan ikon)
- Çoklu gruba mülk atama (many-to-many — bir mülk birden fazla gruba atanabilir)
- Grup bazlı erişim kontrolü: kullanıcı sadece kendi gruplarındaki mülkleri görür
- Superadmin tüm mülkleri görür
- Multi-currency: para birimi işlem bazında seçilir (TL/USD/EUR), mülk bazında sabitlenmez
- Mülk notları: düz metin, tarih damgalı, kronolojik sıralı
- Frontend genel layout: sidebar + responsive (masaüstünde sidebar, mobilde hamburger menü)
- Mülk listesi: kart ve tablo görünümü arası toggle
- Mülk listesinde arama (isim, adres) ve filtreleme (tip, grup)
- Mülk detay sayfası: üstte mülk bilgileri, altta tab'lar (Kiralar, Giderler, Dökümanlar, Notlar) — tab içerikleri ilgili slice'larda doldurulur, S02'de sadece Notlar tab'ı aktif
- Soft delete / arşivleme: mülk silindiğinde arşivlenir, ana listede görünmez
- Ayrı arşiv sayfası: arşivlenmiş mülklere buradan erişilir
- Arşivden geri alma (unarchive) desteği
- Login sayfası frontend (S01'de sadece API vardı, UI bu slice'da)

### Out of Scope

- Hard delete — mülk asla kalıcı olarak silinmez, sadece arşivlenir
- Mülk tipi özelleştirme — kullanıcı yeni tip ekleyemez, sabit liste
- Çoklu fotoğraf / galeri — sadece tek kapak fotoğrafı
- Zengin metin editörü notlar için — düz metin yeterli
- Kur dönüşümü — raporlarda her para birimi ayrı gösterilir (D007)
- Kira, gider, fatura, döküman CRUD — bunlar S03/S04/S05'te

## Constraints

- Mülk tipleri sabit enum: daire, ev, dükkan, arsa, ofis (ileride genişletilebilir ama kullanıcı tanımlı değil)
- Para birimi mülk bazında sabitlenmez — her işlem (kira, gider, fatura) kendi para birimini taşır. Property entity'sinde currency alanı olmaz, bunun yerine downstream entity'lerde (RentPayment, Expense, Bill vs.) currency bulunur
- Boundary map güncellemesi gerekiyor: Property entity'sinde GroupId tek foreign key yerine many-to-many ilişki (PropertyGroup join table) olacak
- Kapak fotoğrafı lokal filesystem'de saklanır (D006 kararı ile uyumlu)
- S01'den gelen JWT middleware ve group access check service'i kullanılmalı
- Frontend layout bu slice'da kurulan sidebar + responsive pattern'ı tüm sonraki slice'lar tarafından kullanılacak — kalıp burada belirlenir
- Mülk detay sayfasındaki tab yapısı genişletilebilir olmalı — S03/S04/S05 kendi tab'larını ekleyecek

## Integration Points

### Consumes

- `JWT middleware` — S01'den, tüm endpoint'leri korur
- `Group access check service` — S01'den, kullanıcının mülke erişim yetkisi kontrolü
- `ApplicationDbContext` — S01'den, User, Group, GroupMember entity'leri
- `PostgreSQL` — Property, PropertyNote, PropertyGroup entity'leri için veritabanı
- `Lokal filesystem` — kapak fotoğrafı storage (D006)

### Produces

- `PropertiesController` → CRUD /api/properties, GET /api/properties (grup bazlı filtreleme), PATCH /api/properties/{id}/archive, PATCH /api/properties/{id}/unarchive
- `PropertyNotesController` → CRUD /api/properties/{id}/notes
- `Property` entity → Id, Name, Type, Address, SquareMeters, Rooms, Floor, BuildingAge, PurchaseDate, PurchasePrice, CoverPhotoPath, IsArchived
- `PropertyGroup` join entity → PropertyId, GroupId (many-to-many)
- `PropertyNote` entity → Id, PropertyId, Content, CreatedAt, CreatedBy
- Property access check middleware/service → kullanıcının mülke erişim yetkisi kontrolü (çoklu grup desteği ile)
- Frontend layout component → sidebar + responsive, tüm sayfaların ortak shell'i
- Mülk listesi sayfası → kart/tablo toggle, arama, filtreleme
- Mülk detay sayfası → mülk bilgileri + tab yapısı (genişletilebilir)
- Login sayfası UI

## Open Questions

- Sabit mülk tipi listesinin tam içeriği (daire, ev, dükkan, arsa, ofis yeterli mi, yazlık/depo gibi ek tipler var mı) — execution sırasında bu 5 tip ile başlanır, kullanıcı isterse eklenir.
- Kapak fotoğrafı boyut ve format limiti — execution sırasında makul limitlerle başlanır (ör. max 5MB, jpg/png/webp).
- Mülk listesinde varsayılan sıralama — execution sırasında karar verilir (ör. isim A-Z veya ekleme tarihi).
- Arşivlenmiş mülklerin verilerine (kira, gider) erişim — arşiv sayfasından mülk detayına gidilebilir, veriler okunabilir ama yeni kayıt eklenemez.
