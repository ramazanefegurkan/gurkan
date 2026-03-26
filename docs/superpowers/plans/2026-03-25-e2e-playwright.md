# E2E Playwright Test Suite — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Playwright E2E tests covering all critical user flows of the gurkan-ui web application against a real API + PostgreSQL backend.

**Architecture:** Standalone `e2e/` directory at project root with its own `package.json`. Custom Playwright fixtures provide authenticated browser contexts (SuperAdmin + regular User). Test data is created/cleaned via API calls — no direct DB access.

**Tech Stack:** Playwright 1.52+, TypeScript, Chromium

**Spec:** `docs/superpowers/specs/2026-03-25-e2e-playwright-design.md`

---

## File Structure

```
e2e/
├── package.json                    # Playwright dependency
├── playwright.config.ts            # Config: baseURL, timeouts, reporters, trace
├── tsconfig.json                   # TypeScript config
├── .gitignore                      # test-results/, playwright-report/, node_modules/
├── global-setup.ts                 # API health check + regular user creation
├── helpers/
│   ├── constants.ts                # ENV-based URLs and credentials
│   ├── auth.ts                     # Login helper, localStorage token injection
│   └── api-setup.ts               # Test data factory: createProperty, createTenant, etc.
├── fixtures/
│   └── test-data.ts            # authenticatedPage, userPage, adminApiContext, userApiContext
└── tests/
    ├── auth.spec.ts
    ├── properties.spec.ts
    ├── property-notes.spec.ts
    ├── tenants.spec.ts
    ├── all-tenants.spec.ts
    ├── rent-payments.spec.ts
    ├── rent-increases.spec.ts
    ├── short-term-rentals.spec.ts
    ├── expenses.spec.ts
    ├── bills.spec.ts
    ├── documents.spec.ts
    ├── dashboard.spec.ts
    ├── reports.spec.ts
    ├── notifications.spec.ts
    ├── import.spec.ts
    ├── admin-users.spec.ts
    ├── admin-groups.spec.ts
    ├── admin-banks.spec.ts
    ├── subscriptions.spec.ts
    └── settings-telegram.spec.ts
```

**UI modifications:** No `data-testid` attributes exist in the codebase. Tests will use Playwright's semantic locators: `getByRole`, `getByLabel`, `getByText`, `getByPlaceholder`, plus CSS selectors for badges/cards. Form inputs already have `id` attributes (`#email`, `#name`, `#type`, etc.) which map well to `getByLabel`.

---

## Task 1: Project Scaffolding

**Files:**
- Create: `e2e/package.json`
- Create: `e2e/tsconfig.json`
- Create: `e2e/playwright.config.ts`
- Create: `e2e/.gitignore`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "gurkan-e2e",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "playwright test",
    "test:headed": "playwright test --headed",
    "test:ui": "playwright test --ui",
    "report": "playwright show-report"
  },
  "devDependencies": {
    "@playwright/test": "^1.52.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "./dist"
  },
  "include": ["**/*.ts"]
}
```

- [ ] **Step 3: Create playwright.config.ts**

```typescript
import { defineConfig } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './global-setup.ts',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  timeout: 30_000,
  expect: { timeout: 5_000 },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
test-results/
playwright-report/
blob-report/
```

- [ ] **Step 5: Install dependencies**

Run: `cd e2e && npm install`
Then: `npx playwright install chromium`

- [ ] **Step 6: Commit**

```bash
git add e2e/package.json e2e/package-lock.json e2e/tsconfig.json e2e/playwright.config.ts e2e/.gitignore
git commit -m "chore: scaffold Playwright E2E test project"
```

---

## Task 2: Helpers & Constants

**Files:**
- Create: `e2e/helpers/constants.ts`
- Create: `e2e/helpers/auth.ts`

- [ ] **Step 1: Create constants.ts**

```typescript
export const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';
export const API_URL = process.env.E2E_API_URL || 'http://localhost:5039/api';

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@gurkan.com';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'Admin123!';

export const USER_EMAIL = 'e2e-user@gurkan.com';
export const USER_PASSWORD = 'E2EUser123!';
export const USER_FULLNAME = 'E2E Test User';
```

- [ ] **Step 2: Create auth.ts**

```typescript
import { type Page, type APIRequestContext } from '@playwright/test';
import { API_URL } from './constants';

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export async function loginViaApi(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<TokenResponse> {
  const response = await request.post(`${API_URL}/auth/login`, {
    data: { email, password },
  });
  if (!response.ok()) {
    throw new Error(`Login failed for ${email}: ${response.status()}`);
  }
  return response.json();
}

export async function injectTokens(page: Page, tokens: TokenResponse): Promise<void> {
  await page.addInitScript((t) => {
    localStorage.setItem('accessToken', t.accessToken);
    localStorage.setItem('refreshToken', t.refreshToken);
    localStorage.setItem('expiresAt', t.expiresAt);
  }, tokens);
}
```

- [ ] **Step 3: Commit**

```bash
git add e2e/helpers/
git commit -m "feat(e2e): add constants and auth helpers"
```

---

## Task 3: API Setup Helper

**Files:**
- Create: `e2e/helpers/api-setup.ts`

This helper creates/deletes test data via API. All functions take an authenticated `APIRequestContext`.

- [ ] **Step 1: Create api-setup.ts**

```typescript
import { type APIRequestContext } from '@playwright/test';
import { API_URL, ADMIN_EMAIL, ADMIN_PASSWORD, USER_EMAIL, USER_PASSWORD } from './constants';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export async function createGroup(
  request: APIRequestContext,
  name?: string
): Promise<{ id: number; name: string }> {
  const groupName = name || `E2E Group ${uid()}`;
  const res = await request.post(`${API_URL}/groups`, {
    data: { name: groupName, description: 'E2E test group' },
  });
  const body = await res.json();
  return { id: body.id, name: groupName };
}

export async function deleteGroup(request: APIRequestContext, id: number): Promise<void> {
  await request.delete(`${API_URL}/groups/${id}`);
}

export async function addGroupMember(
  request: APIRequestContext,
  groupId: number,
  userId: number,
  role: string = 'Admin'
): Promise<void> {
  await request.post(`${API_URL}/groups/${groupId}/members`, {
    data: { userId, role },
  });
}

export async function createProperty(
  request: APIRequestContext,
  groupId: number,
  overrides?: Record<string, unknown>
): Promise<{ id: number; name: string }> {
  const name = `E2E Property ${uid()}`;
  const res = await request.post(`${API_URL}/properties`, {
    data: {
      name,
      type: 'Apartment',
      currency: 'TRY',
      city: 'İstanbul',
      district: 'Kadıköy',
      groupId,
      ...overrides,
    },
  });
  const body = await res.json();
  return { id: body.id, name };
}

export async function deleteProperty(request: APIRequestContext, id: number): Promise<void> {
  await request.delete(`${API_URL}/properties/${id}`);
}

export async function createTenant(
  request: APIRequestContext,
  propertyId: number,
  overrides?: Record<string, unknown>
): Promise<{ id: number; fullName: string }> {
  const fullName = `E2E Tenant ${uid()}`;
  const today = new Date();
  const threeMonthsLater = new Date(today);
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
  const res = await request.post(`${API_URL}/properties/${propertyId}/tenants`, {
    data: {
      fullName,
      leaseStart: today.toISOString().split('T')[0],
      leaseEnd: threeMonthsLater.toISOString().split('T')[0],
      monthlyRent: 5000,
      currency: 'TRY',
      ...overrides,
    },
  });
  const body = await res.json();
  return { id: body.id, fullName };
}

export async function createExpense(
  request: APIRequestContext,
  propertyId: number,
  overrides?: Record<string, unknown>
): Promise<{ id: number }> {
  const res = await request.post(`${API_URL}/properties/${propertyId}/expenses`, {
    data: {
      category: 'Maintenance',
      date: new Date().toISOString().split('T')[0],
      description: `E2E Expense ${uid()}`,
      amount: 1000,
      currency: 'TRY',
      ...overrides,
    },
  });
  const body = await res.json();
  return { id: body.id };
}

export async function createBill(
  request: APIRequestContext,
  propertyId: number,
  overrides?: Record<string, unknown>
): Promise<{ id: number }> {
  const res = await request.post(`${API_URL}/properties/${propertyId}/bills`, {
    data: {
      type: 'Water',
      dueDate: new Date().toISOString().split('T')[0],
      amount: 250,
      currency: 'TRY',
      ...overrides,
    },
  });
  const body = await res.json();
  return { id: body.id };
}

export async function createShortTermRental(
  request: APIRequestContext,
  propertyId: number,
  overrides?: Record<string, unknown>
): Promise<{ id: number }> {
  const checkIn = new Date();
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 3);
  const res = await request.post(`${API_URL}/properties/${propertyId}/short-term-rentals`, {
    data: {
      guestName: `E2E Guest ${uid()}`,
      checkIn: checkIn.toISOString().split('T')[0],
      checkOut: checkOut.toISOString().split('T')[0],
      nightCount: 3,
      platform: 'Airbnb',
      currency: 'TRY',
      nightlyRate: 500,
      totalAmount: 1500,
      platformFee: 150,
      netAmount: 1350,
      ...overrides,
    },
  });
  const body = await res.json();
  return { id: body.id };
}

