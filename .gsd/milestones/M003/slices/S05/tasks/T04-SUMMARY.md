---
id: T04
parent: S05
milestone: M003
provides:
  - Document list screen with category badges, file size, upload date display
  - File upload via expo-document-picker with category selection and FormData
  - File download via expo-file-system + expo-sharing (no web-only APIs)
  - Delete with Alert confirmation and refetch
key_files:
  - gurkan-mobile/app/(tabs)/properties/documents.tsx
key_decisions:
  - Matched T01 uploadDocument signature (separate uri/name/type args) rather than plan's single-object pattern
  - Used category color scheme: TitleDeed=blue, Contract=green, Insurance=purple, Invoice=orange, Photo=teal, Other=grey
patterns_established:
  - File pick+upload flow: DocumentPicker.getDocumentAsync → result.assets[0] → uploadDocument(propertyId, uri, name, mimeType, category)
  - Download flow: downloadDocument(propertyId, docId, fileName) → handled in client.ts via ExpoFile.downloadFileAsync + Sharing.shareAsync
observability_surfaces:
  - console.debug('[documents] fetching/loaded/uploading/uploaded/downloading/deleting/deleted') lifecycle events
  - console.error('[documents] error/upload error/download error/delete error') on all failures
  - User-facing Turkish Alert.alert on all action errors
duration: ~15m
verification_result: passed
completed_at: 2026-03-18
blocker_discovered: false
---

# T04: Build document screen with upload and download support

**Built document list screen with expo-document-picker upload, expo-file-system/expo-sharing download, category badges, and delete — all RN-native, zero web APIs**

## What Happened

Created `documents.tsx` with three functional areas: (1) an upload section at the top with category picker chips and a "Dosya Seç ve Yükle" button that triggers `DocumentPicker.getDocumentAsync()` then calls `uploadDocument()` with the RN FormData pattern, (2) a document list showing cards with original filename, category badge (color-coded by category), file size (formatted with B/KB/MB helper), upload date (tr-TR locale), download button (triggers `downloadDocument()` in client.ts which uses ExpoFile.downloadFileAsync + Sharing.shareAsync), and delete button with Alert confirmation, and (3) standard loading/error/empty states matching the established S05 pattern. The `uploadDocument` function in client.ts already had the correct RN-compatible FormData signature from T01, taking separate `fileUri, fileName, fileType, category` parameters. No modifications to client.ts were needed.

## Verification

- `npx tsc --noEmit` — zero TypeScript errors
- `npx expo export --platform android` — successful bundle (1097 modules, 5077ms)
- No web-only APIs: `grep -nc "document.createElement|URL.createObjectURL|new File(" documents.tsx` returns 0
- DocumentPicker is used for file picking (confirmed via grep)
- Sharing/FileSystem are used in client.ts for download (confirmed via grep)
- 47 API client functions exported from client.ts
- File exists at expected path

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `npx tsc --noEmit` | 0 | ✅ pass | 15.9s |
| 2 | `npx expo export --platform android` | 0 | ✅ pass | 12.8s |
| 3 | `grep -nc "document.createElement\|URL.createObjectURL\|new File(" documents.tsx` | 1 (no match) | ✅ pass | <1s |
| 4 | `grep "DocumentPicker" documents.tsx` | 0 | ✅ pass | <1s |
| 5 | `grep "Sharing\|FileSystem" documents.tsx client.ts` | 0 | ✅ pass | <1s |
| 6 | `ls documents.tsx` | 0 | ✅ pass | <1s |
| 7 | `grep -c "export async function" client.ts` → 47 | 0 | ✅ pass | <1s |
| 8 | Slice-level web-API leak check (localStorage hits only in Platform.OS-guarded storage helpers) | 0 | ✅ pass | <1s |

## Diagnostics

- **Runtime logging:** All document lifecycle events logged via `console.debug('[documents] ...')` — visible in Expo Go dev tools console
- **Network inspector:** Expo Go shows API calls to `/properties/{id}/documents` (GET list, POST upload, DELETE) and `/properties/{id}/documents/{id}/download` (GET download)
- **Upload flow:** `[documents] picking file...` → `[documents] uploading: filename` → `[documents] uploaded successfully` in console
- **Download flow:** `[documents] downloading: id` → `[documents] download complete` → downloaded to cache dir, shared via share sheet
- **Delete flow:** `[documents] deleting: id` → `[documents] deleted` in console
- **Error visibility:** `console.error('[documents] ... error', err)` on all API failures with full error object; user-facing Turkish Alert.alert

## Deviations

- Plan suggested `uploadDocument(propertyId, file: { uri, name, type }, category)` single-object signature but T01 implemented `uploadDocument(propertyId, fileUri, fileName, fileType, category)` with separate args — matched the actual implementation instead of the plan's pseudocode.
- Plan referenced `FileSystem.downloadAsync()` (old expo-file-system API) but T01 implemented with SDK 54's `ExpoFile.downloadFileAsync()` — no change needed, the screen calls the existing `downloadDocument()` function which handles this internally.

## Known Issues

None.

## Files Created/Modified

- `gurkan-mobile/app/(tabs)/properties/documents.tsx` — Document list screen with upload, download/share, and delete
- `.gsd/milestones/M003/slices/S05/tasks/T04-PLAN.md` — Added Observability Impact section (pre-flight fix)
