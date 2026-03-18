---
estimated_steps: 7
estimated_files: 10
---

# T03: Scaffold React frontend with auth context, API client, and login page

**Slice:** S02 — Mülk Yönetimi
**Milestone:** M001

## Description

Create the React + Vite + TypeScript frontend project from scratch. This is greenfield — no frontend exists yet. Set up the project structure, API client with JWT auth interceptor, AuthContext for token management, React Router with protected routes, and a functional login page. This establishes the frontend foundation that all subsequent slices (S03–S06) will build on.

The backend API runs at `http://localhost:5000` with CORS already configured to allow any origin. JWT tokens are obtained via `POST /api/auth/login` (returns `{ accessToken, refreshToken, expiresAt }`).

**Relevant skill:** Load `~/.gsd/agent/skills/frontend-design/SKILL.md` before starting — it provides design guidance for building distinctive, polished UI rather than generic AI-generated aesthetics. Apply its principles to the login page and layout components.

## Steps

1. **Create Vite project** — From the repository root, run `npm create vite@latest gurkan-ui -- --template react-ts`. Then `cd gurkan-ui && npm install`. Install additional dependencies: `npm install react-router-dom axios`.

2. **Create TypeScript types** — `gurkan-ui/src/types/index.ts`: Define types for API responses:
   - `TokenResponse` — accessToken, refreshToken, expiresAt
   - `UserInfo` — id (string), email, fullName, role
   - `PropertyResponse` — id, name, type, address, city, district, area, roomCount, floor, totalFloors, buildYear, currency, description, groupId, groupName, createdAt, updatedAt
   - `PropertyListResponse` — id, name, type, city, currency, groupId, groupName
   - `PropertyNoteResponse` — id, content, createdByName, createdAt
   - `GroupResponse` — id, name, description (for group dropdown in property form)
   - Enums: `PropertyType` and `Currency` matching the backend

3. **Create API client** — `gurkan-ui/src/api/client.ts`:
   - Create axios instance with baseURL `http://localhost:5000/api`
   - Request interceptor: read `accessToken` from localStorage, set `Authorization: Bearer {token}` header
   - Response interceptor: on 401, clear auth state and redirect to /login
   - Export typed API functions: `login(email, password)`, `getProperties()`, `getProperty(id)`, `createProperty(data)`, `updateProperty(id, data)`, `deleteProperty(id)`, `getPropertyNotes(propertyId)`, `createPropertyNote(propertyId, content)`, `updatePropertyNote(propertyId, noteId, content)`, `deletePropertyNote(propertyId, noteId)`, `getGroups()`

4. **Create AuthContext** — `gurkan-ui/src/contexts/AuthContext.tsx`:
   - Context provides: user (UserInfo | null), isAuthenticated (boolean), login(email, password), logout()
   - On login: call API, store accessToken + refreshToken in localStorage, decode JWT payload (base64) to extract user info (sub, email, fullName, role)
   - On logout: clear localStorage, set user to null, navigate to /login
   - On mount: check localStorage for existing token, if present and not expired set user state
   - Export `useAuth()` hook

5. **Create Layout component** — `gurkan-ui/src/components/Layout.tsx`:
   - Header/nav bar with app name ("Gürkan"), user info display (name, role), logout button
   - Side navigation with links (Properties — other links will be added by future slices)
   - Main content area with `<Outlet />` for nested routes
   - Responsive design — works on desktop and tablet widths

6. **Create Login page** — `gurkan-ui/src/pages/Login.tsx`:
   - Email + password form with validation (required fields)
   - Error display for invalid credentials (API returns 401)
   - Loading state during login
   - On success: redirect to /properties
   - Apply frontend-design skill guidance: distinctive typography, non-generic color palette, polished form design

7. **Wire routing in App.tsx** — `gurkan-ui/src/App.tsx`:
   - AuthProvider wraps entire app
   - Public route: `/login` → Login page (redirect to /properties if already authenticated)
   - Protected routes (redirect to /login if not authenticated):
     - `/` → redirect to `/properties`
     - `/properties` → placeholder (will be built in T04)
     - `/properties/new` → placeholder
     - `/properties/:id` → placeholder
   - Create a `ProtectedRoute` component that checks `useAuth().isAuthenticated`

8. **Update main.tsx** — Ensure BrowserRouter wraps App, import global CSS.

9. **Verify** — `cd gurkan-ui && npm run build` succeeds. Start dev server with `npm run dev`, verify login page renders at `http://localhost:5173/login`.

## Must-Haves

- [ ] Vite + React + TypeScript project created at `gurkan-ui/`
- [ ] API client with JWT interceptor pointing at localhost:5000
- [ ] AuthContext with login/logout and token persistence in localStorage
- [ ] Login page with email/password form, error handling, loading state
- [ ] React Router with protected routes and /login public route
- [ ] Layout component with header, navigation, and content area
- [ ] `npm run build` succeeds (TypeScript compiles)

## Verification

- `cd gurkan-ui && npm run build` — compiles without TypeScript errors
- Start backend (`cd GurkanApi && dotnet run`) and frontend (`cd gurkan-ui && npm run dev`), navigate to `http://localhost:5173/login`, enter admin@gurkan.com / Admin123!, verify redirect to /properties placeholder

## Inputs

- Backend API at `http://localhost:5000/api` — specifically:
  - `POST /api/auth/login` — body `{ email, password }` → `{ accessToken, refreshToken, expiresAt }`
  - `GET /api/properties` — returns property list (from T01)
  - `GET /api/groups` — returns groups for dropdown
- JWT token format: standard JWT with claims `sub` (userId), `email`, `http://schemas.microsoft.com/ws/2008/06/identity/claims/role` (role), `FullName`
- CORS: backend allows any origin (configured in Program.cs)

## Expected Output

- `gurkan-ui/` — complete React + Vite + TypeScript project
- `gurkan-ui/src/api/client.ts` — axios-based API client with auth interceptor
- `gurkan-ui/src/contexts/AuthContext.tsx` — JWT auth context with login/logout
- `gurkan-ui/src/pages/Login.tsx` — functional login page
- `gurkan-ui/src/components/Layout.tsx` — app layout with nav and header
- `gurkan-ui/src/types/index.ts` — TypeScript types for API responses
- `gurkan-ui/src/App.tsx` — routing setup with protected routes
