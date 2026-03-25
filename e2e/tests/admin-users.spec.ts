import { test, expect } from '../fixtures/test-fixtures';

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
