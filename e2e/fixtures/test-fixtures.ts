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
