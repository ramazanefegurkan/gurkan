import { test, expect } from '../fixtures/test-fixtures';
import { type APIRequestContext } from '@playwright/test';
import { createProperty, createGroup, createTenant, createAdminApiContext, deleteProperty, deleteGroup } from '../helpers/api-setup';

test.describe('Rent Payments', () => {
  let apiCtx: APIRequestContext;
  let groupId: string;
  let propertyId: string;
  let tenantId: string;

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
    await page.locator('.modal-dialog .form-field').filter({ hasText: 'Ödeme Tarihi' }).locator('input').fill(new Date().toISOString().split('T')[0]);
    await page.locator('.modal-dialog .form-field').filter({ hasText: 'Ödeme Yöntemi' }).locator('select').selectOption('BankTransfer');
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
