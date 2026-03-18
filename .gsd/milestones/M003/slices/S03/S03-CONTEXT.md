# S03: Data Import — Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

## Implementation Decisions

- **Airbnb CSV format:** Kullanıcının elinde gerçek Airbnb CSV export dosyası var. Sütun yapısı gerçek dosyadan keşfedilecek. Research sırasında Airbnb earnings CSV formatı da araştırılacak.
- **Kira import formatı:** Template CSV — sabit sütun yapısı (mülk adı/ID, kiracı adı, tutar, para birimi, tarih, ödeme durumu). Kullanıcı template'i indirip doldurup yükler.
- **Import akışı (hem Airbnb hem kira):** 
  1. Dosya yükle (drag & drop veya file picker)
  2. Parse et, önizleme tablosu göster
  3. Hatalı satırları kırmızı ile işaretle, hata nedenini göster
  4. Kullanıcı onaylar → import başlar
  5. Sonuç özeti: başarılı/hatalı/atlanan satır sayıları
- **Duplicate handling:** Aynı tarih + aynı mülk + aynı tutar → duplicate uyarısı önizlemede gösterilir, kullanıcı karar verir

## Agent's Discretion

- CSV parse kütüphanesi seçimi (backend: CsvHelper vs manuel, frontend: papaparse vs manuel)
- Template CSV'nin exact sütun yapısı ve header isimleri
- Airbnb CSV → ShortTermRental entity mapping detayları
- Hata mesajı formatları ve detay seviyesi
- Batch insert stratejisi (tek seferde mi, chunk'lar halinde mi)

## Scope

### In Scope
- Airbnb CSV import → ShortTermRental kayıtları oluşturma
- Geçmiş kira ödemeleri CSV import → RentPayment kayıtları oluşturma
- Template CSV download endpoint'i (boş template, doğru sütun header'ları ile)
- Preview endpoint (parse + validate, henüz kaydetme)
- Import endpoint (validated data → DB insert)
- Frontend import sayfası (dosya yükleme, önizleme tablo, hata gösterimi, onay, sonuç özeti)
- Row-level validation (tarih formatı, tutar, zorunlu alanlar, mülk eşleştirme)
- Duplicate detection (uyarı, engelleme değil)

### Out of Scope
- Gider/fatura import (kısmi import kararı — M003 scope'unda değil)
- Excel (.xlsx) formatı desteği (sadece CSV)
- Sütun eşleştirme / mapping UI (template CSV yeterli)
- Airbnb PDF parse etme (CSV tercih edildi)

## Key Constraints

- Airbnb CSV Türkçe lokalizasyon içerebilir (Türkçe karakterler, virgül vs nokta decimal separator)
- Kira import'ta mülk eşleştirmesi gerekiyor — mülk adı veya ID ile. Eşleşmeyen satırlar hata olarak gösterilmeli.
- Import sadece kendi grup erişimi dahilindeki mülklere yapılabilmeli (group access control)

## Deferred Ideas

- Excel (.xlsx) import desteği
- Gider/fatura toplu import
- Import geçmişi / log tutma
- Undo / rollback import
