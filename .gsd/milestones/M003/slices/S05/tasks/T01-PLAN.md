---
estimated_steps: 6
estimated_files: 3
---

# T01: Implement API client functions and wire property detail sub-page navigation

**Slice:** S05 — Mobil App Full Features
**Milestone:** M003

## Description

All sub-page screens depend on two things: (1) working API client functions to fetch/mutate data, and (2) navigation routes + links from the property detail screen. This task implements both.

The API client (`gurkan-mobile/src/api/client.ts`) already has ~30 commented TODO stubs with signatures. Each stub needs to be uncommented and its body written, matching the web app's endpoint pattern exactly. The document upload function must use React Native's FormData pattern (`{ uri, name, type }` object, NOT `new File()`). The document download function must use `expo-file-system` + `expo-sharing` instead of browser Blob APIs.

The property detail screen (`[id].tsx`) needs a new "Quick Links" section with navigation buttons for each sub-page. The properties Stack layout (`_layout.tsx`) needs new `Stack.Screen` entries for all sub-page routes.

**Relevant skills:** None specifically required — this is pure TypeScript API client work + React Native navigation.

## Steps

1. **Open `gurkan-mobile/src/api/client.ts`** and replace the entire S05 TODO stubs block (from `// ── S05 TODO stubs ──` to `export default api;`) with real function implementations. Import all needed types at the top of the file. The exact endpoint paths match the web client (`gurkan-ui/src/api/client.ts`):
   - Tenants: `GET/POST /properties/{id}/tenants`, `GET/PUT /properties/{id}/tenants/{tid}`, `POST .../terminate`
   - Rent Payments: `GET /properties/{pid}/tenants/{tid}/rent-payments`, `PATCH .../rent-payments/{id}/pay`
   - Rent Increases: `GET/POST /properties/{pid}/tenants/{tid}/rent-increases`
   - Short-Term Rentals: `GET/POST /properties/{pid}/short-term-rentals`, `GET/PUT/DELETE .../short-term-rentals/{id}`
   - Expenses: `GET/POST /properties/{pid}/expenses`, `GET/PUT/DELETE .../expenses/{id}`
   - Bills: `GET/POST /properties/{pid}/bills`, `GET/PUT/DELETE .../bills/{id}`, `PATCH .../bills/{id}/pay`
   - Documents: `GET/POST /properties/{pid}/documents`, `DELETE .../documents/{id}`
   - Document download: Use `expo-file-system` `downloadAsync()` + `expo-sharing` `shareAsync()`. Import these at the top with conditional requires or standard imports.
   - Document upload: Use `FormData` with `{ uri: string, name: string, type: string }` — this is the React Native pattern. Do NOT use `new File()`.

2. **Update imports at the top of `client.ts`** to include all newly-needed types from `./types`:
   - `TenantListItem`, `TenantResponse`, `CreateTenantRequest`, `UpdateTenantRequest`
   - `RentPaymentResponse`, `MarkPaymentPaidRequest`
   - `RentIncreaseResponse`, `CreateRentIncreaseRequest`
   - `ShortTermRentalResponse`, `CreateShortTermRentalRequest`, `UpdateShortTermRentalRequest`
   - `ExpenseResponse`, `CreateExpenseRequest`, `UpdateExpenseRequest`
   - `BillResponse`, `CreateBillRequest`, `UpdateBillRequest`
   - `DocumentResponse`

3. **Add `expo-file-system` and `expo-sharing` imports** at the top of `client.ts` for the document download function:
   ```typescript
   import * as FileSystem from 'expo-file-system';
   import * as Sharing from 'expo-sharing';
   ```
   These packages need to be installed first — run `npx expo install expo-file-system expo-sharing expo-document-picker` from `gurkan-mobile/` directory. (expo-document-picker is needed by T04 but install now to avoid issues).

