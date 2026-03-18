# S06: Push Notifications — Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

## Implementation Decisions

- **Tetikleme mekanizması:** Periyodik background job — günde 1 kere sabah 09:00 (Türkiye saati). ASP.NET Core `IHostedService` veya `BackgroundService` ile.
- **Push servisi:** Expo Push Notifications API (https://exp.host/--/api/v2/push/send). Ücretsiz, Expo ekosistemiyle entegre.
- **Notification tipleri:** Mevcut query-time notification logic'in push versiyonu:
  - LateRent (kira gecikmiş — DueDate+5 gün)
  - UpcomingBill (fatura yaklaşıyor — 7 gün içinde)
  - LeaseExpiry (sözleşme bitiyor — 30/60/90 gün)
  - RentIncreaseApproaching (kira artışı yaklaşıyor — 30 gün içinde)
- **Duplicate push önleme:** Son gönderim tarihini takip et — aynı notification için tekrar push gönderme (günlük check'te aynı notification tekrar tetiklenmesin)

## Agent's Discretion

- BackgroundService vs IHostedService vs Hangfire seçimi
- Device token storage schema detayları
- Push payload format (title, body, data)
- Expo Push API batch gönderim stratejisi
- Notification grouping (aynı mülk için birden fazla bildirim → tek push mu, ayrı ayrı mı)

## Scope

### In Scope
- `DeviceToken` entity + migration (UserId, ExpoPushToken, Platform, CreatedAt)
- `DeviceTokensController` — POST /api/device-tokens (register), DELETE (unregister)
- `PushNotificationService` — Expo Push API client
- `NotificationBackgroundService` — günde 1 kere 09:00'da çalışan job
- Push gönderim log'u — hangi notification kime ne zaman gönderildi (duplicate prevention)
- Mobil app'te push notification izni isteme (Expo Notifications)
- Mobil app'te device token alma ve backend'e kaydetme (login sonrası)
- Foreground push handling (app açıkken bildirim gelirse banner göster)
- Background push handling (app kapalıyken bildirim gelirse system notification)
- Push notification'a tıklayınca ilgili sayfaya yönlendirme (deep linking basit seviye)

### Out of Scope
- Email bildirimler
- SMS bildirimler
- Push notification tercihleri UI (hangi tip bildirimleri almak istiyorsun) — tümü gönderilir
- Rich push (resimli, aksiyonlu push) — basit text push yeterli

## Key Constraints

- S04'ten gelen Expo project + auth context gerekli
- Expo Push servisi ücretsiz ama rate limit var (sınır yüksek, aile kullanımı için sorun olmaz)
- iOS'ta push notification izni açıkça istenmeli (Android'de otomatik)
- Background job Docker container'da çalışacak — timezone doğru ayarlanmalı (Europe/Istanbul)
- Mevcut notification logic `NotificationsController`'da query-time compute ediliyor — bu logic'i push service de kullanacak (shared service extract)

## Deferred Ideas

- Push notification tercihleri (tip bazlı on/off)
- Rich notifications (resim, aksyon butonları)
- Email bildirimler
- Webhook entegrasyonu (Slack, Telegram'a bildirim)
