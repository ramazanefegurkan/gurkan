# E2E Test Suite — Playwright

## Amaç

gurkan-ui web uygulamasının tüm kritik kullanıcı akışlarını Playwright ile uçtan uca test etmek. Testler gerçek API + PostgreSQL'e bağlanır, mock kullanılmaz.

## Proje Yapısı

```
e2e/
├── package.json
├── playwright.config.ts
├── tsconfig.json
├── .gitignore              # test-results/, playwright-report/, node_modules/
├── helpers/
│   ├── auth.ts             # login, token yönetimi
│   ├── api-setup.ts        # test verisi oluşturma/silme (API üzerinden)
│   └── constants.ts        # URL'ler, env var defaults
├── fixtures/
│   └── test-fixtures.ts    # authenticatedPage, userPage, apiContext
└── tests/
    ├── auth.spec.ts
    ├── properties.spec.ts
    ├── tenants.spec.ts
    ├── all-tenants.spec.ts
    ├── rent-payments.spec.ts
    ├── rent-increases.spec.ts
    ├── short-term-rentals.spec.ts
    ├── expenses.spec.ts
    ├── bills.spec.ts
    ├── documents.spec.ts
    ├── property-notes.spec.ts
    ├── dashboard.spec.ts
    ├── reports.spec.ts
    ├── notifications.spec.ts
    ├── import.spec.ts
    ├── admin-users.spec.ts
    ├── admin-groups.spec.ts
    ├── admin-banks.spec.ts
    ├── subscriptions.spec.ts
    └── settings-telegram.spec.ts
```

## Teknik Kararlar

### Konum

Proje kökünde `e2e/` klasörü, kendi `package.json` ile. `gurkan-ui`'den bağımsız — mevcut `GurkanApi.Tests/` yapısıyla tutarlı.

### Konfigürasyon

- **baseURL:** `E2E_BASE_URL` env var veya `http://localhost:5173`
- **API URL:** `E2E_API_URL` env var veya `http://localhost:5039/api`
- **Credentials:** `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` env var veya docker-compose seed defaults
- **Tarayıcılar:** Chromium (varsayılan). CI'da headless, lokalde headed opsiyonel.
- **Timeout:** Test başına 30s, navigation 15s, expect 5s
- **Retries:** CI'da 1, lokalde 0
- **Reporter:** HTML reporter + list (terminal)
- **Trace:** `on-first-retry` — başarısız testlerde trace kaydı (CI debug için)
- **Screenshots:** `only-on-failure`
- **testDir:** `./tests`
- **outputDir:** `./test-results`

### Element Seçici Stratejisi

`data-testid` attribute'ları birincil seçici olarak kullanılır. Testler yazılırken ilgili UI bileşenlerine `data-testid` eklenir. Fallback olarak role-based selectors (`getByRole`, `getByText`, `getByLabel`).

### Global Setup

İlk test öncesi API'nin ayakta olduğunu doğrulamak için `GET {API_URL}` isteği retry ile gönderilir. HTTP yanıtı alınamazsa testler başlamaz. Ayrıca superadmin credentials ile login yapılarak token doğrulanır.

### Custom Fixtures

**`authenticatedPage`**: SuperAdmin credentials ile API'ye login isteği atar, dönen token'ları `localStorage`'a set eder, sayfayı yeniler. Admin paneli ve genel CRUD testlerinde kullanılır.

**`userPage`**: Regular User credentials ile authenticate edilmiş sayfa. Grup bazlı erişim kısıtlamalarını test etmek için. User, global setup sırasında API üzerinden sabit credentials ile oluşturulur (`e2e-user@gurkan.com` / `E2EUser123!`) ve bir gruba atanır.

**`apiContext`**: `APIRequestContext` ile doğrudan API çağrıları yapmak için. Test verisi oluşturma/temizleme işlemlerinde kullanılır.

### Test Verisi Stratejisi

- Her spec dosyası kendi verisini API üzerinden oluşturur
- Unique isimler: `Test Property ${Date.now()}` formatında — çakışma önlenir
- Test sonrası temizlik: `afterAll` hook'larında oluşturulan veri silinir
- Başarısız run'lardan kalan orphan data, unique naming sayesinde sonraki testleri etkilemez
- Cross-group erişim testlerinde: `authenticatedPage` (SuperAdmin) ile "diğer grubun" verisini oluştur, `userPage` ile erişim dene
- DB'ye doğrudan erişim yok — tüm işlemler API endpoint'leri üzerinden

### Paralellik

- Spec dosyaları arası: **paralel** (Playwright `fullyParallel: false`, dosya bazında paralel)
- Spec içi testler: **sıralı** (veri bağımlılıkları nedeniyle, örn. önce oluştur sonra düzenle)
- Her worker kendi verisini oluşturur, çakışma olmaz

