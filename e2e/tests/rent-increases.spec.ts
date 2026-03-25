import { test, expect } from '../fixtures/test-fixtures';
import { type APIRequestContext } from '@playwright/test';
import { createProperty, createGroup, createTenant, createAdminApiContext, deleteProperty, deleteGroup } from '../helpers/api-setup';

test.describe('Rent Increases', () => {
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

  test('create rent increase and verify future payments updated', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto(`/properties/${propertyId}/tenants/${tenantId}`);

    await page.getByRole('button', { name: /Sözleşmeyi Yenile/ }).click();

    const newEnd = new Date();
    newEnd.setFullYear(newEnd.getFullYear() + 1);
    await page.locator('.modal-dialog .form-field').filter({ hasText: 'Yeni Bitiş Tarihi' }).locator('input').fill(newEnd.toISOString().split('T')[0]);
    await page.locator('.modal-dialog .form-field').filter({ hasText: 'Artış Oranı' }).locator('input').fill('20');
    await page.locator('.modal-dialog').getByRole('button', { name: 'Yenile', exact: true }).click();

    await expect(page.getByText(/6.000|6,000/).first()).toBeVisible();
  });
});