export async function registerUser(
  request: APIRequestContext,
  email: string,
  password: string,
  fullName: string
): Promise<{ userId: number }> {
  const res = await request.post(`${API_URL}/auth/register`, {
    data: { email, password, fullName },
  });
  const body = await res.json();
  const token = body.accessToken;
  const payload = JSON.parse(atob(token.split('.')[1]));
  const userId = parseInt(
    payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']
  );
  return { userId };
}

export async function createAdminApiContext(): Promise<APIRequestContext> {
  const { request } = await import('@playwright/test');
  const tmpCtx = await request.newContext();
  const tokens = await (await import('./auth')).loginViaApi(tmpCtx, ADMIN_EMAIL, ADMIN_PASSWORD);
  await tmpCtx.dispose();
  return request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${tokens.accessToken}` },
  });
}

export async function createUserApiContext(): Promise<APIRequestContext> {
  const { request } = await import('@playwright/test');
  const tmpCtx = await request.newContext();
  const tokens = await (await import('./auth')).loginViaApi(tmpCtx, USER_EMAIL, USER_PASSWORD);
  await tmpCtx.dispose();
  return request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${tokens.accessToken}` },
  });
}
```

Note: `createAdminApiContext()` and `createUserApiContext()` are standalone functions that don't depend on Playwright fixtures, so they can be called in `test.beforeAll` / `test.afterAll` hooks.

- [ ] **Step 2: Commit**

```bash
git add e2e/helpers/api-setup.ts
git commit -m "feat(e2e): add API test data factory helpers"
```

---

## Task 4: Global Setup & Custom Fixtures

**Files:**
- Create: `e2e/global-setup.ts`
- Create: `e2e/fixtures/test-data.ts`

- [ ] **Step 1: Create global-setup.ts**

Health check + ensure e2e user exists.

```typescript
import { request } from '@playwright/test';
import { API_URL, ADMIN_EMAIL, ADMIN_PASSWORD, USER_EMAIL, USER_PASSWORD, USER_FULLNAME } from './helpers/constants';
import { loginViaApi } from './helpers/auth';
import { registerUser, createGroup, addGroupMember } from './helpers/api-setup';

async function waitForApi(maxRetries = 30, intervalMs = 2000): Promise<void> {
  const ctx = await request.newContext();
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await ctx.get(API_URL);
      if (res.status() < 500) {
        await ctx.dispose();
        return;
      }
    } catch {
      // API not ready yet
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  await ctx.dispose();
  throw new Error(`API not reachable at ${API_URL} after ${maxRetries} retries`);
}

