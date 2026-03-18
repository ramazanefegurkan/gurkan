# S02: Mülk Yönetimi — UAT

**Milestone:** M001
**Written:** 2026-03-18

## UAT Type

- UAT mode: mixed
- Why this mode is sufficient: Backend contract proven by 14 integration tests against real PostgreSQL. Frontend requires live-runtime verification against running API for auth flow and property CRUD.

## Preconditions

1. PostgreSQL running on port 5434 (Docker: `docker compose up -d`)
2. Backend running: `cd GurkanApi && dotnet run` — serves at http://localhost:5000
3. Database migrated (auto-runs on startup via MigrateAsync)
4. Seed admin exists: admin@gurkan.com / Admin123!
5. Frontend dev server: `cd gurkan-ui && npx vite --port 5173` — serves at http://localhost:5173
6. At least one group created with a member user (use API or previous S01 setup)

## Smoke Test

Navigate to http://localhost:5173. Should redirect to /login. Log in as admin@gurkan.com / Admin123!. Should redirect to /properties showing property list (empty or with data). If this works, auth + routing + API client are functional.

## Test Cases

### 1. Login and Protected Route

1. Open http://localhost:5173/properties (not logged in, no token in localStorage)
2. **Expected:** Redirected to /login page
3. Enter email: admin@gurkan.com, password: Admin123!
4. Click "Giriş Yap"
5. **Expected:** Redirected to /properties. Sidebar shows "SuperAdmin" role badge and email. Nav links visible.

### 2. Invalid Login

1. On /login, enter email: wrong@email.com, password: wrong
2. Click "Giriş Yap"
3. **Expected:** Error message "E-posta veya şifre hatalı" displayed inline. Not redirected.

### 3. Superadmin Creates Property (TRY)

1. Log in as admin@gurkan.com
2. Click "Yeni Mülk" button on property list page
3. Fill form: Name="Kadıköy Daire", Type=Apartment, Address="Caferağa Mah.", City="İstanbul", District="Kadıköy", Area=120, Rooms=3, Floor=4, Total Floors=8, Build Year=2015, Currency=TRY, Description="3+1 daire", Group=(select existing group)
4. Submit form
5. **Expected:** Redirected to property list. New property card visible with name "Kadıköy Daire", type badge "Daire", city "İstanbul", currency "₺".

### 4. Create Properties with Different Currencies

1. Create a property with Currency=USD (e.g., Name="USD Mülk")
2. Create a property with Currency=EUR (e.g., Name="EUR Mülk")
3. Navigate to property list
4. **Expected:** All three properties visible. Currency badges show "₺", "$", "€" respectively.

### 5. Property Detail View

1. Click on "Kadıköy Daire" card in property list
2. **Expected:** Detail page shows all fields: name, type badge, address, city, district, area (120 m²), rooms (3), floor (4/8), build year (2015), currency, description, group name. Empty notes section with "Henüz not eklenmemiş" message.

### 6. Add Note to Property

1. On property detail page, find notes section
2. Type "Boyası yenilenecek" in the note input
3. Click add button
4. **Expected:** Note appears in notes list with content "Boyası yenilenecek", author name, and timestamp. Note count badge updates.

### 7. Edit Note

1. Hover over the note added in test 6
2. Click edit button
3. **Expected:** Note content becomes editable textarea
4. Change text to "Boyası yenilendi - Mart 2026"
5. Click save
6. **Expected:** Note content updated to "Boyası yenilendi - Mart 2026"

### 8. Delete Note

1. Hover over the note and click delete button
2. **Expected:** Note removed from list. Empty state message returns.

### 9. Edit Property

1. From property detail or list, navigate to edit form for "Kadıköy Daire"
2. Change Name to "Kadıköy Daire (Güncel)", change City to "Ankara"
3. Submit
4. **Expected:** Property updated. Detail/list reflects new name and city. GroupId dropdown is not shown (immutable).

### 10. Delete Property

1. On property detail page, click delete button (admin only)
2. **Expected:** Property removed. Redirected to property list. Deleted property no longer in list.

### 11. Group-Filtered Property List (Requires Two Groups)

1. Create two groups (Group A, Group B) via API or S01 admin UI
2. Add user1 to Group A, user2 to Group B
3. Create Property X in Group A, Property Y in Group B (as superadmin)
4. Log in as user1
5. **Expected:** Property list shows only Property X. Property Y not visible.
6. Log in as user2
7. **Expected:** Property list shows only Property Y. Property X not visible.

### 12. Cross-Group Access Denial (API Level)

1. Log in as user1 (member of Group A only)
2. Attempt to access Property Y (Group B) detail via direct URL /properties/{propertyY_id}
3. **Expected:** 403 Forbidden or error message displayed. Property data not shown.

## Edge Cases

### Empty Property List

1. Log in as a user who belongs to a group with no properties
2. **Expected:** Property list shows empty state message "Henüz mülk eklenmemiş" (or similar), not an error.

### Form Validation — Missing Required Fields

1. Navigate to new property form
2. Leave Name field empty, try to submit
3. **Expected:** Client-side validation prevents submission. Error indicator on required fields.

### Logout

1. Click logout button in sidebar
2. **Expected:** Redirected to /login. localStorage cleared (accessToken, refreshToken, expiresAt removed). Navigating to /properties redirects to /login.

## Failure Signals

- Login redirects back to /login after successful auth → token not being stored in localStorage or AuthContext not updating
- Property list shows all properties regardless of group → group filtering not applied in GET /api/properties
- Currency shows as "0" or "1" instead of "TRY"/"USD" → frontend types still using numeric enum values instead of strings
- Notes section shows 500 error → PropertyNote FK or TRUNCATE ordering issue in test DB
- Sidebar shows "null" for user info → JWT claim key mismatch in AuthContext decode
- Property form submit returns 403 → GroupId not matching user's groups or access check failing

## Requirements Proved By This UAT

- R001 — Property CRUD (tests 3, 5, 9, 10), property types and metadata (test 3), group assignment (test 3)
- R002 — Group-based access control (tests 11, 12), superadmin full access (test 3)
- R014 — Multi-currency TRY/USD/EUR (test 4), currency displayed correctly (test 5)
- R023 — Property notes with timestamps and author (tests 6, 7, 8)

## Not Proven By This UAT

- Rent tracking, expense/bill tracking, documents — not yet built (S03, S04, S05)
- Dashboard and reporting — not yet built (S06)
- Token refresh mechanism — deferred, 401 redirects to login
- Cross-group note denial — proven by integration tests, not in browser UAT (requires multi-user setup)
- Concurrent multi-user scenarios — not tested

## Notes for Tester

- The seed admin (admin@gurkan.com / Admin123!) is SuperAdmin role — it bypasses group filters and sees all properties. To test group filtering, create separate member users.
- Backend must be running at localhost:5000 for the frontend to work. CORS is configured for localhost:5173.
- If you see "Sunucuya bağlanılamadı" on login, the backend is not running or not reachable.
- Note that UserInfo fullName is always null (shows email instead) — this is a known limitation, not a bug.
