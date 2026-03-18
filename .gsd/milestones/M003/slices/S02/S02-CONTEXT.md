# S02: Web Improvements — Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

## Implementation Decisions

- **Token refresh:** Silent refresh — axios interceptor'da 401 → refresh token ile yeni access token al → orijinal isteği retry et. Kullanıcı hiçbir şey farketmez. Refresh token da expire olmuşsa login'e yönlendir.
- **UI polish önceliği:** Ana sayfalar önce — dashboard, mülk listesi, mülk detay (PropertyLayout + tüm tab'lar), form'lar. Sonra diğer sayfalar.
- **UI polish kapsamı:** Agent mevcut UI'ı tarayıp en çok göze batan sorunları belirleyecek ve düzeltecek. Kullanıcının bildiği spesifik sorun yok — genel kalite artışı.
- **Mevcut design system korunacak:** Terracotta accent, DM Sans, Playfair Display fontları, mevcut renk paleti.

## Agent's Discretion

- Hangi sayfaların polish'e ihtiyacı olduğunu belirlemek — browser'da açıp değerlendirmek
- Spacing, tipografi, responsive breakpoint detayları
- Loading spinner / skeleton pattern seçimi
- Boş durum (empty state) görselleri / mesajları
- Animasyon ve transition detayları
- Token refresh implementasyon detayları (retry queue, concurrent request handling)

## Scope

### In Scope
- Axios interceptor'da silent token refresh (401 → refresh → retry)
- Refresh token expire olduğunda login'e redirect
- Dashboard sayfası polish
- Mülk listesi sayfası polish
- PropertyLayout ve tab navigation polish
- Form'lar (property, tenant, expense, bill) polish
- Responsive iyileştirmeler (mobil/tablet breakpoints)
- Loading state'ler ve empty state'ler
- Genel spacing ve tipografi tutarlılığı

### Out of Scope
- Yeni sayfalar veya özellikler ekleme
- Design system değiştirme (font, renk paleti)
- Dark mode
- i18n / çoklu dil desteği

## Key Constraints

- Mevcut `AuthContext.tsx`'te token yönetimi var — refresh logic buraya veya axios interceptor'a eklenmeli
- Backend refresh endpoint zaten var: `POST /api/auth/refresh` (M001/S01'de implement edildi)
- Access token 15dk, refresh token 7 gün süreli (appsettings.json)
- Frontend 17 sayfa var — hepsine dokunmak gerekebilir ama öncelik ana akışlara

## Deferred Ideas

- Dark mode
- Kullanıcı tema tercihi
- Animasyonlu page transitions