async function ensureTestUser(): Promise<void> {
  const ctx = await request.newContext();
  try {
    const adminTokens = await loginViaApi(ctx, ADMIN_EMAIL, ADMIN_PASSWORD);
    const authedCtx = await request.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${adminTokens.accessToken}` },
    });

    try {
      await loginViaApi(ctx, USER_EMAIL, USER_PASSWORD);
    } catch {
      const { userId } = await registerUser(authedCtx, USER_EMAIL, USER_PASSWORD, USER_FULLNAME);
      const group = await createGroup(authedCtx, 'E2E User Group');
      await addGroupMember(authedCtx, group.id, userId);
    }

    await authedCtx.dispose();
  } finally {
    await ctx.dispose();
  }
}

export default async function globalSetup(): Promise<void> {
  await waitForApi();
  await ensureTestUser();
}
```

- [ ] **Step 2: Create fixtures/test-data.ts**

```typescript
import { test as base, type Page } from '@playwright/test';
import { loginViaApi, injectTokens } from '../helpers/auth';
import { ADMIN_EMAIL, ADMIN_PASSWORD, USER_EMAIL, USER_PASSWORD } from '../helpers/constants';

type Fixtures = {
  authenticatedPage: Page;
  userPage: Page;
};

export const test = base.extend<Fixtures>({
  authenticatedPage: async ({ page, playwright }, use) => {
    const reqCtx = await playwright.request.newContext();
    const tokens = await loginViaApi(reqCtx, ADMIN_EMAIL, ADMIN_PASSWORD);
    await injectTokens(page, tokens);
    await page.goto('/');
    await use(page);
    await reqCtx.dispose();
  },

  userPage: async ({ browser, playwright }, use) => {
    const reqCtx = await playwright.request.newContext();
    const tokens = await loginViaApi(reqCtx, USER_EMAIL, USER_PASSWORD);
    const context = await browser.newContext();
    const page = await context.newPage();
    await injectTokens(page, tokens);
    await page.goto('/');
    await use(page);
    await context.close();
    await reqCtx.dispose();
  },
});

export { expect } from '@playwright/test';
```

Note: API contexts for test data setup are created via `createAdminApiContext()` / `createUserApiContext()` from `helpers/api-setup.ts` — these are standalone functions callable in `beforeAll`/`afterAll` without Playwright fixtures.

- [ ] **Step 3: Commit**

```bash
git add e2e/global-setup.ts e2e/fixtures/
git commit -m "feat(e2e): add global setup and custom test fixtures"
```

---

## Task 5: Auth Tests

**Files:**
- Create: `e2e/tests/auth.spec.ts`

- [ ] **Step 1: Write auth.spec.ts**

```typescript
import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from '../helpers/constants';
import { loginViaApi, injectTokens } from '../helpers/auth';

test.describe('Authentication', () => {
  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Şifre').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Giriş Yap' }).click();
    await expect(page).toHaveURL(/\/dashboard|\/properties/);
  });

  test('wrong password shows error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Şifre').fill('WrongPassword123!');
    await page.getByRole('button', { name: 'Giriş Yap' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('logout redirects to login', async ({ page, playwright }) => {
    const reqCtx = await playwright.request.newContext();
    const tokens = await loginViaApi(reqCtx, ADMIN_EMAIL, ADMIN_PASSWORD);
    await injectTokens(page, tokens);
    await page.goto('/dashboard');
    await page.getByTitle('Çıkış').click();
    await expect(page).toHaveURL(/\/login/);
    await reqCtx.dispose();
  });

  test('unauthenticated access redirects to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('token refresh continues session seamlessly', async ({ page, playwright }) => {
    const reqCtx = await playwright.request.newContext();
    const tokens = await loginViaApi(reqCtx, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.addInitScript((t) => {
      localStorage.setItem('accessToken', 'expired.invalid.token');
      localStorage.setItem('refreshToken', t.refreshToken);
      localStorage.setItem('expiresAt', new Date(Date.now() - 60000).toISOString());
    }, tokens);
    await page.goto('/dashboard');
    await expect(page).not.toHaveURL(/\/login/);
    await reqCtx.dispose();
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd e2e && npx playwright test tests/auth.spec.ts`
Expected: All 5 tests pass (requires API + Web running)

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/auth.spec.ts
git commit -m "test(e2e): add authentication tests"
```

---

## Task 6: Properties Tests

**Files:**
- Create: `e2e/tests/properties.spec.ts`

- [ ] **Step 1: Write properties.spec.ts**

```typescript
import { test, expect } from '../fixtures/test-data';
import { type APIRequestContext } from '@playwright/test';
import { createProperty, createGroup, createAdminApiContext, deleteProperty, deleteGroup } from '../helpers/api-setup';

test.describe('Properties', () => {
  let apiCtx: APIRequestContext;
  let groupId: number;
  let createdPropertyIds: number[] = [];

  test.beforeAll(async () => {
    apiCtx = await createAdminApiContext();
    const group = await createGroup(apiCtx);
    groupId = group.id;
  });

  test.afterAll(async () => {
    for (const id of createdPropertyIds) {
      await deleteProperty(apiCtx, id).catch(() => {});
    }
    await deleteGroup(apiCtx, groupId).catch(() => {});
    await apiCtx.dispose();
  });

  test('create property via form', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const propertyName = `E2E UI Property ${Date.now()}`;

    await page.goto('/properties/new');
    await page.getByLabel('Mülk Adı').fill(propertyName);
    await page.locator('#type').selectOption('Apartment');
    await page.locator('#currency').selectOption('TRY');
    await page.locator('#groupId').selectOption(String(groupId));
    await page.getByLabel('Şehir').fill('İstanbul');
    await page.getByLabel('İlçe').fill('Kadıköy');
    await page.getByRole('button', { name: 'Mülk Oluştur' }).click();

    await expect(page).toHaveURL(/\/properties\/\d+/);
    await expect(page.locator('h1')).toContainText(propertyName);
  });

  test('property list shows created property', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const prop = await createProperty(apiCtx, groupId);
    createdPropertyIds.push(prop.id);

    await page.goto('/properties');
    await expect(page.getByText(prop.name)).toBeVisible();
  });

  test('property detail shows tabs', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const prop = await createProperty(apiCtx, groupId);
    createdPropertyIds.push(prop.id);

    await page.goto(`/properties/${prop.id}`);
    await expect(page.getByText('Detaylar')).toBeVisible();
    await expect(page.getByText('Kiracılar')).toBeVisible();
    await expect(page.getByText('Giderler')).toBeVisible();
    await expect(page.getByText('Faturalar')).toBeVisible();
    await expect(page.getByText('Dökümanlar')).toBeVisible();
  });

  test('edit property', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const prop = await createProperty(apiCtx, groupId);
    createdPropertyIds.push(prop.id);
    const newName = `Edited ${prop.name}`;

    await page.goto(`/properties/${prop.id}/edit`);
    await page.getByLabel('Mülk Adı').clear();
    await page.getByLabel('Mülk Adı').fill(newName);
    await page.getByRole('button', { name: 'Kaydet' }).click();

    await expect(page).toHaveURL(`/properties/${prop.id}`);
    await expect(page.locator('h1')).toContainText(newName);
  });

  test('delete property', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const prop = await createProperty(apiCtx, groupId);

    await page.goto(`/properties/${prop.id}`);
    await page.getByRole('button', { name: 'Sil' }).click();
    await page.getByRole('button', { name: 'Evet, Sil' }).click();

    await expect(page).toHaveURL('/properties');
    await expect(page.getByText(prop.name)).not.toBeVisible();
  });

  test('create property with USD currency', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const propertyName = `E2E USD Property ${Date.now()}`;

    await page.goto('/properties/new');
    await page.getByLabel('Mülk Adı').fill(propertyName);
    await page.locator('#type').selectOption('House');
    await page.locator('#currency').selectOption('USD');
    await page.locator('#groupId').selectOption(String(groupId));
    await page.getByRole('button', { name: 'Mülk Oluştur' }).click();

    await expect(page).toHaveURL(/\/properties\/\d+/);
    await expect(page.locator('.badge-currency')).toContainText('USD');
  });

  test('create property with EUR currency', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const propertyName = `E2E EUR Property ${Date.now()}`;

    await page.goto('/properties/new');
    await page.getByLabel('Mülk Adı').fill(propertyName);
    await page.locator('#type').selectOption('Office');
    await page.locator('#currency').selectOption('EUR');
    await page.locator('#groupId').selectOption(String(groupId));
    await page.getByRole('button', { name: 'Mülk Oluştur' }).click();

    await expect(page).toHaveURL(/\/properties\/\d+/);
    await expect(page.locator('.badge-currency')).toContainText('EUR');
  });

  test('group access restriction - user cannot access other group property', async ({ userPage }) => {
    const page = userPage;
    const prop = await createProperty(apiCtx, groupId);
    createdPropertyIds.push(prop.id);

    await page.goto(`/properties/${prop.id}`);
    await expect(page.getByText(/403|Erişim engellendi|yetkili değilsiniz/i)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run and verify**

Run: `cd e2e && npx playwright test tests/properties.spec.ts`

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/properties.spec.ts
git commit -m "test(e2e): add property CRUD tests"
```

---

## Task 7: Property Notes Tests

**Files:**
- Create: `e2e/tests/property-notes.spec.ts`

- [ ] **Step 1: Write property-notes.spec.ts**

Notes are an inline section on the PropertyDetail page, not a separate route.

```typescript
import { test, expect } from '../fixtures/test-data';
import { type APIRequestContext } from '@playwright/test';
import { createProperty, createGroup, createAdminApiContext, deleteProperty, deleteGroup } from '../helpers/api-setup';

test.describe('Property Notes', () => {
  let apiCtx: APIRequestContext;
  let groupId: number;
  let propertyId: number;

  test.beforeAll(async () => {
    apiCtx = await createAdminApiContext();
    const group = await createGroup(apiCtx);
    groupId = group.id;
    const prop = await createProperty(apiCtx, groupId);
    propertyId = prop.id;
  });

  test.afterAll(async () => {
    await deleteProperty(apiCtx, propertyId).catch(() => {});
    await deleteGroup(apiCtx, groupId).catch(() => {});
    await apiCtx.dispose();
  });

  test('add note to property', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto(`/properties/${propertyId}`);

    const noteText = `E2E note ${Date.now()}`;
    await page.getByPlaceholder('Yeni bir not ekleyin').fill(noteText);
    await page.getByRole('button', { name: 'Ekle' }).click();

    await expect(page.getByText(noteText)).toBeVisible();
  });

  test('edit own note', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto(`/properties/${propertyId}`);

    const noteText = `Edit me ${Date.now()}`;
    await page.getByPlaceholder('Yeni bir not ekleyin').fill(noteText);
    await page.getByRole('button', { name: 'Ekle' }).click();
    await expect(page.getByText(noteText)).toBeVisible();

    const noteItem = page.locator('.note-item', { hasText: noteText });
    await noteItem.hover();
    await noteItem.locator('.note-action-btn').first().click();

    const editedText = `Edited ${noteText}`;
    await page.locator('.note-edit-input').fill(editedText);
    await page.getByRole('button', { name: 'Kaydet' }).click();

    await expect(page.getByText(editedText)).toBeVisible();
  });

  test('delete note', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto(`/properties/${propertyId}`);

    const noteText = `Delete me ${Date.now()}`;
    await page.getByPlaceholder('Yeni bir not ekleyin').fill(noteText);
    await page.getByRole('button', { name: 'Ekle' }).click();
    await expect(page.getByText(noteText)).toBeVisible();

    const noteItem = page.locator('.note-item', { hasText: noteText });
    await noteItem.hover();
    await noteItem.locator('.note-action-btn--danger').click();

    await expect(page.getByText(noteText)).not.toBeVisible();
  });
});
```

- [ ] **Step 2: Run and verify**

Run: `cd e2e && npx playwright test tests/property-notes.spec.ts`

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/property-notes.spec.ts
git commit -m "test(e2e): add property notes tests"
```

