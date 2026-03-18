---
estimated_steps: 6
estimated_files: 2
---

# T04: Build document screen with upload and download support

**Slice:** S05 — Mobil App Full Features
**Milestone:** M003

## Description

Documents require a different interaction pattern than the other sub-pages. Instead of CRUD forms, documents use file picking (expo-document-picker), file upload with FormData, file download with expo-file-system, and sharing with expo-sharing. This task builds the document list screen with upload, download/share, and delete functionality.

The key React Native constraints:
- **Upload:** Use `DocumentPicker.getDocumentAsync()` to pick a file, then upload via `FormData` with `{ uri, name, type }` — NOT `new File()`. The expo-document-picker returns exactly this shape.
- **Download:** Use `FileSystem.downloadAsync()` to save to the app's cache directory, then `Sharing.shareAsync()` to let the user open/save the file. Cannot use browser Blob/createElement pattern.
- **Packages:** `expo-document-picker`, `expo-file-system`, `expo-sharing` should already be installed by T01.

**Relevant skills:** None specifically required.

## Steps

1. **Verify packages are installed:** Check that `expo-document-picker`, `expo-file-system`, and `expo-sharing` are in `package.json`. If T01 already installed them, skip. Otherwise run `cd gurkan-mobile && npx expo install expo-document-picker expo-file-system expo-sharing`.

2. **Create `gurkan-mobile/app/(tabs)/properties/documents.tsx`** — Document list + upload + download screen:
   - Read `propertyId` from `useLocalSearchParams`
   - Fetch via `getDocuments(propertyId)`
   - **List section:** Each document card shows:
     - Original filename (truncated if long)
     - Category badge (colored by category using `DocumentCategoryLabels` — TitleDeed=blue, Contract=green, Insurance=purple, Invoice=orange, Photo=teal, Other=grey)
     - File size (formatted: B/KB/MB with helper)
     - Upload date (formatted with `toLocaleDateString('tr-TR')`)
     - Download button (MaterialIcons "file-download") → calls download function
     - Delete button (MaterialIcons "delete-outline") → Alert confirmation → `deleteDocument(propertyId, docId)` → refetch
   - **Upload section** (at top of screen):
     - Category picker: pressable chips showing all `DocumentCategory` values with Turkish labels
     - "Dosya Seç ve Yükle" button → triggers file pick + upload flow:
       1. Call `DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true })`
       2. If `result.canceled === false` (SDK 54 uses `canceled` boolean, not `type` check):
          - Get `{ uri, name, mimeType }` from `result.assets[0]`
          - Call `uploadDocument(propertyId, { uri, name, type: mimeType }, selectedCategory)` — this function in client.ts uses FormData
       3. Show uploading state (ActivityIndicator on the button)
       4. On success: refetch document list, show success message
       5. On error: show error via Alert.alert
   - **Download function:**
     - Call `downloadDocument(propertyId, documentId)` — this function in client.ts handles FileSystem.downloadAsync + Sharing.shareAsync
     - Show downloading state on the specific document's download button
     - On error: show error via Alert.alert
   - Empty state: "Henüz döküman yüklenmemiş" with upload prompt
   - Set `Stack.Screen options={{ title: 'Dökümanlar' }}`

3. **Ensure the `uploadDocument` function in `client.ts`** (implemented in T01) correctly handles RN FormData:
   ```typescript
   export async function uploadDocument(
     propertyId: string,
     file: { uri: string; name: string; type: string },
     category: string,
   ): Promise<DocumentResponse> {
     const formData = new FormData();
     formData.append('file', {
       uri: file.uri,
       name: file.name,
       type: file.type,
     } as any); // RN FormData accepts { uri, name, type } objects
     formData.append('category', category);
     const { data } = await api.post<DocumentResponse>(
       `/properties/${propertyId}/documents`,
       formData,
       { headers: { 'Content-Type': 'multipart/form-data' } },
     );
     return data;
   }
   ```
   If T01's implementation differs, adjust the screen's upload call accordingly.

