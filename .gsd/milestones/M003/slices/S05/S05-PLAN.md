# S05: Mobil App Full Features

**Goal:** Tüm property sub-pages (kiracılar, kısa dönem, giderler, faturalar, dökümanlar) mobilde çalışıyor. CRUD işlemleri ve form'lar mobilde functional.
**Demo:** Expo Go'da property detail → alt sayfa linklerine tıkla → kiracı listesi/detay/form, kısa dönem kiralama listesi/form, gider listesi/form, fatura listesi/form (mark-paid dahil), döküman listesi (upload/download) — hepsi API'den gerçek veri çeker ve CRUD işlemleri çalışır.

## Must-Haves

- Property detail ekranında tüm alt sayfalara (Kiracılar, Kısa Dönem, Giderler, Faturalar, Dökümanlar) navigasyon linkleri
- Kiracı listesi (aktif/geçmiş ayrımı), kiracı detay (kira ödeme tablosu + ödeme işaretle + sonlandır), kiracı oluştur/düzenle formu
- Kısa dönem kiralama listesi + oluştur/düzenle formu
- Gider listesi + oluştur/düzenle formu
- Fatura listesi (ödendi işaretle aksiyonu dahil) + oluştur/düzenle formu
- Döküman listesi + dosya yükleme (expo-document-picker) + indirme/paylaşma (expo-file-system + expo-sharing)
- Tüm ekranlarda pull-to-refresh, loading state, error state + retry, Türkçe label'lar
- `npx tsc --noEmit` sıfır hata, `npx expo export --platform android` başarılı bundle

## Proof Level

- This slice proves: integration (mobile screens → production REST API CRUD)
- Real runtime required: yes (Expo Go on device/emulator for full UAT)
- Human/UAT required: yes (manual testing on device — CRUD flows, document upload/download)

## Verification

- `cd gurkan-mobile && npx tsc --noEmit` — zero TypeScript errors
- `cd gurkan-mobile && npx expo export --platform android` — successful bundle (no RN-incompatible APIs)
- `grep -rn "document\.\|window\.\|localStorage\." gurkan-mobile/app/ gurkan-mobile/src/ --include="*.ts" --include="*.tsx" | grep -v "Platform.OS" | grep -v "node_modules" | grep -v "// " | grep -v "expo-document-picker"` — no web-only API leaks (document. hits should only be expo-document-picker package refs)
- All ~30 API client functions exported and typed in `gurkan-mobile/src/api/client.ts`
- All new screen files render without import errors
- Manual Expo Go checklist: navigate property detail → each sub-page loads data, create/edit forms submit, delete confirms, documents upload/download

## Observability / Diagnostics

- Runtime signals: `console.debug('[tenants]')`, `console.debug('[short-term]')`, `console.debug('[expenses]')`, `console.debug('[bills]')`, `console.debug('[documents]')` — all screen-level fetch/error lifecycle logging following S04 pattern
- Inspection surfaces: Expo Go network inspector shows all API calls; console.debug messages in dev tools
- Failure visibility: `console.error('[component] fetch/action error')` on all API failures with error object; user-facing Turkish error messages with retry button
- Redaction constraints: none (no secrets in mobile app state)

## Integration Closure

- Upstream surfaces consumed: `gurkan-mobile/src/api/client.ts` (axios instance + interceptors from S04), `gurkan-mobile/src/api/types.ts` (all TS types from S04), `gurkan-mobile/src/theme.ts` (design tokens), `gurkan-mobile/app/(tabs)/properties/_layout.tsx` (Stack navigator), `gurkan-mobile/app/(tabs)/properties/[id].tsx` (property detail — will be modified to add nav links)
- New wiring introduced in this slice: New Stack.Screen entries in properties `_layout.tsx` for all sub-page routes; sub-page navigation links on property detail screen; `expo-document-picker` + `expo-file-system` + `expo-sharing` dependencies
- What remains before the milestone is truly usable end-to-end: S06 (Push Notifications) — device token registration + push delivery

## Tasks

- [x] **T01: Implement API client functions and wire property detail sub-page navigation** `est:45m`
  - Why: All sub-page screens need working API functions and route registrations. This task unblocks T02–T04 by uncommenting+implementing ~30 API stubs in `client.ts`, adding sub-page quick-links to the property detail screen, and registering new Stack.Screen routes.
  - Files: `gurkan-mobile/src/api/client.ts`, `gurkan-mobile/app/(tabs)/properties/[id].tsx`, `gurkan-mobile/app/(tabs)/properties/_layout.tsx`
  - Do: (1) Replace all S05 TODO stub comments in `client.ts` with real function implementations matching the web app's endpoint signatures. Document upload must use RN-compatible FormData (`{ uri, name, type }` not `new File()`). Document download must use `expo-file-system` + `expo-sharing` instead of browser Blob APIs. (2) Add a "Quick Links" section to property detail screen with navigation buttons for Kiracılar, Kısa Dönem, Giderler, Faturalar, Dökümanlar. (3) Register all new sub-page screens in `_layout.tsx` Stack. Use flat route pattern with query params (`propertyId`).
  - Verify: `cd gurkan-mobile && npx tsc --noEmit` passes. All ~30 functions exported from client.ts. Property detail screen compiles with navigation links.
  - Done when: API client has all S05 functions implemented and typed, property detail has working navigation buttons to sub-pages, all routes registered in Stack layout.