## Test Senaryoları

### auth.spec.ts

- Başarılı login → dashboard'a yönlendirilme
- Yanlış şifre → hata mesajı gösterimi
- Logout → login sayfasına yönlendirilme
- Oturumsuz erişim → login sayfasına redirect
- Token refresh → localStorage'da expired accessToken + geçerli refreshToken set edilerek session'ın kesintisiz devam ettiği doğrulanır

### properties.spec.ts

- Mülk oluştur (form doldur, kaydet) → listede görünür
- Mülk detay sayfası açılır, tab'lar görünür
- Mülk düzenle → değişiklikler yansır
- Mülk sil → listeden kaybolur
- Farklı para birimlerinde mülk oluşturma (TRY, USD, EUR)
- Grup erişim kısıtlaması: `userPage` ile başka grubun mülküne erişim 403

### property-notes.spec.ts

Not: Notlar ayrı bir sayfa değil, PropertyDetail sayfasının içinde bir bölümdür. Testler property detail sayfasına navigate edip notes section'ı ile etkileşir.

- Mülk detay sayfasında not ekle
- Not listesi görüntüleme
- Not düzenle (sadece kendi notu)
- Not sil

### tenants.spec.ts

- Kiracı oluştur → otomatik ödeme planı oluşur
- Kiracı listele (aktif/pasif filtre)
- Kiracı detay → ödeme geçmişi görünür
- Kiracı düzenle
- Kiracı sonlandır → gelecek ödemeler iptal

### all-tenants.spec.ts

- Tüm kiracılar listesi (cross-property)
- Aktif/pasif filtre

### rent-payments.spec.ts

- Ödeme listesi görüntüleme
- Ödemeyi "ödendi" işaretle → durum güncellenir
- Ödeme durumu filtreleme

### rent-increases.spec.ts

- Kira artışı oluştur
- Gelecek ödemelerin güncellenmesini doğrula

### short-term-rentals.spec.ts

- Kısa dönem kiralama oluştur (farklı platformlar: Airbnb, Booking, Direct)
- Listele
- Düzenle
- Sil

### expenses.spec.ts

- Gider oluştur
- Listele
- Düzenle
- Sil
- Kategori filtresi

### bills.spec.ts

- Fatura oluştur
- Listele
- Düzenle
- Sil
- Ödendi işaretle
- Durum filtresi

### documents.spec.ts

- Döküman yükle
- Listele
- İndir (download doğrulama)
- Sil
- Geçersiz dosya uzantısı → hata

### dashboard.spec.ts

- Dashboard açılır, özet kartlar görünür
- Gelir/gider verileri doğru gösterilir
- Filtre değişikliği (yıl/ay) çalışır

### reports.spec.ts

- Kâr/zarar raporu görüntüleme
- Excel export → dosya indirilir
- PDF export → dosya indirilir

### notifications.spec.ts

- Bildirim listesi görüntüleme
- Bildirim kapat (dismiss)
- Tümünü kapat

### import.spec.ts

- Airbnb CSV import (dry-run → önizleme, sonra gerçek import)
- Kira ödemeleri CSV import

### admin-users.spec.ts

- Kullanıcı listesi (SuperAdmin olarak)
- Yeni kullanıcı oluştur (register)
- Kullanıcı rolü değiştir
- Normal kullanıcı admin sayfalarına erişemez

### admin-groups.spec.ts

- Grup oluştur
- Gruba üye ekle
- Gruba mülk ata
- Üye çıkar
- Grup sil

### admin-banks.spec.ts

- Banka tanımı oluştur
- Banka hesabı CRUD
- Banka sil

### subscriptions.spec.ts

- Abonelik listesi (/subscriptions sayfası)
- Mülk aboneliklerini güncelle (su, elektrik, gaz, internet, aidat seçimleri)
- Mülk formu içinden abonelik düzenleme akışı

### settings-telegram.spec.ts

- Telegram bağlama durumu görüntüleme
- Telegram bağlama kodu ile link (mock bot yanıtı gerekebilir — UI tarafı doğrulanır)

## Çalıştırma

```bash
# Lokal — API + Web zaten çalışıyorken
cd e2e && npx playwright test

# Headed mode (tarayıcı görünür)
cd e2e && npx playwright test --headed

# Tek spec
cd e2e && npx playwright test tests/auth.spec.ts

# CI / sıfırdan
docker-compose up -d --build
cd e2e && npm ci && npx playwright install chromium
# API health check bekle
cd e2e && npx playwright test

# HTML rapor
cd e2e && npx playwright show-report
```

## Bağımlılıklar

```json
{
  "devDependencies": {
    "@playwright/test": "^1.52.0"
  }
}
```

Playwright kurulumu sonrası: `npx playwright install chromium`
