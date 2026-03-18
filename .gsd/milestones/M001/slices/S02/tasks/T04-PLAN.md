---
estimated_steps: 5
estimated_files: 5
---

# T04: Build property list and detail pages with notes

**Slice:** S02 — Mülk Yönetimi
**Milestone:** M001

## Description

Build the user-facing property pages that complete the S02 demo. Property list page shows group-filtered properties in a card/table layout. Property form allows creating and editing properties with group and currency selection. Property detail page shows all property info plus a chronological notes section with add/edit/delete.

This task replaces the placeholder routes from T03 with real pages wired to the API.

**Relevant skill:** Load `~/.gsd/agent/skills/frontend-design/SKILL.md` before starting — apply its design principles for distinctive UI. The property list and detail pages should be visually polished with good typography, color choices, and layout composition.

## Steps

1. **Create PropertyList page** — `gurkan-ui/src/pages/Properties/PropertyList.tsx`:
   - Fetch `GET /api/properties` on mount using the API client from T03
   - Display properties in a responsive card grid or table — each card shows: name, type (with icon or badge), city, currency
   - Loading state while fetching
   - Empty state when no properties exist ("No properties yet. Add your first property.")
   - "Add Property" button navigates to /properties/new
   - Each property card/row is clickable → navigates to /properties/:id
   - Handle API errors gracefully (display error message)

2. **Create PropertyForm page** — `gurkan-ui/src/pages/Properties/PropertyForm.tsx`:
   - Dual purpose: create (at /properties/new) and edit (at /properties/:id/edit)
   - If editing: fetch existing property data and pre-fill form
   - Form fields: Name (text, required), Type (dropdown — Apartment/House/Shop/Land/Office/Other), Address (text), City (text), District (text), Area (number, m²), RoomCount (number), Floor (number), TotalFloors (number), BuildYear (number), Currency (dropdown — TRY/USD/EUR), Description (textarea), GroupId (dropdown — fetch groups from `GET /api/groups`)
   - Validation: Name required, GroupId required
   - Submit: POST /api/properties (create) or PUT /api/properties/:id (edit)
   - On success: navigate to /properties/:id (detail page)
   - On error: display API error message
   - Cancel button returns to property list

3. **Create PropertyDetail page** — `gurkan-ui/src/pages/Properties/PropertyDetail.tsx`:
   - Fetch `GET /api/properties/:id` on mount
   - Display all property fields in a structured layout (info section with labels and values)
   - Edit button → navigates to /properties/:id/edit
   - Delete button with confirmation dialog → `DELETE /api/properties/:id` → navigate to /properties
   - **Notes section** at the bottom:
     - Fetch `GET /api/properties/:id/notes` on mount
     - Display notes chronologically (newest first) — each note shows content, author name, timestamp
     - "Add Note" input with submit button → `POST /api/properties/:id/notes`
     - Each note: edit button (inline edit or modal) → `PUT /api/properties/:id/notes/:noteId`
     - Each note: delete button → `DELETE /api/properties/:id/notes/:noteId`
   - Loading and error states for both property and notes

4. **Wire routes in App.tsx** — Replace placeholder routes from T03:
   - `/properties` → PropertyList
   - `/properties/new` → PropertyForm (create mode)
   - `/properties/:id` → PropertyDetail
   - `/properties/:id/edit` → PropertyForm (edit mode)

5. **Verify build and runtime** — `cd gurkan-ui && npm run build` succeeds. Start both backend and frontend, login, create a property, view the list, open detail, add a note.

## Must-Haves

- [ ] Property list page fetches and displays group-filtered properties
- [ ] Property form creates new properties with all fields including group and currency dropdowns
- [ ] Property detail page displays all fields and a working notes section
- [ ] Notes can be added, edited, and deleted from the detail page
- [ ] All routes wired in App.tsx
- [ ] `npm run build` succeeds (TypeScript compiles)

## Verification

- `cd gurkan-ui && npm run build` — compiles without errors
- Browser manual test: login as admin@gurkan.com → create property (TRY, in a group) → see it in list → click to detail → add note → note appears → edit note → delete note

## Inputs

- T03 output: `gurkan-ui/` project with API client, AuthContext, Login page, Layout, routing skeleton, TypeScript types
- T01 output: Backend API endpoints:
  - `GET /api/properties` — returns `PropertyListResponse[]`
  - `GET /api/properties/:id` — returns `PropertyResponse`
  - `POST /api/properties` — body `CreatePropertyRequest` → `PropertyResponse`
  - `PUT /api/properties/:id` — body `UpdatePropertyRequest` → `PropertyResponse`
  - `DELETE /api/properties/:id` → 204
  - `GET /api/properties/:id/notes` — returns `PropertyNoteResponse[]`
  - `POST /api/properties/:id/notes` — body `{ content }` → `PropertyNoteResponse`
  - `PUT /api/properties/:id/notes/:noteId` — body `{ content }` → `PropertyNoteResponse`
  - `DELETE /api/properties/:id/notes/:noteId` → 204
  - `GET /api/groups` — returns `GroupResponse[]` (for group dropdown)
- TypeScript types already defined in `gurkan-ui/src/types/index.ts`

## Observability Impact

- **Browser DevTools → Network tab**: All property CRUD calls visible as fetch/XHR requests to `/api/properties`, `/api/properties/:id`, `/api/properties/:id/notes` with JWT Authorization header. Failed requests (4xx/5xx) surface as red entries with `{ error, message }` JSON bodies.
- **Console errors**: API failures logged via catch blocks; React error boundaries for component-level crashes.
- **UI loading states**: Skeleton/spinner visible during fetch; error banners with retry guidance on failure.
- **UI state inspection**: Property list card count reflects API response length. Notes section item count matches `/api/properties/:id/notes` response. Empty states render when arrays are empty.
- **Failure visibility**: Form validation errors inline; API errors displayed as alert banners; 403 results in access denied message; 401 triggers auth redirect.

## Expected Output

- `gurkan-ui/src/pages/Properties/PropertyList.tsx` — property list page with cards/table
- `gurkan-ui/src/pages/Properties/PropertyForm.tsx` — create/edit form with dropdowns
- `gurkan-ui/src/pages/Properties/PropertyDetail.tsx` — detail view with notes section
- `gurkan-ui/src/App.tsx` — updated routes pointing to real pages