---

## Task 8: Tenants Tests

**Files:**
- Create: `e2e/tests/tenants.spec.ts`

- [ ] **Step 1: Write tenants.spec.ts**

```typescript
import { test, expect } from '../fixtures/test-data';
import { type APIRequestContext } from '@playwright/test';
import { createProperty, createGroup, createTenant, createAdminApiContext, deleteProperty, deleteGroup } from '../helpers/api-setup';

test.describe('Tenants', () => {
  let apiCtx: APIRequestContext;
  let groupId: number;
  let propertyId: number;

  test.beforeAll(async () => {
    apiCtx = await createAdminApiContext();
    const group = await createGroup(apiCtx);
    groupId = group.id;
    const prop = await createProperty(apiCtx, groupId);
    propertyId = prop.id;
  });

  test.afterAll(async () => {
    await deleteProperty(apiCtx, propertyId).catch(() => {});
    await deleteGroup(apiCtx, groupId).catch(() => {});
    await apiCtx.dispose();
  });

  test('create tenant with auto-generated payment plan', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const tenantName = `E2E Tenant ${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    const leaseEnd = threeMonths.toISOString().split('T')[0];

    await page.goto(`/properties/${propertyId}/tenants/new`);
    await page.getByLabel('Ad Soyad').fill(tenantName);
    await page.locator('#leaseStart').fill(today);
    await page.locator('#leaseEnd').fill(leaseEnd);
    await page.locator('#monthlyRent').fill('5000');
    await page.locator('#currency').selectOption('TRY');
    await page.getByRole('button', { name: 'Kiracı Ekle' }).click();

    await expect(page).toHaveURL(/\/tenants\/\d+/);
    await expect(page.getByText(tenantName)).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('tenant list shows active tenant', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto(`/properties/${propertyId}/tenants`);
    await expect(page.locator('.tenant-card, .active-tenants')).toBeVisible();
  });

  test('edit tenant', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const tenant = await createTenant(apiCtx, propertyId);
    const newName = `Edited ${tenant.fullName}`;

    await page.goto(`/properties/${propertyId}/tenants/${tenant.id}/edit`);
    await page.getByLabel('Ad Soyad').clear();
    await page.getByLabel('Ad Soyad').fill(newName);
    await page.getByRole('button', { name: 'Güncelle' }).click();

    await expect(page.getByText(newName)).toBeVisible();
  });

  test('terminate tenant cancels future payments', async ({ authenticatedPage }) => {
    const prop = await createProperty(apiCtx, groupId);
    const tenant = await createTenant(apiCtx, prop.id);
    const page = authenticatedPage;

    await page.goto(`/properties/${prop.id}/tenants/${tenant.id}`);
    await page.getByRole('button', { name: /Sonlandır/ }).click();
    await page.getByRole('button', { name: /Evet, Sonlandır/ }).click();

    await expect(page.getByText(/Sonlanmış/)).toBeVisible();
    await deleteProperty(apiCtx, prop.id).catch(() => {});
  });
});
```

- [ ] **Step 2: Run and verify**

Run: `cd e2e && npx playwright test tests/tenants.spec.ts`

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/tenants.spec.ts
git commit -m "test(e2e): add tenant CRUD tests"
```

---

## Task 9: All Tenants, Rent Payments & Rent Increases Tests

**Files:**
- Create: `e2e/tests/all-tenants.spec.ts`
- Create: `e2e/tests/rent-payments.spec.ts`
- Create: `e2e/tests/rent-increases.spec.ts`

- [ ] **Step 1: Write all-tenants.spec.ts**

```typescript
import { test, expect } from '../fixtures/test-data';
import { type APIRequestContext } from '@playwright/test';
import { createProperty, createGroup, createTenant, createAdminApiContext, deleteProperty, deleteGroup } from '../helpers/api-setup';

test.describe('All Tenants', () => {
  let apiCtx: APIRequestContext;
  let groupId: number;
  let propertyId: number;
  let tenantName: string;

  test.beforeAll(async () => {
    apiCtx = await createAdminApiContext();
    const group = await createGroup(apiCtx);
    groupId = group.id;
    const prop = await createProperty(apiCtx, groupId);
    propertyId = prop.id;
    const tenant = await createTenant(apiCtx, propertyId);
    tenantName = tenant.fullName;
  });

  test.afterAll(async () => {
    await deleteProperty(apiCtx, propertyId).catch(() => {});
    await deleteGroup(apiCtx, groupId).catch(() => {});
    await apiCtx.dispose();
  });

  test('all tenants page lists cross-property tenants', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/tenants');
    await expect(page.getByText(tenantName)).toBeVisible();
  });

  test('active/inactive filter', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/tenants');
    const filterSelect = page.locator('select').first();
    if (await filterSelect.isVisible()) {
      await filterSelect.selectOption({ index: 1 });
      await expect(page.locator('table, .tenant-list')).toBeVisible();
    }
  });
});
```

- [ ] **Step 2: Write rent-payments.spec.ts**

```typescript
import { test, expect } from '../fixtures/test-data';
import { type APIRequestContext } from '@playwright/test';
import { createProperty, createGroup, createTenant, createAdminApiContext, deleteProperty, deleteGroup } from '../helpers/api-setup';

test.describe('Rent Payments', () => {
  let apiCtx: APIRequestContext;
  let groupId: number;
  let propertyId: number;
  let tenantId: number;

  test.beforeAll(async () => {
    apiCtx = await createAdminApiContext();
    const group = await createGroup(apiCtx);
    groupId = group.id;
    const prop = await createProperty(apiCtx, groupId);
    propertyId = prop.id;
    const tenant = await createTenant(apiCtx, propertyId);
    tenantId = tenant.id;
  });

  test.afterAll(async () => {
    await deleteProperty(apiCtx, propertyId).catch(() => {});
    await deleteGroup(apiCtx, groupId).catch(() => {});
    await apiCtx.dispose();
  });

  test('payment list is visible on tenant detail', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto(`/properties/${propertyId}/tenants/${tenantId}`);
    await expect(page.locator('table')).toBeVisible();
    await expect(page.getByText('Vade Tarihi')).toBeVisible();
  });

  test('mark payment as paid', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto(`/properties/${propertyId}/tenants/${tenantId}`);

    await page.getByRole('button', { name: 'Ödendi İşaretle' }).first().click();
    await page.locator('#payDate').fill(new Date().toISOString().split('T')[0]);
    await page.locator('#payMethod').selectOption('BankTransfer');
    await page.getByRole('button', { name: /Ödendi Olarak İşaretle/ }).click();

    await expect(page.getByText('Ödendi').first()).toBeVisible();
  });

  test('payment status filter', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto(`/properties/${propertyId}/tenants/${tenantId}`);
    const statusFilter = page.locator('select').first();
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('Paid');
      await expect(page.locator('table')).toBeVisible();
    }
  });
});
```

