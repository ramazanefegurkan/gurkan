---
id: S01
milestone: M001
status: ready
---

# S01: Auth & Grup Bazlı Erişim — Context

<!-- Slice-scoped context. Milestone-only sections (acceptance criteria, completion class,
     milestone sequence) do not belong here — those live in the milestone context. -->

## Goal

Email+şifre ile JWT authentication, superadmin/grup admin/üye rol hiyerarşisi ve grup bazlı erişim kontrolü çalışır; tüm downstream slice'lar bu altyapıyı kullanır.

## Why this Slice

İlk slice — hiçbir şeye bağımlı değil, ama S02-S06'nın hepsi buna bağımlı. Auth ve erişim kontrolü yanlış kurulursa veri sızıntısı riski var. Bu yüzden high-risk olarak ilk sırada, erken valide edilmeli.

## Scope

### In Scope

- Email + şifre ile register/login (JWT + refresh token)
- Superadmin, grup admin, üye rol hiyerarşisi
- Grup CRUD (oluşturma, düzenleme, silme)
- Gruba kullanıcı ekleme/çıkarma
- Gruba mülk atama/çıkarma (mülk entity'si bu slice'da sadece placeholder — tam CRUD S02'de)
- Grup admin delegasyonu (superadmin bir kullanıcıyı grup admin yapar)
- Grup admin kendi grubunda tam yetki: üye ekleme/çıkarma, mülk atama/çıkarma
- JWT middleware ile tüm authenticated endpoint'lerin korunması
- Kullanıcı davet mekanizması: admin, kullanıcı adına hesap oluşturur (email + geçici şifre)
- Şifre değiştirme endpoint'i (profil sayfasından isteğe bağlı kullanım)
- Seed migration ile ilk superadmin oluşturma (email+şifre config/env'den gelir)
- Birden fazla superadmin desteklenmesi (mevcut superadmin başkasını superadmin yapabilir)

### Out of Scope

- Social login (Google, Facebook vs.) — sadece email+şifre
- Email gönderimi (davet linki, şifre sıfırlama maili) — R019 deferred
- Şifre sıfırlama (forgot password) — email gönderimi olmadan anlamsız, deferred
- Açık kayıt (self-registration) — sadece davet ile ekleme
- İlk girişte zorunlu şifre değiştirme — isteğe bağlı bırakıldı
- Frontend login/register UI — bu slice sadece API + middleware, frontend S02 ile gelecek
- Mülk CRUD — sadece gruba mülk atama placeholder'ı, tam mülk yönetimi S02'de

## Constraints

- Şifre politikası: minimum 6 karakter, başka kural yok (aile içi kullanım — basit tutulur)
- Davet mekanizması email gönderimi olmadan çalışmalı — admin geçici şifreyi kullanıcıya kendisi iletir (WhatsApp, telefon vs.)
- JWT token'da kullanıcının rolleri ve grup üyelikleri claim olarak bulunmalı — downstream middleware'ler buna güvenecek
- İlk superadmin seed migration ile oluşturulur, runtime'da register endpoint'i ile değil
- Kullanıcı birden fazla grupta olabilir — mülk listesi birleşik gösterilir (grup etiketi ile), grup seçici/switch yok

## Integration Points

### Consumes

- `PostgreSQL` — User, Group, GroupMember, Role entity'leri için veritabanı
- `appsettings.json / environment variables` — JWT secret, token expiry süreleri, seed superadmin bilgileri

### Produces

- `AuthController` → POST /api/auth/register, POST /api/auth/login, POST /api/auth/refresh, POST /api/auth/change-password
- `GroupsController` → CRUD /api/groups, POST /api/groups/{id}/members, DELETE /api/groups/{id}/members/{userId}, POST /api/groups/{id}/properties, DELETE /api/groups/{id}/properties/{propertyId}
- `UsersController` → GET /api/users, PATCH /api/users/{id}/role
- JWT middleware → tüm authenticated endpoint'leri korur
- `ApplicationDbContext` → User, Group, GroupMember, Role entity'leri + seed migration
- Auth service interfaces → IAuthService, ITokenService
- Group access check service → kullanıcının belirli bir gruba/mülke erişim yetkisi kontrolü

## Open Questions

- JWT token expiry süreleri (access token + refresh token) ne olmalı — execution sırasında standart değerlerle başlanır (access: 15dk, refresh: 7 gün), gerekirse ayarlanır.
- Refresh token rotation stratejisi (tek kullanımlık mı, çoklu session mı) — execution sırasında karar verilir, başlangıçta rotation ile gidilir.
- Grup silindiğinde üyelere ve mülklere ne olur — mülkler gruptan çıkar (unassigned kalır), üyeler gruptan çıkar. Superadmin yeniden atayabilir.
