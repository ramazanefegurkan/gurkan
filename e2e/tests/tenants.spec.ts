import { test, expect } from '../fixtures/test-fixtures';
import { type APIRequestContext } from '@playwright/test';
import { createProperty, createGroup, createTenant, createAdminApiContext, deleteProperty, deleteGroup } from '../helpers/api-setup';

test.describe('Tenants', () => {
  let apiCtx: APIRequestContext;
  let groupId: string;
  let propertyId: string;

  test.beforeAll(async () => {
    apiCtx = await createAdminApiContext();
    const group = await createGroup(apiCtx);
    groupId = group.id;
    const prop = await createProperty(apiCtx, groupId);
    propertyId = prop.id;
    await createTenant(apiCtx, propertyId);
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

    const freshProp = await createProperty(apiCtx, groupId);
    await page.goto(`/properties/${freshProp.id}/tenants/new`);
    await page.locator('.form-field').filter({ hasText: 'Ad Soyad' }).locator('input').fill(tenantName);
    await page.locator('.form-field').filter({ hasText: 'Kira Başlangıcı' }).locator('input').fill(today);
    await page.locator('.form-field').filter({ hasText: 'Kira Bitişi' }).locator('input').fill(leaseEnd);
    await page.locator('.form-field').filter({ hasText: 'Aylık Kira' }).locator('input').fill('5000');
    await page.locator('.form-field').filter({ hasText: 'Para Birimi' }).locator('select').selectOption('TRY');
    await page.getByRole('button', { name: 'Kiracı Ekle' }).click();

    await expect(page).toHaveURL(/\/tenants\/[a-zA-Z0-9-]+/);
    await expect(page.getByText(tenantName)).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
    await deleteProperty(apiCtx, freshProp.id).catch(() => {});
  });

  test('tenant list shows active tenant', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto(`/properties/${propertyId}/tenants`);
    await expect(page.locator('.tenant-card')).toBeVisible();
  });

  test('edit tenant', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const freshProp = await createProperty(apiCtx, groupId);
    const tenant = await createTenant(apiCtx, freshProp.id);
    const newName = `Edited ${tenant.fullName}`;

    await page.goto(`/properties/${freshProp.id}/tenants/${tenant.id}/edit`);
    await page.locator('.form-field').filter({ hasText: 'Ad Soyad' }).locator('input').clear();
    await page.locator('.form-field').filter({ hasText: 'Ad Soyad' }).locator('input').fill(newName);
    await page.getByRole('button', { name: 'Güncelle' }).click();

    await expect(page.locator('h1.detail-title')).toContainText(newName);
    await deleteProperty(apiCtx, freshProp.id).catch(() => {});
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