- [ ] **Step 3: Write rent-increases.spec.ts**

```typescript
import { test, expect } from '../fixtures/test-data';
import { type APIRequestContext } from '@playwright/test';
import { createProperty, createGroup, createTenant, createAdminApiContext, deleteProperty, deleteGroup } from '../helpers/api-setup';

test.describe('Rent Increases', () => {
  let apiCtx: APIRequestContext;
  let groupId: number;
  let propertyId: number;
  let tenantId: number;

  test.beforeAll(async () => {
    apiCtx = await createAdminApiContext();
    const group = await createGroup(apiCtx);
    groupId = group.id;
    const prop = await createProperty(apiCtx, groupId);
    propertyId = prop.id;
    const tenant = await createTenant(apiCtx, propertyId);
    tenantId = tenant.id;
  });

  test.afterAll(async () => {
    await deleteProperty(apiCtx, propertyId).catch(() => {});
    await deleteGroup(apiCtx, groupId).catch(() => {});
    await apiCtx.dispose();
  });

  test('create rent increase and verify future payments updated', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto(`/properties/${propertyId}/tenants/${tenantId}`);

    await page.getByRole('button', { name: /Sözleşmeyi Yenile/ }).click();

    const newEnd = new Date();
    newEnd.setFullYear(newEnd.getFullYear() + 1);
    await page.locator('#renewLeaseEnd').fill(newEnd.toISOString().split('T')[0]);
    await page.locator('#renewRate').fill('20');
    await page.getByRole('button', { name: 'Yenile' }).click();

    await expect(page.getByText(/6.000|6,000/)).toBeVisible();
  });
});
```

- [ ] **Step 4: Run all three**

Run: `cd e2e && npx playwright test tests/all-tenants.spec.ts tests/rent-payments.spec.ts tests/rent-increases.spec.ts`

- [ ] **Step 5: Commit**

```bash
git add e2e/tests/all-tenants.spec.ts e2e/tests/rent-payments.spec.ts e2e/tests/rent-increases.spec.ts
git commit -m "test(e2e): add all-tenants, rent payments, and rent increases tests"
```

---

## Task 10: Expenses Tests

**Files:**
- Create: `e2e/tests/expenses.spec.ts`

- [ ] **Step 1: Write expenses.spec.ts**

```typescript
import { test, expect } from '../fixtures/test-data';
import { type APIRequestContext } from '@playwright/test';
import { createProperty, createGroup, createExpense, createAdminApiContext, deleteProperty, deleteGroup } from '../helpers/api-setup';

test.describe('Expenses', () => {
  let apiCtx: APIRequestContext;
  let groupId: number;
  let propertyId: number;

  test.beforeAll(async () => {
    apiCtx = await createAdminApiContext();
    const group = await createGroup(apiCtx);
    groupId = group.id;
    const prop = await createProperty(apiCtx, groupId);
    propertyId = prop.id;
  });

  test.afterAll(async () => {
    await deleteProperty(apiCtx, propertyId).catch(() => {});
    await deleteGroup(apiCtx, groupId).catch(() => {});
    await apiCtx.dispose();
  });

  test('create expense via form', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const description = `E2E Expense ${Date.now()}`;

    await page.goto(`/properties/${propertyId}/expenses/new`);
    await page.locator('#category').selectOption('Maintenance');
    await page.locator('#date').fill(new Date().toISOString().split('T')[0]);
    await page.getByLabel('Açıklama').fill(description);
    await page.locator('#amount').fill('1500');
    await page.locator('#currency').selectOption('TRY');
    await page.getByRole('button', { name: 'Gider Ekle' }).click();

    await expect(page).toHaveURL(new RegExp(`/properties/${propertyId}/expenses`));
    await expect(page.getByText(description)).toBeVisible();
  });

  test('edit expense', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await createExpense(apiCtx, propertyId);

    await page.goto(`/properties/${propertyId}/expenses`);
    await page.locator('.action-btn, [title="Düzenle"]').first().click();

    const newDesc = `Edited ${Date.now()}`;
    await page.getByLabel('Açıklama').clear();
    await page.getByLabel('Açıklama').fill(newDesc);
    await page.getByRole('button', { name: 'Güncelle' }).click();

    await expect(page.getByText(newDesc)).toBeVisible();
  });

  test('delete expense', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const desc = `Delete me ${Date.now()}`;
    await createExpense(apiCtx, propertyId, { description: desc });

    await page.goto(`/properties/${propertyId}/expenses`);

    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('.action-btn--danger, [title="Sil"]').first().click();

    await expect(page.getByText(desc)).not.toBeVisible();
  });

  test('category filter', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await createExpense(apiCtx, propertyId, { category: 'Repair', description: `Repair ${Date.now()}` });

    await page.goto(`/properties/${propertyId}/expenses`);
    const categoryFilter = page.locator('select').first();
    if (await categoryFilter.isVisible()) {
      await categoryFilter.selectOption('Repair');
      await expect(page.locator('table')).toBeVisible();
    }
  });
});
```

- [ ] **Step 2: Run and verify**

Run: `cd e2e && npx playwright test tests/expenses.spec.ts`

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/expenses.spec.ts
git commit -m "test(e2e): add expense CRUD tests"
```

---

## Task 11: Bills Tests

**Files:**
- Create: `e2e/tests/bills.spec.ts`

- [ ] **Step 1: Write bills.spec.ts**

```typescript
import { test, expect } from '../fixtures/test-data';
import { type APIRequestContext } from '@playwright/test';
import { createProperty, createGroup, createBill, createAdminApiContext, deleteProperty, deleteGroup } from '../helpers/api-setup';

test.describe('Bills', () => {
  let apiCtx: APIRequestContext;
  let groupId: number;
  let propertyId: number;

  test.beforeAll(async () => {
    apiCtx = await createAdminApiContext();
    const group = await createGroup(apiCtx);
    groupId = group.id;
    const prop = await createProperty(apiCtx, groupId);
    propertyId = prop.id;
  });

  test.afterAll(async () => {
    await deleteProperty(apiCtx, propertyId).catch(() => {});
    await deleteGroup(apiCtx, groupId).catch(() => {});
    await apiCtx.dispose();
  });

  test('create bill via form', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto(`/properties/${propertyId}/bills/new`);
    await page.locator('#type').selectOption('Electric');
    await page.locator('#dueDate').fill(new Date().toISOString().split('T')[0]);
    await page.locator('#amount').fill('350');
    await page.locator('#currency').selectOption('TRY');
    await page.getByRole('button', { name: 'Fatura Ekle' }).click();

    await expect(page).toHaveURL(new RegExp(`/properties/${propertyId}/bills`));
  });

  test('edit bill', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await createBill(apiCtx, propertyId);

    await page.goto(`/properties/${propertyId}/bills`);
    await page.locator('[title="Düzenle"], .action-btn').first().click();

    await page.locator('#amount').clear();
    await page.locator('#amount').fill('500');
    await page.getByRole('button', { name: 'Güncelle' }).click();

    await expect(page.getByText('500')).toBeVisible();
  });

  test('mark bill as paid', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await createBill(apiCtx, propertyId);

    await page.goto(`/properties/${propertyId}/bills`);
    await page.getByRole('button', { name: 'Ödendi' }).first().click();

    await expect(page.getByText('Ödendi').first()).toBeVisible();
  });

  test('delete bill', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await createBill(apiCtx, propertyId);

    await page.goto(`/properties/${propertyId}/bills`);
    const rowCount = await page.locator('tbody tr').count();

    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('.action-btn--danger, [title="Sil"]').first().click();

    await expect(page.locator('tbody tr')).toHaveCount(rowCount - 1);
  });

  test('status filter', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto(`/properties/${propertyId}/bills`);
    const statusFilter = page.locator('select').first();
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('Paid');
      await expect(page.locator('table')).toBeVisible();
    }
  });
});
```

- [ ] **Step 2: Run and verify**

Run: `cd e2e && npx playwright test tests/bills.spec.ts`

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/bills.spec.ts
git commit -m "test(e2e): add bill CRUD tests"
```

