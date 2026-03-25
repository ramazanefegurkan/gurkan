import { test, expect } from '../fixtures/test-fixtures';
import { type APIRequestContext } from '@playwright/test';
import { createProperty, createGroup, createTenant, createAdminApiContext, deleteProperty, deleteGroup } from '../helpers/api-setup';

test.describe('Tenants', () => {
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

  test('create tenant with auto-generated payment plan', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const tenantName = `E2E Tenant ${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    const leaseEnd = threeMonths.toISOString().split('T')[0];

    await page.goto(`/properties/${propertyId}/tenants/new`);
    await page.getByLabel('Ad Soyad').fill(tenantName);
    await page.locator('#leaseStart').fill(today);
    await page.locator('#leaseEnd').fill(leaseEnd);
    await page.locator('#monthlyRent').fill('5000');
    await page.locator('#currency').selectOption('TRY');
    await page.getByRole('button', { name: 'Kiracı Ekle' }).click();

    await expect(page).toHaveURL(/\/tenants\/\d+/);
    await expect(page.getByText(tenantName)).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('tenant list shows active tenant', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto(`/properties/${propertyId}/tenants`);
    await expect(page.locator('.tenant-card, .active-tenants')).toBeVisible();
  });

  test('edit tenant', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const tenant = await createTenant(apiCtx, propertyId);
    const newName = `Edited ${tenant.fullName}`;

    await page.goto(`/properties/${propertyId}/tenants/${tenant.id}/edit`);
    await page.getByLabel('Ad Soyad').clear();
    await page.getByLabel('Ad Soyad').fill(newName);
    await page.getByRole('button', { name: 'Güncelle' }).click();

    await expect(page.getByText(newName)).toBeVisible();
  });

  test('terminate tenant cancels future payments', async ({ authenticatedPage }) => {
    const prop = await createProperty(apiCtx, groupId);
    const tenant = await createTenant(apiCtx, prop.id);
    const page = authenticatedPage;

    await page.goto(`/properties/${prop.id}/tenants/${tenant.id}`);
    await page.getByRole('button', { name: /Sonlandır/ }).click();
    await page.getByRole('button', { name: /Evet, Sonlandır/ }).click();

    await expect(page.getByText(/Sonlanmış/)).toBeVisible();
    await deleteProperty(apiCtx, prop.id).catch(() => {});
  });
});
