import { test, expect } from '../fixtures/test-fixtures';

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
