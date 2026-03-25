import { test, expect } from '../fixtures/test-fixtures';
import { type APIRequestContext } from '@playwright/test';
import { createProperty, createGroup, createExpense, createAdminApiContext, deleteProperty, deleteGroup } from '../helpers/api-setup';

test.describe('Expenses', () => {
  let apiCtx: APIRequestContext;
  let groupId: string;
  let propertyId: string;

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
    await page.locator('.form-field').filter({ hasText: 'Kategori' }).locator('select').selectOption('Maintenance');
    await page.locator('.form-field').filter({ hasText: 'Tarih' }).locator('input').fill(new Date().toISOString().split('T')[0]);
    await page.locator('.form-field').filter({ hasText: 'Açıklama' }).locator('input').fill(description);
    await page.locator('.form-field').filter({ hasText: 'Tutar' }).locator('input').fill('1500');
    await page.locator('.form-field').filter({ hasText: 'Para Birimi' }).locator('select').selectOption('TRY');
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
    await page.locator('.form-field').filter({ hasText: 'Açıklama' }).locator('input').clear();
    await page.locator('.form-field').filter({ hasText: 'Açıklama' }).locator('input').fill(newDesc);
    await page.getByRole('button', { name: 'Güncelle' }).click();

    await expect(page.getByText(newDesc)).toBeVisible();
  });

  test('delete expense', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const desc = `Delete me ${Date.now()}`;
    await createExpense(apiCtx, propertyId, { description: desc });

    await page.goto(`/properties/${propertyId}/expenses`);
    await expect(page.getByText(desc)).toBeVisible();

    const row = page.locator('tr').filter({ hasText: desc });
    page.once('dialog', (dialog) => dialog.accept());
    await row.locator('[title="Sil"]').click();

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
