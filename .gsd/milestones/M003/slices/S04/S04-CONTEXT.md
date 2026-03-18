# S04: Mobil App Foundation — Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

## Implementation Decisions

- **Navigation:** Bottom tab navigation — 4 tab: Dashboard, Mülkler, Bildirimler, Profil. En yaygın mobil UX pattern'ı.
- **Tasarım dili:** Web app ile tutarlı — terracotta accent renk, DM Sans font, aynı renk paleti. Mobil için optimize edilmiş layout (card'lar, list'ler, spacing).
- **Offline desteği:** Yok — online-only. Her ekran API'den taze veri çeker.
- **Auth:** JWT + Expo SecureStore. Login ekranı → token pair alınır → SecureStore'da saklanır → her API isteğinde Authorization header eklenir.
- **Token refresh:** S02'de web'e eklenen silent refresh pattern'ının aynısı — 401 → refresh → retry.
- **API client:** Web'deki `client.ts` fonksiyonlarının aynı endpoint'leri, React Native HTTP client (axios veya fetch) ile.

## Agent's Discretion

- Expo Router vs React Navigation seçimi
- UI component kütüphanesi (React Native Paper, NativeWind, custom vs.)
- Mobil-specific state management (React Context yeterli mi, Zustand/TanStack Query mı)
- Card/list item tasarım detayları
- Platform-specific styling (iOS vs Android farklılıkları)

## Scope

### In Scope (S04 — Foundation)
- Expo project scaffold (managed workflow, TypeScript)
- Login ekranı (email + şifre)
- JWT auth context + SecureStore token storage
- Token refresh interceptor (silent refresh)
- API client module (production backend URL)
- Bottom tab navigation (Dashboard, Mülkler, Bildirimler, Profil)
- Dashboard ekranı (summary cards, mülk bazlı özet)
- Mülk listesi ekranı (card grid, grup filtreleme)
- Mülk detay ekranı (temel bilgiler)
- Profil ekranı (kullanıcı bilgileri, logout)

### Out of Scope (S05'e bırakılan)
- Kiracı, gider, fatura, döküman, bildirim detay sayfaları
- CRUD form'ları (ekleme, düzenleme, silme)
- Push notification (S06)
- Dosya yükleme/indirme

## Key Constraints

- Backend production'da çalışıyor olmalı (S01 dependency) — HTTPS endpoint gerekli
- Expo Go ile development sırasında test edilebilir — EAS Build şimdilik gerekli değil
- Web API'deki tüm endpoint'ler kullanılabilir — yeni backend endpoint'e gerek yok
- Mobilde dosya upload UI farklı olacak (camera/gallery picker) — bu S05'te

## Deferred Ideas

- Biometric login (Face ID / fingerprint)
- Deep linking
- App Store / Google Play publish (Expo Go veya EAS internal distribution yeterli)
- Widget'lar (iOS/Android home screen widgets)