4. **Ensure the `downloadDocument` function in `client.ts`** (implemented in T01) uses expo-file-system + expo-sharing:
   ```typescript
   export async function downloadDocument(
     propertyId: string,
     documentId: string,
   ): Promise<void> {
     const token = await getStorageItem('accessToken');
     const url = `${getApiUrl()}/properties/${propertyId}/documents/${documentId}/download`;
     const fileUri = FileSystem.cacheDirectory + `doc-${documentId}`;
     const result = await FileSystem.downloadAsync(url, fileUri, {
       headers: token ? { Authorization: `Bearer ${token}` } : {},
     });
     await Sharing.shareAsync(result.uri);
   }
   ```
   If T01's implementation differs, verify it works or adjust.

5. **Add `formatFileSize` helper** to the documents screen:
   ```typescript
   function formatFileSize(bytes: number): string {
     if (bytes < 1024) return `${bytes} B`;
     if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
     return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
   }
   ```

6. **Verify:**
   - `cd gurkan-mobile && npx tsc --noEmit` — zero errors
   - `cd gurkan-mobile && npx expo export --platform android` — successful bundle (all packages resolved)
   - `grep -n "document\.createElement\|URL\.createObjectURL\|new File(" gurkan-mobile/app/\(tabs\)/properties/documents.tsx` — zero matches (no web-only APIs)

## Must-Haves

- [ ] Document list screen renders with filename, category badge, file size, upload date
- [ ] Upload: `DocumentPicker.getDocumentAsync()` picks a file, category picker selects category, FormData upload with `{ uri, name, type }` pattern
- [ ] Download: `FileSystem.downloadAsync()` + `Sharing.shareAsync()` — no browser APIs
- [ ] Delete with Alert confirmation
- [ ] No web-only APIs: no `document.`, `window.`, `URL.createObjectURL`, `new File()`
- [ ] Pull-to-refresh, loading state, error+retry
- [ ] Turkish labels throughout
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npx expo export --platform android` succeeds

## Verification

- `cd gurkan-mobile && npx tsc --noEmit` — zero errors
- `cd gurkan-mobile && npx expo export --platform android` — successful bundle
- `ls gurkan-mobile/app/\(tabs\)/properties/documents.tsx` — file exists
- `grep "DocumentPicker" gurkan-mobile/app/\(tabs\)/properties/documents.tsx` — file picker used
- `grep "Sharing\|FileSystem" gurkan-mobile/app/\(tabs\)/properties/documents.tsx gurkan-mobile/src/api/client.ts` — RN download pattern used
- `grep -c "document\.createElement\|URL\.createObjectURL\|new File(" gurkan-mobile/app/\(tabs\)/properties/documents.tsx` — zero matches
- Final full-project check: `cd gurkan-mobile && npx tsc --noEmit && npx expo export --platform android` — both pass

## Inputs

- `gurkan-mobile/src/api/client.ts` — T01 implemented `getDocuments`, `uploadDocument`, `downloadDocument`, `deleteDocument`
- `gurkan-mobile/src/api/types.ts` — `DocumentResponse`, `DocumentCategory`, `DocumentCategoryLabels`, `DocumentCategoryType`
- `gurkan-mobile/src/theme.ts` — design tokens
- `gurkan-mobile/package.json` — T01 installed `expo-document-picker`, `expo-file-system`, `expo-sharing`
- `gurkan-mobile/app/(tabs)/properties/tenants.tsx` — T02's list screen as pattern reference
- `gurkan-mobile/app/(tabs)/properties/bills.tsx` — T03's bill list as pattern reference (action buttons on list items)

## Observability Impact

- **New signals:** `console.debug('[documents] fetching...')`, `[documents] loaded N documents`, `[documents] picking file...`, `[documents] uploading: filename`, `[documents] uploaded successfully`, `[documents] downloading: id`, `[documents] download complete`, `[documents] deleting: id`, `[documents] deleted`
- **Error signals:** `console.error('[documents] error', err)` on fetch failures, `console.error('[documents] upload error', err)` on upload failures, `console.error('[documents] download error', err)` on download failures, `console.error('[documents] delete error', err)` on delete failures
- **Inspection:** Expo Go console shows all lifecycle events; network inspector shows calls to `/properties/{id}/documents` (GET, POST, DELETE) and `/properties/{id}/documents/{id}/download` (GET)
- **Failure visibility:** User-facing Turkish error messages via `Alert.alert` on all action failures; retry button on initial load failure

## Expected Output

- `gurkan-mobile/app/(tabs)/properties/documents.tsx` — document list with upload, download/share, delete
- Passing `npx tsc --noEmit` and `npx expo export --platform android` confirming all S05 screens compile and bundle successfully