4. **Update property detail screen** (`gurkan-mobile/app/(tabs)/properties/[id].tsx`):
   - Add a new "Yönetim" (Management) section after the Dates section with navigation buttons:
     - 🏠 Kiracılar → `router.push({ pathname: '/(tabs)/properties/tenants', params: { propertyId: id } })`
     - 📅 Kısa Dönem → `router.push({ pathname: '/(tabs)/properties/short-term-rentals', params: { propertyId: id } })`
     - 💰 Giderler → `router.push({ pathname: '/(tabs)/properties/expenses', params: { propertyId: id } })`
     - 📄 Faturalar → `router.push({ pathname: '/(tabs)/properties/bills', params: { propertyId: id } })`
     - 📁 Dökümanlar → `router.push({ pathname: '/(tabs)/properties/documents', params: { propertyId: id } })`
   - Import `useRouter` from `expo-router`
   - Style navigation buttons as cards with icon + label + chevron, using theme tokens

5. **Register new Stack.Screen entries** in `gurkan-mobile/app/(tabs)/properties/_layout.tsx`:
   - Add screens for: `tenants`, `tenant-detail`, `tenant-form`, `short-term-rentals`, `short-term-rental-form`, `expenses`, `expense-form`, `bills`, `bill-form`, `documents`
   - Each with an appropriate Turkish title (can be overridden by the screen itself)

6. **Verify:** Run `cd gurkan-mobile && npx tsc --noEmit` — must pass with zero errors.

## Must-Haves

- [ ] All ~30 API functions from the S05 TODO stubs are implemented and exported
- [ ] Document upload uses RN FormData pattern (`{ uri, name, type }`), NOT `new File()`
- [ ] Document download uses `expo-file-system` + `expo-sharing`, NOT browser Blob APIs
- [ ] Property detail screen has navigation buttons to all 5 sub-page categories
- [ ] All sub-page routes registered in properties Stack layout
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] No `document.`, `window.`, `URL.createObjectURL` usage (except in comments)

## Verification

- `cd gurkan-mobile && npx tsc --noEmit` — zero errors
- `grep -c "export async function" gurkan-mobile/src/api/client.ts` — should be ~37+ (7 existing S04 + ~30 new S05)
- `grep -n "router.push" gurkan-mobile/app/\(tabs\)/properties/\[id\].tsx` — 5 navigation links present
- No web-only APIs: `grep -rn "new File\|document\.createElement\|URL\.createObjectURL" gurkan-mobile/src/api/client.ts` — zero matches

## Inputs

- `gurkan-mobile/src/api/client.ts` — existing S04 client with commented S05 stubs
- `gurkan-mobile/src/api/types.ts` — all TypeScript types already ported (612 lines)
- `gurkan-mobile/app/(tabs)/properties/[id].tsx` — property detail screen to modify
- `gurkan-mobile/app/(tabs)/properties/_layout.tsx` — Stack layout to extend
- `gurkan-ui/src/api/client.ts` — reference for exact endpoint paths/signatures (lines 244-580)

## Expected Output

- `gurkan-mobile/src/api/client.ts` — all S05 API functions implemented and typed
- `gurkan-mobile/app/(tabs)/properties/[id].tsx` — property detail with sub-page navigation links
- `gurkan-mobile/app/(tabs)/properties/_layout.tsx` — all sub-page routes registered
- `gurkan-mobile/package.json` — updated with `expo-file-system`, `expo-sharing`, `expo-document-picker` dependencies

## Observability Impact

- **New signals:** All ~30 API client functions follow the existing pattern — callers (screen components in T02–T04) will emit `console.debug('[domain] fetching...')` and `console.error('[domain] error', err)` on every API call. The client functions themselves are thin wrappers, so observability lives at the screen layer.
- **Inspection:** `grep -c "export async function" gurkan-mobile/src/api/client.ts` shows count of implemented API functions. Navigation links are visible in the property detail screen when running in Expo Go.
- **Failure visibility:** API failures propagate as Axios errors to the calling screen, which displays Turkish error messages with retry buttons. Network errors are visible in Expo Go's network inspector.