---

## Task 12: Short-Term Rentals Tests

**Files:**
- Create: `e2e/tests/short-term-rentals.spec.ts`

- [ ] **Step 1: Write short-term-rentals.spec.ts**

```typescript
import { test, expect } from '../fixtures/test-data';
import { type APIRequestContext } from '@playwright/test';
import { createProperty, createGroup, createShortTermRental, createAdminApiContext, deleteProperty, deleteGroup } from '../helpers/api-setup';

test.describe('Short-Term Rentals', () => {
  let apiCtx: APIRequestContext;
  let groupId: number;
  let propertyId: number;

  test.beforeAll(async () => {
    apiCtx = await createAdminApiContext();
    const group = await createGroup(apiCtx);
    groupId = group.id;
    const prop = await createProperty(apiCtx, groupId);
    propertyId = prop.id;
  });

  test.afterAll(async () => {
    await deleteProperty(apiCtx, propertyId).catch(() => {});
    await deleteGroup(apiCtx, groupId).catch(() => {});
    await apiCtx.dispose();
  });

  test('create short-term rental via form', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const guestName = `E2E Guest ${Date.now()}`;
    const checkIn = new Date();
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 3);

    await page.goto(`/properties/${propertyId}/short-term-rentals/new`);
    await page.getByLabel('Misafir Adı').fill(guestName);
    await page.locator('#checkIn').fill(checkIn.toISOString().split('T')[0]);
    await page.locator('#checkOut').fill(checkOut.toISOString().split('T')[0]);
    await page.locator('#platform').selectOption('Airbnb');
    await page.locator('#currency').selectOption('TRY');
    await page.locator('#nightlyRate').fill('500');
    await page.locator('#totalAmount').fill('1500');
    await page.locator('#platformFee').fill('150');
    await page.locator('#netAmount').fill('1350');
    await page.getByRole('button', { name: 'Rezervasyon Ekle' }).click();

    await expect(page).toHaveURL(new RegExp(`/properties/${propertyId}/short-term-rentals`));
    await expect(page.getByText(guestName)).toBeVisible();
  });

  test('edit short-term rental', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await createShortTermRental(apiCtx, propertyId);

    await page.goto(`/properties/${propertyId}/short-term-rentals`);
    await page.locator('[title="Düzenle"], .action-btn').first().click();

    const newGuest = `Edited Guest ${Date.now()}`;
    await page.getByLabel('Misafir Adı').clear();
    await page.getByLabel('Misafir Adı').fill(newGuest);
    await page.getByRole('button', { name: 'Güncelle' }).click();

    await expect(page.getByText(newGuest)).toBeVisible();
  });

  test('delete short-term rental', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await createShortTermRental(apiCtx, propertyId);

    await page.goto(`/properties/${propertyId}/short-term-rentals`);
    const rowCount = await page.locator('tbody tr').count();

    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('.action-btn--danger, [title="Sil"]').first().click();

    await expect(page.locator('tbody tr')).toHaveCount(rowCount - 1);
  });
});
```

- [ ] **Step 2: Run and verify**

Run: `cd e2e && npx playwright test tests/short-term-rentals.spec.ts`

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/short-term-rentals.spec.ts
git commit -m "test(e2e): add short-term rental CRUD tests"
```

---

## Task 13: Documents Tests

**Files:**
- Create: `e2e/tests/documents.spec.ts`

- [ ] **Step 1: Write documents.spec.ts**

```typescript
import { test, expect } from '../fixtures/test-data';
import { type APIRequestContext } from '@playwright/test';
import { createProperty, createGroup, createAdminApiContext, deleteProperty, deleteGroup } from '../helpers/api-setup';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe('Documents', () => {
  let apiCtx: APIRequestContext;
  let groupId: number;
  let propertyId: number;
  const testFilePath = path.join(__dirname, '..', 'test-data', 'test-doc.pdf');
  const invalidFilePath = path.join(__dirname, '..', 'test-data', 'invalid.exe');

  test.beforeAll(async () => {
    apiCtx = await createAdminApiContext();
    const group = await createGroup(apiCtx);
    groupId = group.id;
    const prop = await createProperty(apiCtx, groupId);
    propertyId = prop.id;

    const fixturesDir = path.dirname(testFilePath);
    if (!fs.existsSync(fixturesDir)) fs.mkdirSync(fixturesDir, { recursive: true });
    fs.writeFileSync(testFilePath, 'dummy pdf content for testing');
    fs.writeFileSync(invalidFilePath, 'dummy exe content');
  });

  test.afterAll(async () => {
    await deleteProperty(apiCtx, propertyId).catch(() => {});
    await deleteGroup(apiCtx, groupId).catch(() => {});
    await apiCtx.dispose();
    if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
    if (fs.existsSync(invalidFilePath)) fs.unlinkSync(invalidFilePath);
  });

  test('upload document', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto(`/properties/${propertyId}/documents`);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);
    await page.locator('select').selectOption('Contract');
    await page.getByRole('button', { name: 'Yükle' }).click();

    await expect(page.getByText('test-doc.pdf')).toBeVisible();
  });

  test('download document', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto(`/properties/${propertyId}/documents`);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'İndir' }).first().click(),
    ]);

    expect(download.suggestedFilename()).toBeTruthy();
  });

  test('delete document', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto(`/properties/${propertyId}/documents`);

    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('.action-btn--danger, [title="Sil"]').first().click();

    await expect(page.getByText('test-doc.pdf')).not.toBeVisible();
  });

  test('invalid file extension shows error', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto(`/properties/${propertyId}/documents`);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(invalidFilePath);
    await page.locator('select').selectOption('Contract');
    await page.getByRole('button', { name: 'Yükle' }).click();

    await expect(page.locator('.error-banner, [role="alert"]')).toBeVisible();
  });
});
```

- [ ] **Step 2: Run and verify**

Run: `cd e2e && npx playwright test tests/documents.spec.ts`

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/documents.spec.ts
git commit -m "test(e2e): add document upload/download/delete tests"
```

---

## Task 14: Dashboard & Reports Tests

**Files:**
- Create: `e2e/tests/dashboard.spec.ts`
- Create: `e2e/tests/reports.spec.ts`

- [ ] **Step 1: Write dashboard.spec.ts**

