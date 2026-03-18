# S05: Mobil App Full Features — Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

## Implementation Decisions

- **CRUD kapsamı:** Tam CRUD — mobilde ekleme, düzenleme, silme tüm entity'ler için (kiracı, gider, fatura, kısa dönem kiralama, kira artışı, not)
- **Döküman yönetimi:** Upload + view — kameradan fotoğraf çekip yükleyebilme (ImagePicker), mevcut dökümanları görüntüleme/indirme
- **Form pattern:** Web'deki form yapısına benzer — validation, hata mesajları, loading state'ler. Mobil-optimize input'lar (date picker, currency input, dropdown select).

## Agent's Discretion

- Form kütüphanesi (React Hook Form mobile vs custom)
- ImagePicker vs DocumentPicker kullanımı
- Dosya indirme stratejisi (expo-file-system + sharing)
- Pull-to-refresh pattern
- Swipe-to-delete veya long-press context menu

## Scope

### In Scope
- Kiracı ekranları (liste, detay + ödeme tablosu, ekleme/düzenleme formu)
- Kısa dönem kiralama ekranları (liste, ekleme/düzenleme)
- Gider ekranları (liste, ekleme/düzenleme)
- Fatura ekranları (liste, mark-as-paid, ekleme/düzenleme)
- Döküman ekranları (liste, upload — kamera/galeri, görüntüleme/indirme)
- Bildirim ekranları (liste, severity badge'ları)
- Kira artışı ekranları (liste, ekleme)
- Mülk notları (görüntüleme, ekleme)
- Silme işlemleri (confirmation dialog)
- Mülk detay tab navigation (kiracılar, kısa dönem, giderler, faturalar, dökümanlar)

### Out of Scope
- Rapor oluşturma (Excel/PDF export mobilde tetiklenebilir ama dosya web'den indirilir)
- Import (CSV import web-only)
- Admin sayfaları (kullanıcı/grup yönetimi web-only)
- Push notification (S06)

## Key Constraints

- S04'ten gelen navigation structure, auth context, API client kullanılacak
- Tüm backend endpoint'ler mevcut — yeni endpoint gerekmiyor
- Dosya upload multipart/form-data — Expo'da FormData API kullanılacak
- Date picker platform-specific (iOS vs Android) — Expo DateTimePicker
