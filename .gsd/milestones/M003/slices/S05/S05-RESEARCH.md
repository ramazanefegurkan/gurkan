# S05 ("Mobil App Full Features") — Research

**Date:** 2026-03-18
**Depth:** Light — S04 established all patterns (navigation, auth, API client, theme, screen layout). S05 is applying those same patterns to add remaining property sub-pages. All TypeScript types and API function stubs already exist.

## Summary

S05 adds the remaining property sub-pages to the Expo mobile app: Tenants (list + detail with payment table + create/edit form), Short-Term Rentals (list + create/edit), Expenses (list + create/edit), Bills (list + mark-paid + create/edit), Documents (list + upload + download), and a Notifications detail view that already exists from S04. The property detail screen (`[id].tsx`) needs navigation links to these sub-pages.

All foundation work is done: the Expo project (`gurkan-mobile/`) has auth, token refresh, 3-tab navigation, dashboard, property list/detail, and notifications. The API client (`src/api/client.ts`) has commented stubs for every S05 endpoint. All TypeScript types (`src/api/types.ts`, 612 lines) are already ported from the web app. The theme system (`src/theme.ts`) provides all design tokens.

The primary work is: (1) uncomment and implement ~30 API client functions, (2) build ~10-12 new screen files following the established pattern (fetch → loading → error → render with ScrollView, RefreshControl, StyleSheet), (3) add navigation from property detail to sub-pages, and (4) handle mobile-specific concerns for documents (expo-document-picker for upload, expo-file-system + expo-sharing for download).

## Recommendation

Build in feature-vertical order — each sub-page category as an independent task. Start with Tenants (most complex — has list, detail, form, payment table, terminate action) since it exercises the full CRUD+navigation pattern. Then Short-Term Rentals, Expenses, Bills (all simpler list+form patterns), then Documents (requires new Expo packages). The property detail screen needs a "quick links" section added early to navigate to sub-pages.

## Implementation Landscape

### Key Files

**Existing (modify):**
- `gurkan-mobile/src/api/client.ts` — Uncomment ~30 S05 API function stubs. Document upload needs `FormData` (React Native compatible). Document download needs `expo-file-system` + `expo-sharing` instead of browser Blob/createElement pattern.
- `gurkan-mobile/app/(tabs)/properties/[id].tsx` — Add navigation links/buttons to sub-pages (Tenants, Short-Term, Expenses, Bills, Documents). These are `router.push` calls to new screens within the properties stack.
- `gurkan-mobile/app/(tabs)/properties/_layout.tsx` — Register new Stack.Screen entries for sub-page routes.

**New screens to create:**
- `gurkan-mobile/app/(tabs)/properties/[id]/tenants.tsx` — Tenant list (active/past sections, add button)
- `gurkan-mobile/app/(tabs)/properties/[id]/tenant-detail.tsx` or `tenants/[tenantId].tsx` — Tenant detail with payment table, terminate action
- `gurkan-mobile/app/(tabs)/properties/[id]/tenant-form.tsx` — Create/edit tenant form
- `gurkan-mobile/app/(tabs)/properties/[id]/short-term-rentals.tsx` — Short-term rental list
- `gurkan-mobile/app/(tabs)/properties/[id]/short-term-rental-form.tsx` — Create/edit short-term rental form
- `gurkan-mobile/app/(tabs)/properties/[id]/expenses.tsx` — Expense list
- `gurkan-mobile/app/(tabs)/properties/[id]/expense-form.tsx` — Create/edit expense form
- `gurkan-mobile/app/(tabs)/properties/[id]/bills.tsx` — Bill list with mark-paid action
- `gurkan-mobile/app/(tabs)/properties/[id]/bill-form.tsx` — Create/edit bill form
- `gurkan-mobile/app/(tabs)/properties/[id]/documents.tsx` — Document list with upload, download

**Route structure decision:** Expo Router file-based routing means `app/(tabs)/properties/[id]/tenants.tsx` creates a route like `/properties/123/tenants`. This requires restructuring the properties Stack to support nested dynamic routes. Alternative: use flat routes like `app/(tabs)/properties/tenants.tsx` and pass `propertyId` as a query param. The flat approach is simpler for Expo Router — use `router.push({ pathname: '/(tabs)/properties/tenants', params: { propertyId } })`.

### Patterns to Follow (from S04)

Each screen follows this exact pattern from `[id].tsx`, `index.tsx`, and `notifications.tsx`:

