# Telegram Bot ile Fatura Otomatik İşleme

## Amaç

Kullanıcıların Telegram bot'a fatura fotoğrafı veya SMS metni göndererek otomatik Bill kaydı oluşturmasını sağlamak.

## Kanal

Telegram Bot API (webhook mode). WhatsApp desteği ilk versiyonda kapsam dışı.

## Genel Akış

```
Kullanıcı → Telegram Bot'a fotoğraf/SMS gönderir
  → Backend webhook alır
  → TelegramUserId → Gurkan UserId eşleştirmesi kontrol edilir
  → Claude Vision API ile fatura parse edilir
  → Abone no → PropertySubscription eşleşmesi aranır
    → Eşleşme varsa → mülk otomatik belirlenir
    → Eşleşme yoksa → bot mülk listesi sunar, kullanıcı seçer, abone no kaydedilir
  → Bot özet gösterir
  → Kullanıcı onaylar → Bill kaydı oluşturulur
  → Kullanıcı reddeder → iptal
```

## Bileşenler

### 1. TelegramWebhookController

- Route: `api/telegram/webhook`
- Telegram webhook endpoint
- Secret token doğrulaması (header: `X-Telegram-Bot-Api-Secret-Token`)
- Mesaj routing: fotoğraf → BillParserService, metin → BillParserService, callback query → onay/seçim işleme

### 2. TelegramBotService

- Telegram Bot API ile iletişim (mesaj gönderme, inline keyboard, dosya indirme)
- HttpClient ile doğrudan Bot API çağrıları veya Telegram.Bot NuGet paketi
- Inline keyboard builder: onay (Kaydet/İptal/Düzelt), mülk seçimi

### 3. BillParserService

- Claude Vision API'ye fotoğraf veya metin gönderir
- Structured JSON çıktı:

```json
{
  "billType": "Electric",
  "amount": 125.50,
  "currency": "TRY",
  "dueDate": "2026-04-15",
  "subscriberNo": "1234567890",
  "provider": "BEDAŞ"
}
```

- System prompt Türk fatura formatlarını tanımlar
- Tanınamayan alanlar `null` döner, bot kullanıcıya sorar
- Hem fotoğraf hem SMS metni aynı API call ile işlenir

### 4. SubscriptionMatcherService

- `subscriberNo` ile `PropertySubscription.SubscriptionNo` eşleştirir
- Eşleşme yoksa kullanıcının erişebildiği mülkleri listeler (IGroupAccessService)
- Kullanıcı seçim yaptığında `PropertySubscription.SubscriptionNo` güncellenir
- Sonraki faturalarda otomatik eşleşme sağlanır

### 5. TelegramUserLink Entity

```
TelegramUserLink
  - Id: Guid
  - UserId: Guid (FK → User)
  - TelegramUserId: long
  - TelegramUsername: string (nullable)
  - LinkCode: string (6 haneli)
  - IsLinked: bool
  - LinkedAt: DateTime (nullable)
  - CreatedAt: DateTime
```

- Unique index: TelegramUserId
- Unique index: UserId
- LinkCode 10 dakika geçerli, tek kullanımlık

## User Linking Akışı

1. Kullanıcı Telegram'da bot'a `/start` yazar
2. Bot 6 haneli link kodu üretir, "Bu kodu Gürkan uygulamasından girin" mesajı gönderir
3. Gurkan web/mobile'da "Telegram Bağla" sayfasında kodu girer
4. Backend kodu doğrular, `TelegramUserLink.IsLinked = true`, `LinkedAt = now` set eder
5. Bot kullanıcıya "Hesabınız bağlandı" mesajı gönderir

## Onay Akışı

Bot fatura parse sonucunu özetler:

```
📄 Fatura Algılandı
Tip: Elektrik
Tutar: 125,50 ₺
Son Ödeme: 15 Nisan 2026
Mülk: Kadıköy Daire

[✅ Kaydet] [❌ İptal] [✏️ Düzelt]
```

- Kaydet → Bill kaydı oluşturulur, onay mesajı
- İptal → işlem iptal edilir
- Düzelt → bot sırayla tutar/tarih/tip sorar, düzeltilmiş haliyle tekrar onay ister

## Güvenlik

- Webhook secret token doğrulaması (Telegram `setWebhook` ile ayarlanır)
- Link kodu 10 dakika TTL, tek kullanımlık
- Sadece linked kullanıcılar fatura gönderebilir
- Mülk erişimi mevcut `IGroupAccessService` ile kontrol edilir
- Claude API key server-side, kullanıcıya açık değil

## Veritabanı Değişiklikleri

- Yeni tablo: `TelegramUserLinks`
- Mevcut `PropertySubscription.SubscriptionNo` alanı kullanılır (değişiklik yok)

## API Endpoint'leri

| Method | Route | Açıklama |
|--------|-------|----------|
| POST | `api/telegram/webhook` | Telegram webhook |
| POST | `api/telegram/link` | Link kodu doğrulama (web/mobile'dan) |
| GET | `api/telegram/status` | Kullanıcının link durumu |
| DELETE | `api/telegram/link` | Telegram bağlantısını kaldır |

## Kapsam Dışı (v1)

- WhatsApp desteği
- Toplu fatura yükleme
- Otomatik ödendi işaretleme
- Fatura hatırlatma gönderme (mevcut push sistemi zaten yapıyor)
- Güven skoru bazlı otomatik kayıt (her zaman onay istenir)

## Bağımlılıklar

- Telegram.Bot NuGet paketi (veya raw HttpClient)
- Anthropic Claude API (Vision desteği olan model)
- Mevcut: ApplicationDbContext, IGroupAccessService, Bill entity, PropertySubscription entity
