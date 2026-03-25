import { test, expect } from '../fixtures/test-fixtures';
import { type APIRequestContext } from '@playwright/test';
import { createProperty, createGroup, createAdminApiContext, deleteProperty, deleteGroup } from '../helpers/api-setup';

test.describe('Properties', () => {
  let apiCtx: APIRequestContext;
  let groupId: string;
  let createdPropertyIds: string[] = [];

  test.beforeAll(async () => {
    apiCtx = await createAdminApiContext();
    const group = await createGroup(apiCtx);
    groupId = group.id;
  });

  test.afterAll(async () => {
    for (const id of createdPropertyIds) {
      await deleteProperty(apiCtx, id).catch(() => {});
    }
    await deleteGroup(apiCtx, groupId).catch(() => {});
    await apiCtx.dispose();
  });

  test('create property via form', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const propertyName = `E2E UI Property ${Date.now()}`;

    await page.goto('/properties/new');
    await page.getByLabel('Mülk Adı').fill(propertyName);
    await page.locator('#type').selectOption('Apartment');
    await page.locator('#currency').selectOption('TRY');
    await page.locator('#groupId').selectOption(String(groupId));
    await page.locator('#address').fill('Test Sokak 1');
    await page.locator('#city').fill('İstanbul');
    await page.locator('#district').fill('Kadıköy');
    await page.getByRole('button', { name: 'Mülk Oluştur' }).click();

    await expect(page).toHaveURL(/\/properties\/[a-zA-Z0-9-]+/);
    await expect(page.locator('h1.detail-title, h1.page-title').first()).toContainText(propertyName);
  });

  test('property list shows created property', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const prop = await createProperty(apiCtx, groupId);
    createdPropertyIds.push(prop.id);

    await page.goto('/properties');
    await expect(page.getByText(prop.name)).toBeVisible();
  });

  test('property detail shows tabs', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const prop = await createProperty(apiCtx, groupId);
    createdPropertyIds.push(prop.id);

    await page.goto(`/properties/${prop.id}`);
    await expect(page.locator('.property-tab', { hasText: 'Detaylar' })).toBeVisible();
    await expect(page.locator('.property-tab', { hasText: 'Kiracılar' })).toBeVisible();
    await expect(page.locator('.property-tab', { hasText: 'Giderler' })).toBeVisible();
    await expect(page.locator('.property-tab', { hasText: 'Faturalar' })).toBeVisible();
    await expect(page.locator('.property-tab', { hasText: 'Dökümanlar' })).toBeVisible();
  });

  test('edit property', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const prop = await createProperty(apiCtx, groupId);
    createdPropertyIds.push(prop.id);
    const newName = `Edited ${prop.name}`;

    await page.goto(`/properties/${prop.id}/edit`);
    await page.getByLabel('Mülk Adı').clear();
    await page.getByLabel('Mülk Adı').fill(newName);
    await page.getByRole('button', { name: 'Kaydet' }).click();

    await expect(page).toHaveURL(new RegExp(`/properties/${prop.id}`));
    await expect(page.locator('h1.detail-title, h1.page-title').first()).toContainText(newName);
  });

  test('delete property', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const prop = await createProperty(apiCtx, groupId);

    await page.goto(`/properties/${prop.id}`);
    await page.getByRole('button', { name: 'Sil' }).click();
    await page.getByRole('button', { name: 'Evet, Sil' }).click();

    await expect(page).toHaveURL('/properties');
    await expect(page.getByText(prop.name)).not.toBeVisible();
  });

  test('create property with USD currency', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const propertyName = `E2E USD Property ${Date.now()}`;

    await page.goto('/properties/new');
    await page.getByLabel('Mülk Adı').fill(propertyName);
    await page.locator('#type').selectOption('House');
    await page.locator('#currency').selectOption('USD');
    await page.locator('#groupId').selectOption(String(groupId));
    await page.locator('#address').fill('Test Sokak 1');
    await page.locator('#city').fill('İstanbul');
    await page.locator('#district').fill('Kadıköy');
    await page.getByRole('button', { name: 'Mülk Oluştur' }).click();

    await expect(page).toHaveURL(/\/properties\/[a-zA-Z0-9-]+/);
    await expect(page.locator('.badge-currency')).toContainText('USD');
  });

  test('create property with EUR currency', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const propertyName = `E2E EUR Property ${Date.now()}`;

    await page.goto('/properties/new');
    await page.getByLabel('Mülk Adı').fill(propertyName);
    await page.locator('#type').selectOption('Office');
    await page.locator('#currency').selectOption('EUR');
    await page.locator('#groupId').selectOption(String(groupId));
    await page.locator('#address').fill('Test Sokak 1');
    await page.locator('#city').fill('İstanbul');
    await page.locator('#district').fill('Kadıköy');
    await page.getByRole('button', { name: 'Mülk Oluştur' }).click();

    await expect(page).toHaveURL(/\/properties\/[a-zA-Z0-9-]+/);
    await expect(page.locator('.badge-currency')).toContainText('EUR');
  });

  test('group access restriction - user cannot access other group property', async ({ userPage }) => {
    const page = userPage;
    const prop = await createProperty(apiCtx, groupId);
    createdPropertyIds.push(prop.id);

    await page.goto(`/properties/${prop.id}`);
    await expect(page.getByText(/403|Erişim engellendi|yetkili değilsiniz|yüklenemedi/i)).toBeVisible();
  });
});
