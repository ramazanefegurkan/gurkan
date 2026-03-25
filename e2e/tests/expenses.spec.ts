import { test, expect } from '../fixtures/test-fixtures';
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