1. **State:** `useState` for data, loading, refreshing, error
2. **Fetch:** `useCallback` async function with `console.debug` logging
3. **Loading:** centered `ActivityIndicator` with `colors.accent`
4. **Error:** centered error icon + message + "Tekrar Dene" retry button
5. **Render:** `ScrollView` with `RefreshControl`, sections with `View` + `StyleSheet`
6. **Styling:** `StyleSheet.create()` at bottom, theme tokens from `@/src/theme`
7. **Navigation:** `useLocalSearchParams` for route params, `Stack.Screen options` for dynamic title

For CRUD forms:
- Use `TextInput`, `Pressable` (buttons), `ScrollView` with `KeyboardAvoidingView`
- Date fields: use text input with format hint (or a simple date picker library)
- Enum selects: render as pressable chips or a modal picker
- Submit: POST/PUT via API client, navigate back on success
- Turkish labels throughout (matching web UI)

### Build Order

1. **API client functions + Property detail navigation links (T01):** Uncomment and implement all API stubs in `client.ts`. Add sub-page navigation section to `[id].tsx`. Register new routes in `_layout.tsx`. This unblocks all other tasks.

2. **Tenants screens (T02):** List (active/past split), detail (with rent payment table + terminate action), create/edit form. Most complex sub-page — exercises full CRUD + nested data.

3. **Short-Term Rentals + Expenses screens (T03):** List + create/edit for both. Simpler list+form pattern. Can combine because both are straightforward.

4. **Bills + Documents screens (T04):** Bills list with mark-paid + create/edit. Documents list with upload + download. Documents needs `expo-document-picker` and `expo-file-system` + `expo-sharing` packages. Bills has the mark-paid action pattern.

### Verification Approach

1. `npx tsc --noEmit` — zero TypeScript errors after each task
2. `npx expo export --platform android` — successful bundle (catches RN-incompatible APIs)
3. Manual verification checklist for Expo Go testing:
   - Navigate to property detail → see sub-page links
   - Each sub-page: loads list, shows empty state, create form works, edit form pre-fills, delete confirms
   - Documents: upload from device, download/share works
   - Bills: mark-paid action updates status
   - Tenants: terminate action works
4. No `document.`, `window.`, `localStorage.` usage except Platform.OS-guarded (grep check)

## Constraints

- **No `document` or `window` APIs:** The web client's `downloadDocument` uses `document.createElement('a')` and `URL.createObjectURL`. The mobile equivalent must use `expo-file-system` to save and `expo-sharing` to share/open.
- **No `File` constructor on React Native:** Document upload uses `FormData` with a `{ uri, name, type }` object instead of a `File` instance. This is the standard RN pattern.
- **Date picker:** React Native doesn't have a native `<input type="date">`. Options: (a) plain TextInput with format hint, (b) `@react-native-community/datetimepicker`. Given the number of date fields (tenant lease dates, expense dates, bill dates), a date picker library is worthwhile but adds a dependency. A simple text input with validation is acceptable for MVP.
- **Expo Router nested dynamic routes:** `app/(tabs)/properties/[id]/tenants.tsx` creates routes under `/properties/:id/tenants`. This works with Expo Router's file-based routing but the Stack navigator in `_layout.tsx` needs to know about these sub-routes. Alternatively, flat routes with query params are simpler.

## Common Pitfalls

- **FormData on React Native:** Don't use `new File()` — RN FormData accepts `{ uri: string, name: string, type: string }` as the file value. The `expo-document-picker` returns exactly this shape.
- **Date serialization:** All dates must be sent as UTC ISO strings with `T00:00:00Z` suffix (K012). Reuse the `toUtcIso()` pattern from the web app.
- **Enum string values:** Backend uses `JsonStringEnumConverter` — all enum values are strings like `"Apartment"`, not integers (K011). Types already handle this correctly.
- **Cross-tab deep linking:** S04 established `router.push('/(tabs)/properties/${id}')` for cross-tab navigation. Sub-page links from property detail should use consistent `router.push` patterns.

## Open Risks

- **Date picker UX:** Without a date picker component, date entry on mobile is poor UX. `@react-native-community/datetimepicker` is the standard solution but adds a dependency. Could use plain text inputs as MVP and upgrade later.
- **Document file size limits:** Large document uploads over mobile networks could timeout. The existing backend has no explicit size limit in the Documents controller — mobile should show upload progress if possible.
- **Expo Router nested dynamic segments:** `[id]/tenants.tsx` inside `[id].tsx`'s directory may require careful route configuration. If Expo Router has issues with this nesting pattern, fall back to flat routes with params.