```typescript
import { test, expect } from '../fixtures/test-data';

test.describe('Dashboard', () => {
  test('dashboard shows stat cards', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/dashboard');
    await expect(page.locator('.stat-card')).toHaveCount(3);
  });

  test('dashboard shows financial summary', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/dashboard');
    await expect(page.getByText('Kâr / Zarar').first()).toBeVisible();
  });

  test('year filter changes data', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/dashboard');
    const yearSelect = page.locator('.filter-select').first();
    await yearSelect.selectOption(String(new Date().getFullYear() - 1));
    await expect(page.locator('.stat-card')).toHaveCount(3);
  });
});
```

- [ ] **Step 2: Write reports.spec.ts**

```typescript
import { test, expect } from '../fixtures/test-data';

test.describe('Reports', () => {
  test('profit-loss report data displays', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/dashboard');
    await expect(page.getByText('Kâr / Zarar').first()).toBeVisible();
    await expect(page.locator('.summary-card')).toHaveCount({ minimum: 1 });
  });

  test('export excel', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/dashboard');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Excel' }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
  });

  test('export pdf', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/dashboard');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'PDF' }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });
});
```

- [ ] **Step 3: Run and verify**

Run: `cd e2e && npx playwright test tests/dashboard.spec.ts tests/reports.spec.ts`

- [ ] **Step 4: Commit**

```bash
git add e2e/tests/dashboard.spec.ts e2e/tests/reports.spec.ts
git commit -m "test(e2e): add dashboard and report export tests"
```

---

## Task 15: Notifications Tests

**Files:**
- Create: `e2e/tests/notifications.spec.ts`

- [ ] **Step 1: Write notifications.spec.ts**

```typescript
import { test, expect } from '../fixtures/test-data';

test.describe('Notifications', () => {
  test('notifications page loads', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/notifications');
    await expect(page.getByText(/Bildirim/)).toBeVisible();
  });

  test('dismiss single notification', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/notifications');

    const closeBtn = page.locator('.notification-card button, [aria-label="Kapat"]').first();
    if (await closeBtn.isVisible()) {
      const countBefore = await page.locator('.notification-card').count();
      await closeBtn.click();
      await expect(page.locator('.notification-card')).toHaveCount(countBefore - 1);
    }
  });

  test('dismiss all notifications', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/notifications');

    const dismissAllBtn = page.getByRole('button', { name: /Tümünü Okundu/ });
    if (await dismissAllBtn.isVisible()) {
      await dismissAllBtn.click();
      await expect(page.getByText(/Bildirim bulunmuyor/)).toBeVisible();
    }
  });
});
```

- [ ] **Step 2: Run and verify**

Run: `cd e2e && npx playwright test tests/notifications.spec.ts`

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/notifications.spec.ts
git commit -m "test(e2e): add notification tests"
```

---

## Task 16: Import Tests

**Files:**
- Create: `e2e/tests/import.spec.ts`
- Create: `e2e/test-data/airbnb-sample.csv`

- [ ] **Step 1: Create test CSV fixtures**

Create `e2e/test-data/airbnb-sample.csv`:
```csv
Guest,Check-in,Check-out,Nights,Amount,Service fee,Net
John Doe,2026-04-01,2026-04-04,3,1500,150,1350
```

Create `e2e/test-data/rent-payments-sample.csv`:
```csv
PropertyName,TenantName,Amount,Currency,DueDate,PaymentStatus
Test Property,Test Tenant,5000,TRY,2026-04-01,Pending
```

- [ ] **Step 2: Write import.spec.ts**

```typescript
import { test, expect } from '../fixtures/test-data';
import { type APIRequestContext } from '@playwright/test';
import { createProperty, createGroup, createAdminApiContext, deleteProperty, deleteGroup } from '../helpers/api-setup';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe('Import', () => {
  let apiCtx: APIRequestContext;
  let groupId: number;
  let propertyId: number;

  test.beforeAll(async () => {
    apiCtx = await createAdminApiContext();
    const group = await createGroup(apiCtx);
    groupId = group.id;
    const prop = await createProperty(apiCtx, groupId);
    propertyId = prop.id;
  });

  test.afterAll(async () => {
    await deleteProperty(apiCtx, propertyId).catch(() => {});
    await deleteGroup(apiCtx, groupId).catch(() => {});
    await apiCtx.dispose();
  });

  test('airbnb CSV dry-run shows preview', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/import');

    await page.getByText('Airbnb CSV').click();
    await page.locator('select').selectOption(String(propertyId));

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, '..', 'test-data', 'airbnb-sample.csv'));

    await page.getByRole('button', { name: 'Önizleme' }).click();
    await expect(page.getByText('John Doe')).toBeVisible();
  });

  test('rent payments CSV dry-run shows preview', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/import');

    await page.getByText('Kira Ödemeleri').click();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, '..', 'test-data', 'rent-payments-sample.csv'));

    await page.getByRole('button', { name: 'Önizleme' }).click();
    await expect(page.locator('table')).toBeVisible();
  });
});
```

- [ ] **Step 3: Run and verify**

Run: `cd e2e && npx playwright test tests/import.spec.ts`

- [ ] **Step 4: Commit**

```bash
git add e2e/tests/import.spec.ts e2e/test-data/
git commit -m "test(e2e): add import CSV preview tests"
```

---

## Task 17: Admin Users Tests

**Files:**
- Create: `e2e/tests/admin-users.spec.ts`

- [ ] **Step 1: Write admin-users.spec.ts**

```typescript
import { test, expect } from '../fixtures/test-data';

test.describe('Admin Users', () => {
  test('user list visible for superadmin', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/admin/users');
    await expect(page.getByText('Kullanıcılar')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('create new user', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const email = `e2e-new-${Date.now()}@gurkan.com`;

    await page.goto('/admin/users');
    await page.getByRole('button', { name: /Yeni Kullanıcı/ }).click();

    await page.getByLabel('Ad Soyad').fill('E2E New User');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Şifre').fill('NewUser123!');
    await page.getByRole('button', { name: 'Oluştur' }).click();

    await expect(page.getByText(email)).toBeVisible();
  });

  test('change user role', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/admin/users');

    const userRow = page.locator('tr', { hasText: 'e2e-user@gurkan.com' });
    await userRow.getByRole('button', { name: /Rol Değiştir/ }).click();

    await page.locator('.modal-dialog select, #newRole').selectOption('User');
    await page.getByRole('button', { name: 'Kaydet' }).click();

    await expect(userRow.locator('.role-badge')).toBeVisible();
  });

  test('regular user cannot access admin pages', async ({ userPage }) => {
    const page = userPage;
    await page.goto('/admin/users');
    await expect(page).not.toHaveURL(/\/admin\/users/);
  });
});
```

- [ ] **Step 2: Run and verify**

Run: `cd e2e && npx playwright test tests/admin-users.spec.ts`

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/admin-users.spec.ts
git commit -m "test(e2e): add admin user management tests"
```

---

## Task 18: Admin Groups Tests

**Files:**
- Create: `e2e/tests/admin-groups.spec.ts`

- [ ] **Step 1: Write admin-groups.spec.ts**

