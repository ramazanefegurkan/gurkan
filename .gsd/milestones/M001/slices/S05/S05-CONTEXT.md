---
id: S05
milestone: M001
status: ready
---

# S05: Döküman Yönetimi — Context

<!-- Slice-scoped context. Milestone-only sections (acceptance criteria, completion class,
     milestone sequence) do not belong here — those live in the milestone context. -->

## Goal

Mülke bağlı döküman yükleme (çoklu, sürükle-bırak), kategorize etme, inline önizleme, indirme, versiyon geçmişi ve silme çalışır; dosya yükleme riski retire edilir.

## Why this Slice

S02'nin ürettiği Property entity ve erişim kontrolü üzerine kurulur. Tapu, sözleşme, sigorta gibi önemli belgelerin tek yerden erişilebilir olması temel ihtiyaç. Terminal slice — hiçbir downstream slice buna bağımlı değil. Dosya yükleme boyut/format riski bu slice'da retire edilir (Proof Strategy'den).

## Scope

### In Scope

- Döküman yükleme: çoklu dosya aynı anda yüklenebilir (tek seferde birden fazla dosya seçimi)
- Yükleme UX: sürükle-bırak alanı + dosya seçme butonu (her ikisi)
- Döküman kategorileri sabit liste: tapu, kira sözleşmesi, sigorta poliçesi, vergi belgesi, fatura, diğer (6 kategori)
- Çoklu yüklemede tüm dosyalara aynı kategori atanır
- Döküman açıklama/not alanı (opsiyonel): kısa metin, ör. "Kira sözleşmesi 2024-2025 dönemi"
- Dosya boyut limiti: max 25MB
- Kabul edilen formatlar: PDF, JPG, PNG, WEBP, DOC, DOCX, XLS (geniş format desteği)
- Inline önizleme: PDF ve görseller (JPG, PNG, WEBP) tarayıcıda görüntülenir, diğer formatlar indirme ile açılır
- Versiyon geçmişi: aynı dökümanın yeni versiyonu yüklenebilir, eski versiyonlar korunur ve erişilebilir
- Döküman silme: hard delete — dosya hem veritabanından hem filesystem'den silinir (tüm versiyonları ile birlikte)
- Döküman listesi: mülk detay sayfasındaki "Dökümanlar" tab'ında tablo formatında
- Dosya storage: lokal filesystem (D006 kararı ile uyumlu)
- Grup bazlı erişim: kullanıcı sadece kendi gruplarındaki mülklerin dökümanlarını görebilir

### Out of Scope

- OCR / akıllı döküman işleme (R021 — scope dışı)
- Döküman arama (içerik bazlı) — sadece isim ve kategoriye göre listeleme
- Kullanıcı tanımlı döküman kategorileri — sabit 6 kategori
- Döküman paylaşma (link ile dışarıya) — sadece uygulama içi erişim
- Soft delete / arşivleme — dökümanlar hard delete ile silinir
- Dosya sıkıştırma / optimize etme — olduğu gibi saklanır

## Constraints

- Dosya storage lokal filesystem (D006) — production'da Docker volume mount ile çözülür
- Max dosya boyutu 25MB — büyük taranmış tapu belgeleri için yeterli olmalı
- Versiyon geçmişi: döküman güncellendiğinde eski dosya korunur, yeni versiyon eklenir — her versiyon ayrı dosya olarak saklanır
- Döküman silindiğinde tüm versiyonları da silinir (cascade)
- S02'den gelen Property access check service kullanılmalı — erişim kontrolü
- Mülk detay sayfasındaki tab yapısı S02'de kuruldu — S05 "Dökümanlar" tab içeriğini dolduracak
- Çoklu yüklemede dosyalar tek tek upload edilir (backend'e), hepsi aynı kategori ve açıklamayı alır

## Integration Points

### Consumes

- `Property` entity + access check service — S02'den, mülke erişim kontrolü
- `PropertyGroup` join entity — S02'den, çoklu grup desteği
- JWT middleware — S01'den, endpoint koruması
- Mülk detay sayfası tab yapısı — S02'den, "Dökümanlar" tab'ını dolduracak
- Frontend layout (sidebar + responsive) — S02'den
- Lokal filesystem — dosya storage (D006)

### Produces

- `DocumentsController` → POST /api/properties/{id}/documents (upload), GET (list), GET/{docId} (download), GET/{docId}/preview (inline), PUT/{docId} (yeni versiyon), DELETE/{docId}
- `DocumentVersionsController` → GET /api/documents/{id}/versions (versiyon listesi), GET /api/documents/{id}/versions/{versionId} (eski versiyon indirme)
- `Document` entity → Id, PropertyId, FileName, Category (enum), Description, CurrentVersionId, CreatedAt, UploadedBy
- `DocumentVersion` entity → Id, DocumentId, FilePath, FileSize, UploadedAt, VersionNumber
- Frontend "Dökümanlar" tab içeriği — döküman listesi (tablo), yükleme alanı (sürükle-bırak + buton), inline önizleme, versiyon geçmişi

## Open Questions

- Versiyon geçmişinde kaç versiyon saklanır (sınırsız mı, max N mi?) — başlangıçta sınırsız, disk alanı sorun olursa limit eklenir.
- Inline PDF önizleme yöntemi (tarayıcı native embed mi, özel viewer mı?) — execution sırasında karar verilir, muhtemelen native embed yeterli.
- Dosya isimlendirme stratejisi (orijinal isim mi, UUID mi filesystem'de?) — execution sırasında karar verilir, muhtemelen UUID + orijinal isim metadata'da.
