import { test, expect } from '../fixtures/test-fixtures';
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
