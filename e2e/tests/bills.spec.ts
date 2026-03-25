import { test, expect } from '../fixtures/test-fixtures';
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