- [x] **T02: Build tenant screens — list, detail with payments, and create/edit form** `est:1h30m`
  - Why: Tenants is the most complex sub-page — list with active/past split, detail with rent payment table + mark-paid action + terminate, and full create/edit form. Proves the complete CRUD+nested-data pattern.
  - Files: `gurkan-mobile/app/(tabs)/properties/tenants.tsx`, `gurkan-mobile/app/(tabs)/properties/tenant-detail.tsx`, `gurkan-mobile/app/(tabs)/properties/tenant-form.tsx`
  - Do: (1) Tenant list screen: fetch tenants, split into active/past sections, show name, rent amount, lease dates, active badge. "Yeni Kiracı" FAB. Tap → tenant detail. (2) Tenant detail screen: fetch tenant + rent payments + rent increases. Show tenant info, rent payment table (with status badges, mark-paid action for Pending/Late), terminate button with confirmation Alert. (3) Tenant form: TextInput fields for all tenant properties, date inputs with format hint (YYYY-MM-DD), currency picker, save via createTenant/updateTenant, navigate back on success. All dates sent as UTC ISO (K012).
  - Verify: `cd gurkan-mobile && npx tsc --noEmit` passes. Screens render with mock data in Expo Go.
  - Done when: Tenant list shows active/past sections, tenant detail displays payments with mark-paid action, tenant form creates/edits tenants via API, terminate action works with confirmation.

- [x] **T03: Build short-term rental, expense, and bill screens** `est:1h30m`
  - Why: Three simpler sub-page categories all follow the same list+form pattern. Grouping avoids unnecessary context-switching overhead while keeping each screen's scope straightforward.
  - Files: `gurkan-mobile/app/(tabs)/properties/short-term-rentals.tsx`, `gurkan-mobile/app/(tabs)/properties/short-term-rental-form.tsx`, `gurkan-mobile/app/(tabs)/properties/expenses.tsx`, `gurkan-mobile/app/(tabs)/properties/expense-form.tsx`, `gurkan-mobile/app/(tabs)/properties/bills.tsx`, `gurkan-mobile/app/(tabs)/properties/bill-form.tsx`
  - Do: (1) Short-term rental list: fetch rentals, show cards with guest name, dates, amounts, platform badge. Delete with confirm. "Yeni Kayıt" button → form. (2) Short-term rental form: fields for guest, dates, rates, platform picker, currency. (3) Expense list: fetch expenses, show cards with category badge, amount, date, description. Delete with confirm. "Yeni Gider" button → form. (4) Expense form: category picker (chips), description, amount, currency, date, recurring toggle. (5) Bill list: fetch bills, show cards with type badge, status badge, amount, due date. Mark-paid action (PATCH) for Pending/Overdue bills. Delete with confirm. "Yeni Fatura" button → form. (6) Bill form: type picker, amount, currency, due date, notes. All dates UTC ISO (K012). All enum values are strings (K011).
  - Verify: `cd gurkan-mobile && npx tsc --noEmit` passes. All 6 new screens compile without errors.
  - Done when: Short-term rental list+form, expense list+form, and bill list+form (including mark-paid) all render and submit CRUD operations via API.

- [x] **T04: Build document screen with upload and download support** `est:45m`
  - Why: Documents require new Expo packages and a different interaction pattern than CRUD forms — file picking, upload with FormData, download with expo-file-system, and sharing with expo-sharing. Kept separate because of the dependency installation and RN-specific file handling.
  - Files: `gurkan-mobile/app/(tabs)/properties/documents.tsx`, `gurkan-mobile/package.json`
  - Do: (1) Install `expo-document-picker`, `expo-file-system`, `expo-sharing` via `npx expo install`. (2) Document list screen: fetch documents, show cards with filename, category badge, file size, upload date. Category filter (optional). (3) Upload: use `DocumentPicker.getDocumentAsync()` to pick file, category picker (chips or modal), upload via FormData with `{ uri, name, type }` pattern (NOT `new File()`). Show uploading state. (4) Download: use `FileSystem.downloadAsync()` to save to cache, then `Sharing.shareAsync()` to open share sheet. (5) Delete with confirmation Alert. Türkçe labels throughout.
  - Verify: `cd gurkan-mobile && npx tsc --noEmit` passes. `npx expo export --platform android` succeeds (packages resolved). No `document.createElement` or `URL.createObjectURL` in document screen.
  - Done when: Document list renders, file upload from device works via expo-document-picker, download triggers share sheet via expo-sharing, delete with confirmation works.

## Files Likely Touched

- `gurkan-mobile/src/api/client.ts` — Implement all S05 API functions
- `gurkan-mobile/app/(tabs)/properties/[id].tsx` — Add sub-page navigation links
- `gurkan-mobile/app/(tabs)/properties/_layout.tsx` — Register new Stack.Screen routes
- `gurkan-mobile/app/(tabs)/properties/tenants.tsx` — Tenant list
- `gurkan-mobile/app/(tabs)/properties/tenant-detail.tsx` — Tenant detail + payments
- `gurkan-mobile/app/(tabs)/properties/tenant-form.tsx` — Tenant create/edit form
- `gurkan-mobile/app/(tabs)/properties/short-term-rentals.tsx` — Short-term rental list
- `gurkan-mobile/app/(tabs)/properties/short-term-rental-form.tsx` — Short-term rental form
- `gurkan-mobile/app/(tabs)/properties/expenses.tsx` — Expense list
- `gurkan-mobile/app/(tabs)/properties/expense-form.tsx` — Expense form
- `gurkan-mobile/app/(tabs)/properties/bills.tsx` — Bill list + mark-paid
- `gurkan-mobile/app/(tabs)/properties/bill-form.tsx` — Bill form
- `gurkan-mobile/app/(tabs)/properties/documents.tsx` — Document list + upload + download
- `gurkan-mobile/package.json` — New expo packages for documents
