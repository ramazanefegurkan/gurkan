# M001: Gayrimenkul Portföy Yönetimi

**Vision:** Aile içi kullanıma yönelik bir gayrimenkul portföy yönetim web uygulaması — kira, gider, fatura takibi, döküman yönetimi, finansal dashboard ve raporlama. Grup bazlı erişim modeli ile her kullanıcı sadece kendine atanmış mülkleri görür.

## Success Criteria

- Superadmin login olup grup oluşturabilir, kullanıcı ve mülk atayabilir
- Aile üyesi login olduğunda sadece kendi grubundaki mülkleri görür
- Mülke uzun dönem kira kaydı yapılır, ödeme durumu takip edilir, gecikme otomatik algılanır
- Mülke kısa dönem (Airbnb-style) rezervasyon kaydı yapılır, gelir takip edilir
- Mülk bazlı gider ve fatura kaydı yapılır
- Tapu, sözleşme gibi dökümanlar yüklenip mülke bağlanır
- Dashboard tüm portföyün finansal özetini gösterir
- Kira gecikme, fatura ve sözleşme bitiş hatırlatmaları oluşur
- Excel/PDF rapor export edilir, ROI hesaplanır

## Key Risks / Unknowns

- Auth + grup erişim modeli doğru çalışmalı — yanlış erişim kontrolü veri sızıntısı demek
- Multi-currency desteği dashboard ve raporlamada karmaşıklık ekleyebilir
- Dosya yükleme boyut ve format limitleri — büyük tapu belgeleri vs.

## Proof Strategy

- Auth + erişim riski → retire in S01 by proving superadmin grup oluşturur, mülk atar, üye sadece kendi mülklerini görür
- Multi-currency riski → retire in S02 by proving mülk TL/USD/EUR cinsinden oluşturulabilir ve downstream slice'lar para birimini doğru kullanır
- Dosya yükleme riski → retire in S05 by proving çeşitli boyut ve formatlarda dosya yüklenip indirilebilir

## Verification Classes

