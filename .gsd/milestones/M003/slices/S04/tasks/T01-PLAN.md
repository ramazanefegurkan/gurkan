---
estimated_steps: 8
estimated_files: 8
---

# T01: Scaffold Expo project with auth context and login screen

**Slice:** S04 — Mobil App Foundation
**Milestone:** M003

## Description

Create the `gurkan-mobile/` Expo project from scratch, install all dependencies, configure the project, and build the authentication layer. This task retires the primary risk of the slice: "Can Expo app authenticate against the ASP.NET Core backend via JWT + SecureStore?"

The auth context uses Expo's recommended `useStorageState` pattern backed by `expo-secure-store` for native and `localStorage` for web. The root layout uses `Stack.Protected` guards to conditionally show sign-in or the main app. JWT tokens from the ASP.NET Core backend use full XML namespace claim keys (K010) — the decode logic must handle these.

**Relevant skills:** Load `frontend-design` skill for the login screen UI design.

## Steps

1. **Create Expo project:** Run `npx create-expo-app@latest gurkan-mobile --template default` from the repo root. This creates a managed-workflow Expo project with TypeScript.

2. **Install dependencies:** From `gurkan-mobile/`, install:
   - `expo-secure-store` — native encrypted token storage
   - `axios` — HTTP client (same as web)
   - `expo-constants` — read `app.config.ts` extra fields
   - `@expo-google-fonts/dm-sans` and `expo-font` — for DM Sans font (matches web)
   Note: `expo-router` and `@expo/vector-icons` come pre-installed with the default template.

3. **Configure `app.config.ts`:** Set the app name to "Gürkan", slug to "gurkan-mobile", scheme to "gurkan". Add `extra.apiUrl` pointing to the production backend URL (use `https://gurkan.efegurkan.com/api` as default, overridable). Ensure `expo-router` and `expo-secure-store` are in the plugins array.

4. **Create `src/theme.ts`:** Define design tokens as a JS object:
   - Colors: terracotta accent `#c4653a`, background `#faf9f7`, surface `#ffffff`, text primary `#2d2926`, text secondary `#6b655e`, success green, warning amber, critical red, info blue
   - Typography: font family DM Sans (loaded via expo-font), sizes for title/subtitle/body/caption
   - Spacing scale: xs(4), sm(8), md(16), lg(24), xl(32)
   - Border radius: sm(6), md(10), lg(16)

5. **Create `src/ctx.tsx` — Session context:**
   - Implement `useStorageState(key)` hook: uses `SecureStore.getItemAsync` / `SecureStore.setItemAsync` on native, `localStorage` on web. Returns `[[isLoading, value], setValue]`.
   - Implement `setStorageItemAsync(key, value)` helper for direct storage access (used by API client interceptor).
   - Create `SessionProvider` with React Context providing: `signIn(email, password)`, `signOut()`, `session` (access token string or null), `isLoading`.
   - `signIn`: calls `POST /api/auth/login` with axios directly (not through the API client module — that comes in T02), stores `accessToken`, `refreshToken`, `expiresAt` in SecureStore.
   - `signOut`: clears all three SecureStore keys, sets session to null.
   - Export `useSession()` hook.
   - JWT decode: implement `decodeJwtPayload(token)` and `extractUserFromToken(token)` that reads claim keys using full XML namespaces:
     - `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier` → user ID
     - `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress` → email
     - `http://schemas.microsoft.com/ws/2008/06/identity/claims/role` → role
   - Store the `UserInfo` (id, email, fullName, role) in context alongside the session token.

6. **Create `src/app/_layout.tsx` — Root layout:**
   - Wrap entire app in `SessionProvider`.
   - Load DM Sans font with `useFonts` from `@expo-google-fonts/dm-sans`. Show splash/loading while font loads.
   - Use `Stack.Protected` pattern:
     - `guard={!!session}` → shows `(tabs)` screen (main app)
     - `guard={!session}` → shows `sign-in` screen
   - Create a minimal `src/app/(tabs)/_layout.tsx` placeholder that just renders a `<Slot />` or simple `<Tabs>` with a single "Home" tab (T03 will flesh this out).