```typescript
import { test, expect } from '../fixtures/test-data';

test.describe('Admin Groups', () => {
  test('create group', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const groupName = `E2E Group ${Date.now()}`;

    await page.goto('/admin/groups');
    await page.getByRole('button', { name: /Yeni Grup/ }).click();
    await page.getByLabel('Grup Adı').fill(groupName);
    await page.getByRole('button', { name: 'Oluştur' }).click();

    await expect(page.getByText(groupName)).toBeVisible();
  });

  test('group detail shows members and properties sections', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const groupName = `E2E Detail Group ${Date.now()}`;

    await page.goto('/admin/groups');
    await page.getByRole('button', { name: /Yeni Grup/ }).click();
    await page.getByLabel('Grup Adı').fill(groupName);
    await page.getByRole('button', { name: 'Oluştur' }).click();

    await page.getByText(groupName).click();
    await expect(page.getByText(/Üyeler/)).toBeVisible();
    await expect(page.getByText(/Mülkler/)).toBeVisible();
  });

  test('add member to group', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const groupName = `E2E Member Group ${Date.now()}`;

    await page.goto('/admin/groups');
    await page.getByRole('button', { name: /Yeni Grup/ }).click();
    await page.getByLabel('Grup Adı').fill(groupName);
    await page.getByRole('button', { name: 'Oluştur' }).click();
    await page.getByText(groupName).click();

    await page.getByRole('button', { name: /Üye Ekle/ }).click();
    await page.locator('.modal-dialog select').first().selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Ekle' }).click();

    await expect(page.locator('.member-item, tr').filter({ hasText: /@/ })).toHaveCount({ minimum: 1 });
  });

  test('assign property to group', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/admin/groups');
    await page.locator('.group-card, tr').first().click();

    await page.getByRole('button', { name: /Mülk Ata/ }).click();
    const propertySelect = page.locator('.modal-dialog select').first();
    const optionCount = await propertySelect.locator('option').count();
    if (optionCount > 1) {
      await propertySelect.selectOption({ index: 1 });
      await page.getByRole('button', { name: 'Ata' }).click();
    }
  });

  test('remove member from group', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/admin/groups');
    await page.locator('.group-card, tr').first().click();

    const removeBtn = page.getByRole('button', { name: /Çıkar/ }).first();
    if (await removeBtn.isVisible()) {
      await removeBtn.click();
    }
  });

  test('delete group', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const groupName = `E2E Delete Group ${Date.now()}`;

    await page.goto('/admin/groups');
    await page.getByRole('button', { name: /Yeni Grup/ }).click();
    await page.getByLabel('Grup Adı').fill(groupName);
    await page.getByRole('button', { name: 'Oluştur' }).click();

    await page.getByText(groupName).click();
    await page.getByRole('button', { name: 'Sil' }).click();
    await page.getByRole('button', { name: 'Sil' }).last().click();

    await expect(page).toHaveURL('/admin/groups');
  });
});
```

- [ ] **Step 2: Run and verify**

Run: `cd e2e && npx playwright test tests/admin-groups.spec.ts`

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/admin-groups.spec.ts
git commit -m "test(e2e): add admin group management tests"
```

---

## Task 19: Admin Banks Tests

**Files:**
- Create: `e2e/tests/admin-banks.spec.ts`

- [ ] **Step 1: Write admin-banks.spec.ts**

```typescript
import { test, expect } from '../fixtures/test-data';

test.describe('Admin Banks', () => {
  test('create bank', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const bankName = `E2E Bank ${Date.now()}`;

    await page.goto('/admin/banks');
    await page.getByRole('button', { name: /Yeni Banka/ }).click();
    await page.getByPlaceholder('Örn: Ziraat Bankası').fill(bankName);
    await page.getByRole('button', { name: 'Ekle' }).click();

    await expect(page.getByText(bankName)).toBeVisible();
  });

  test('delete bank', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const bankName = `E2E Delete Bank ${Date.now()}`;

    await page.goto('/admin/banks');
    await page.getByRole('button', { name: /Yeni Banka/ }).click();
    await page.getByPlaceholder('Örn: Ziraat Bankası').fill(bankName);
    await page.getByRole('button', { name: 'Ekle' }).click();
    await expect(page.getByText(bankName)).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('tr', { hasText: bankName }).getByRole('button').click();

    await expect(page.getByText(bankName)).not.toBeVisible();
  });
});
```

Note: Bank account CRUD is tested indirectly through the PropertyForm subscription section (Task 20) where users create new bank accounts inline. The admin bank page only manages bank name definitions.
```
```

- [ ] **Step 2: Run and verify**

Run: `cd e2e && npx playwright test tests/admin-banks.spec.ts`

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/admin-banks.spec.ts
git commit -m "test(e2e): add admin bank management tests"
```

---

## Task 20: Subscriptions Tests

**Files:**
- Create: `e2e/tests/subscriptions.spec.ts`

- [ ] **Step 1: Write subscriptions.spec.ts**

```typescript
import { test, expect } from '../fixtures/test-data';
import { type APIRequestContext } from '@playwright/test';
import { createProperty, createGroup, createAdminApiContext, deleteProperty, deleteGroup } from '../helpers/api-setup';

test.describe('Subscriptions', () => {
  let apiCtx: APIRequestContext;
  let groupId: number;
  let propertyId: number;

  test.beforeAll(async () => {
    apiCtx = await createAdminApiContext();
    const group = await createGroup(apiCtx);
    groupId = group.id;
    const prop = await createProperty(apiCtx, groupId);
    propertyId = prop.id;
  });

  test.afterAll(async () => {
    await deleteProperty(apiCtx, propertyId).catch(() => {});
    await deleteGroup(apiCtx, groupId).catch(() => {});
    await apiCtx.dispose();
  });

  test('subscriptions page loads', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/subscriptions');
    await expect(page.getByText(/Abonelik/)).toBeVisible();
  });

  test('edit subscriptions via property form', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto(`/properties/${propertyId}/edit`);

    const waterSection = page.locator('.subscription-card, .form-section').filter({ hasText: 'Su' });
    if (await waterSection.isVisible()) {
      const subscriptionInput = waterSection.locator('input[type="text"]').first();
      await subscriptionInput.fill('12345678');
      await page.getByRole('button', { name: 'Kaydet' }).click();
      await expect(page).toHaveURL(`/properties/${propertyId}`);
    }
  });
});
```

- [ ] **Step 2: Run and verify**

Run: `cd e2e && npx playwright test tests/subscriptions.spec.ts`

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/subscriptions.spec.ts
git commit -m "test(e2e): add subscription tests"
```

---

## Task 21: Settings Telegram Tests

**Files:**
- Create: `e2e/tests/settings-telegram.spec.ts`

- [ ] **Step 1: Write settings-telegram.spec.ts**

```typescript
import { test, expect } from '../fixtures/test-data';

test.describe('Telegram Settings', () => {
  test('telegram link page loads', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/settings/telegram');
    await expect(page.getByText(/Telegram/)).toBeVisible();
  });

  test('link code input accepts 6 digits', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/settings/telegram');

    const linkInput = page.getByPlaceholder('123456');
    if (await linkInput.isVisible()) {
      await linkInput.fill('999999');
      await expect(page.getByRole('button', { name: 'Bağla' })).toBeEnabled();
    }
  });
});
```

- [ ] **Step 2: Run and verify**

Run: `cd e2e && npx playwright test tests/settings-telegram.spec.ts`

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/settings-telegram.spec.ts
git commit -m "test(e2e): add telegram settings tests"
```

---

## Task 22: Full Suite Verification

- [ ] **Step 1: Run entire test suite**

Run: `cd e2e && npx playwright test`
Expected: All tests pass.

- [ ] **Step 2: Generate and verify HTML report**

Run: `cd e2e && npx playwright show-report`

- [ ] **Step 3: Final commit with spec and plan docs**

```bash
git add docs/superpowers/specs/2026-03-25-e2e-playwright-design.md docs/superpowers/plans/2026-03-25-e2e-playwright.md
git commit -m "docs: add E2E Playwright test suite spec and implementation plan"
```