- Contract verification: API endpoint testleri, EF Core migration çalışması, auth token validation
- Integration verification: Frontend-backend iletişimi, dosya yükleme/indirme, dashboard veri doğruluğu
- Operational verification: none (M001'de lokal dev yeterli)
- UAT / human verification: Dashboard'un doğru veriyi gösterdiği, erişim kontrolünün çalıştığı, raporların doğru olduğu

## Milestone Definition of Done

This milestone is complete only when all are true:

- Auth + grup bazlı erişim çalışıyor, superadmin ve grup admin delegasyonu doğru
- Mülk CRUD + gruba atama + erişim kontrolü çalışıyor
- Uzun dönem kira takibi (ödeme, gecikme, artış) çalışıyor
- Kısa dönem kira takibi (rezervasyon, gelir) çalışıyor
- Gider ve fatura takibi çalışıyor
- Döküman yükleme/indirme/görüntüleme çalışıyor
- Dashboard gerçek veriyi gösteriyor, kullanıcı sadece kendi mülklerini görüyor
- Bildirimler tetikleniyor
- Raporlar export edilebiliyor
- Final integrated acceptance senaryoları geçiyor

## Requirement Coverage

- Covers: R001, R002, R003, R004, R005, R006, R007, R008, R009, R010, R011, R012, R013, R014, R015, R022, R023, R024
- Partially covers: none
- Leaves for later: R016 (import), R017 (mobil), R018 (SaaS), R019 (email/push)
- Orphan risks: none

## Slices

- [ ] **S01: Auth & Grup Bazlı Erişim** `risk:high` `depends:[]`
  > After this: Kullanıcı email+şifre ile login olur. Superadmin grup oluşturur, kullanıcı ekler, grup admini delege eder. API endpoint'leri JWT ile korunur. Test ile kanıtlanır.

- [ ] **S02: Mülk Yönetimi** `risk:medium` `depends:[S01]`
  > After this: Mülk eklenir/düzenlenir/silinir. Mülk gruba atanır. Kullanıcı sadece kendi grubundaki mülkleri görür. Multi-currency desteği çalışır. Mülk notları eklenebilir. Frontend'de mülk listesi ve detay sayfası çalışır.

- [ ] **S03: Kira & Kiracı Takibi** `risk:high` `depends:[S02]`
  > After this: Uzun dönem kiracı kaydedilir, aylık kira ödeme takibi yapılır, gecikme otomatik algılanır. Kısa dönem rezervasyon kaydedilir. Kira artış takibi çalışır. Frontend'de kira listesi, ödeme durumu ve kiracı bilgileri görünür.

- [ ] **S04: Gider & Fatura Takibi** `risk:low` `depends:[S02]`
  > After this: Mülk bazlı gider (bakım, vergi vs.) ve fatura (su, elektrik, doğalgaz, internet, aidat) kaydedilir. Son ödeme tarihi ve ödeme durumu takip edilir. Frontend'de gider ve fatura listeleri çalışır.

- [ ] **S05: Döküman Yönetimi** `risk:low` `depends:[S02]`
  > After this: Dosya yüklenir (tapu, sözleşme, sigorta), mülke bağlanır, kategorize edilir. Dosya görüntüleme ve indirme çalışır. Frontend'de döküman listesi ve yükleme formu çalışır.

- [ ] **S06: Dashboard, Bildirimler & Raporlama** `risk:medium` `depends:[S03,S04]`
  > After this: Dashboard mülk bazlı kâr/zarar, toplam gelir, ödenmemiş kiraları gösterir. Kira gecikme, fatura yaklaşma, sözleşme bitiş bildirimleri oluşur. Excel/PDF rapor export edilir, ROI hesaplanır. Kullanıcı sadece kendi mülklerinin verilerini görür.

## Boundary Map

### S01 → S02

Produces:
- `AuthController` → POST /api/auth/register, POST /api/auth/login, POST /api/auth/refresh
- `GroupsController` → CRUD /api/groups, POST /api/groups/{id}/members, POST /api/groups/{id}/properties
- `UsersController` → GET /api/users, PATCH /api/users/{id}/role
- JWT middleware → tüm authenticated endpoint'leri korur
- `ApplicationDbContext` → User, Group, GroupMember, Role entity'leri
- Auth service interfaces → IAuthService, ITokenService

Consumes:
- nothing (first slice)

### S02 → S03

Produces:
- `PropertiesController` → CRUD /api/properties, GET /api/properties (grup bazlı filtreleme)
- `PropertyNotesController` → CRUD /api/properties/{id}/notes
- `Property` entity → Id, Name, Type, Address, Currency, GroupId
- `PropertyNote` entity → Id, PropertyId, Content, CreatedAt
- Property access check middleware/service → kullanıcının mülke erişim yetkisi kontrolü

Consumes from S01:
- JWT auth middleware
- Group → Property ilişkisi (GroupId foreign key)
- User identity from JWT claims

### S02 → S04

Produces:
- `Property` entity ve access check service (aynı S02 → S03 ile)

Consumes from S01:
- JWT auth middleware, group membership

### S02 → S05

Produces:
- `Property` entity ve access check service

Consumes from S01:
- JWT auth middleware, group membership

### S03 → S06

Produces:
- `TenantsController` → CRUD /api/properties/{id}/tenants
- `RentPaymentsController` → CRUD /api/properties/{id}/rent-payments
- `ShortTermRentalsController` → CRUD /api/properties/{id}/short-term-rentals
- `Tenant` entity → Id, PropertyId, Name, Phone, Email, LeaseStart, LeaseEnd, MonthlyRent, Deposit
- `RentPayment` entity → Id, TenantId, Amount, DueDate, PaidDate, Status, Currency
- `ShortTermRental` entity → Id, PropertyId, CheckIn, CheckOut, TotalAmount, PlatformFee, Currency
- `RentIncrease` entity → Id, TenantId, NewAmount, EffectiveDate, IncreaseRate

Consumes from S02:
- Property entity + access check service

### S04 → S06

Produces:
- `ExpensesController` → CRUD /api/properties/{id}/expenses
- `BillsController` → CRUD /api/properties/{id}/bills
- `Expense` entity → Id, PropertyId, Category, Amount, Date, IsRecurring, Currency
- `Bill` entity → Id, PropertyId, Type (water/electric/gas/internet/dues), Amount, DueDate, PaidDate, Status, Currency

Consumes from S02:
- Property entity + access check service

### S05 (terminal)

Produces:
- `DocumentsController` → POST /api/properties/{id}/documents (upload), GET (list), GET/{docId} (download), DELETE
- `Document` entity → Id, PropertyId, FileName, Category, FilePath, UploadedAt

Consumes from S02:
- Property entity + access check service

### S06 (terminal)

Produces:
- `DashboardController` → GET /api/dashboard (aggregated financial summary)
- `NotificationsController` → GET /api/notifications
- `ReportsController` → GET /api/reports/profit-loss, GET /api/reports/export (Excel/PDF)
- Notification generation logic (kira gecikme, fatura yaklaşma, sözleşme bitiş)

Consumes from S03:
- Tenant, RentPayment, ShortTermRental, RentIncrease entities + endpoints
Consumes from S04:
- Expense, Bill entities + endpoints