7. **Create `src/app/sign-in.tsx` — Login screen:**
   - Email input (keyboard type: email-address, auto-capitalize: none)
   - Password input (secure text entry)
   - Sign In button that calls `signIn(email, password)` from context
   - Loading state on button during API call
   - Error display for invalid credentials
   - Style: centered card layout, terracotta accent button, DM Sans typography, app logo/title at top
   - **Important:** Use `KeyboardAvoidingView` for proper keyboard handling on iOS

8. **Clean up template files:** Remove any default template screens/components that conflict with the new structure (e.g., default `app/(tabs)/index.tsx`, `app/(tabs)/explore.tsx`, etc.). Keep only the files needed for the auth flow.

## Must-Haves

- [ ] `gurkan-mobile/` is a valid Expo managed-workflow project that builds without errors
- [ ] `expo-secure-store`, `axios`, `expo-constants`, `expo-font`, `@expo-google-fonts/dm-sans` are installed
- [ ] `app.config.ts` has `extra.apiUrl` configured
- [ ] `src/ctx.tsx` provides `SessionProvider` with `signIn`/`signOut`/`session`/`isLoading`
- [ ] `useStorageState` uses SecureStore on native, localStorage on web
- [ ] JWT decode handles ASP.NET Core XML namespace claim keys (K010)
- [ ] Root `_layout.tsx` uses `Stack.Protected` guards for auth routing
- [ ] Login screen authenticates against `POST /api/auth/login` and stores tokens
- [ ] `src/theme.ts` defines color, typography, and spacing tokens

## Verification

- `cd gurkan-mobile && npx tsc --noEmit` — zero TypeScript errors
- `cd gurkan-mobile && npx expo export --platform android` — export succeeds (no web-only APIs)
- Manual: `npx expo start` → open in Expo Go → sign-in screen renders → enter admin@gurkan.com / Admin123! → app navigates away from sign-in (auth guard works)
- Manual: incorrect credentials show error message on login screen

## Inputs

- `gurkan-ui/src/contexts/AuthContext.tsx` — JWT decode pattern with XML namespace claim keys (reference, adapt for SecureStore)
- K010: Backend JWT uses full XML namespace claim keys
- K019: Production URL pattern is `https://{DOMAIN}/api`
- Expo Router auth docs: `Stack.Protected` pattern with `useStorageState` hook

## Observability Impact

- **New signals:** `console.debug('[auth] signIn attempt', { email })` on login start; `console.debug('[auth] signIn success, expiresAt:', expiresAt)` on success; `console.debug('[auth] signOut')` on logout; `console.debug('[auth] session restored from SecureStore')` on cold boot restore.
- **Inspection:** Expo Go dev menu → network inspector shows `POST /api/auth/login` request/response. React DevTools shows `SessionProvider` context value (session token present/null, user info, isLoading state).
- **Failure visibility:** Login errors display as user-facing error text on sign-in screen. Invalid tokens cause fallback to signed-out state with `console.warn('[auth] invalid token on restore')`. SecureStore failures logged with `console.error('[auth] SecureStore error', e)`.
- **Redaction:** JWT tokens never logged in full — only expiry timestamps. Passwords never logged.

## Expected Output

- `gurkan-mobile/` — Complete Expo project with all dependencies installed
- `gurkan-mobile/app.config.ts` — Expo config with apiUrl, plugins, scheme
- `gurkan-mobile/src/ctx.tsx` — Session context with SecureStore-backed auth
- `gurkan-mobile/src/theme.ts` — Design tokens
- `gurkan-mobile/src/app/_layout.tsx` — Root layout with auth guards
- `gurkan-mobile/src/app/sign-in.tsx` — Login screen
- `gurkan-mobile/src/app/(tabs)/_layout.tsx` — Minimal tab layout placeholder
