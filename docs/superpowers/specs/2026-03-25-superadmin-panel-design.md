# Superadmin Panel Design

## Problem

Kullanıcı ve grup yönetimi şu an manuel olarak veritabanından yapılıyor. Mevcut API endpoint'leri bu işlemleri destekliyor ancak bunları kullanan bir frontend arayüzü bulunmuyor.

## Scope

- Kullanıcı yönetimi (listeleme, oluşturma, rol değiştirme)
- Grup yönetimi (CRUD, üye yönetimi, mülk atama)

Out of scope: şifre sıfırlama, audit log, kullanıcı silme.

## Navigation

Mevcut sidebar'da ana menü öğelerinin altına separator ve "Yönetim" section başlığı eklenir. Bu section altında "Kullanıcılar" ve "Gruplar" linkleri bulunur.

Görünürlük: Sadece `SuperAdmin` rolündeki kullanıcılara gösterilir. `useAuth()` context'inden `user.role` kontrolü ile.

## Routes

| Route | Sayfa | Açıklama |
|-------|-------|----------|
| `/admin/users` | UserList | Kullanıcı tablosu + yeni kullanıcı modal |
| `/admin/groups` | GroupList | Grup kartları + yeni grup modal |
| `/admin/groups/:id` | GroupDetail | Grup detayı, üye ve mülk yönetimi |

Tüm `/admin/*` route'ları `SuperAdminRoute` guard'ı ile korunur. Yetkisiz erişimde `/dashboard`'a redirect.

## Kullanıcılar Sayfası

### Liste (`/admin/users`)

Tablo kolonları:
- Ad Soyad
- Email
- Rol (badge: SuperAdmin terracotta, User gri)
- Grup Sayısı
- Kayıt Tarihi

Aksiyonlar:
- **Yeni Kullanıcı:** Üst sağdaki buton modal açar
- **Rol Değiştir:** Satırdaki aksiyon menüsünden (kendi rolünü değiştiremez — API bunu zaten engelliyor)

### Yeni Kullanıcı Modal

Form alanları:
- Ad Soyad (text, required)
- Email (email, required)
- Şifre (password, required)
- Rol (select: User / SuperAdmin, default: User)

Submit: `POST /api/auth/register` — mevcut endpoint.

### API Eşleştirmesi

| İşlem | Endpoint | Durum |
|-------|----------|-------|
| Kullanıcıları listele | `GET /api/users` | Mevcut |
| Kullanıcı oluştur | `POST /api/auth/register` | Mevcut |
| Rol değiştir | `PATCH /api/users/{id}/role` | Mevcut |

## Gruplar Sayfası

### Liste (`/admin/groups`)

Kart grid (2 kolon desktop, 1 kolon mobil). Her kart:
- Grup adı
- Açıklama
- Üye sayısı
- Mülk sayısı (PropertyCount, mevcut GroupResponse'da var)

Tıklama: `/admin/groups/:id` detay sayfasına yönlendirir.

**Yeni Grup:** Üst sağdaki buton modal açar (Ad required, Açıklama optional).

### Detay (`/admin/groups/:id`)

Üst bölüm:
- Grup adı ve açıklaması
- Düzenle butonu (modal ile ad/açıklama güncelleme)
- Sil butonu (onay dialog'u ile)

Üyeler bölümü:
- Mevcut üyeler listesi: Ad, Email, Rol (Admin/Member), katılma tarihi
- "Üye Ekle" butonu → Modal: kullanıcı seçimi (dropdown — sadece gruba henüz üye olmayan kullanıcılar listelenir) + rol seçimi (Admin/Member)
- Üye çıkarma: satırdaki aksiyon

Mülkler bölümü:
- Atanmış mülkler listesi: Mülk adı, tipi
- "Mülk Ata" butonu → Modal: atanmamış mülklerden seçim
- Atama kaldırma: satırdaki aksiyon

### API Eşleştirmesi

| İşlem | Endpoint | Durum |
|-------|----------|-------|
| Grupları listele | `GET /api/groups` | Mevcut |
| Grup detayı | `GET /api/groups/{id}` | Mevcut |
| Grup oluştur | `POST /api/groups` | Mevcut |
| Grup güncelle | `PUT /api/groups/{id}` | Mevcut |
| Grup sil | `DELETE /api/groups/{id}` | Mevcut |
| Üye ekle | `POST /api/groups/{id}/members` | Mevcut |
| Üye çıkar | `DELETE /api/groups/{id}/members/{memberId}` | Mevcut |
| Mülk ata | `POST /api/groups/{id}/properties` | Mevcut |
| Mülk atamasını kaldır | `DELETE /api/groups/{id}/properties/{propertyId}` | Mevcut |

## Teknik Kararlar

- **Yeni API endpoint'i gerekmez.** Tüm işlemler mevcut endpoint'lerle karşılanır.
- **Component pattern:** Projedeki mevcut pattern takip edilir — sayfa component'leri `src/pages/Admin/` altında, CSS dosyaları aynı dizinde.
- **Modal component:** Projedeki mevcut modal pattern kullanılır veya basit bir reusable modal oluşturulur.
- **API client:** Mevcut `client.ts` axios instance'ına yeni fonksiyonlar eklenir.
- **Route guard:** `ProtectedRoute` pattern'ine benzer `SuperAdminRoute` wrapper.

## Dosya Yapısı

```
gurkan-ui/src/
  pages/Admin/
    Admin.css
    UserList.tsx
    UserFormModal.tsx
    GroupList.tsx
    GroupFormModal.tsx
    GroupDetail.tsx
    MemberModal.tsx
    PropertyAssignModal.tsx
  api/client.ts          (yeni fonksiyonlar eklenir)
  App.tsx                (yeni route'lar eklenir)
  components/Layout.tsx  (sidebar'a Yönetim section'ı eklenir)
```
