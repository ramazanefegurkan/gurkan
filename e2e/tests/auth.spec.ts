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
