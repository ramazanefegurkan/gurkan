import { test, expect } from '../fixtures/test-fixtures';
import { type APIRequestContext } from '@playwright/test';
import { createProperty, createGroup, createAdminApiContext, deleteProperty, deleteGroup } from '../helpers/api-setup';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe('Import', () => {
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

  test('airbnb CSV dry-run shows preview', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/import');

    await page.locator('.import-tab').filter({ hasText: 'Airbnb CSV' }).click();
    await page.locator('select').selectOption(String(propertyId));

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, '..', 'test-data', 'airbnb-sample.csv'));

    await page.getByRole('button', { name: 'Önizleme' }).click();
    await expect(page.getByText('John Doe')).toBeVisible();
  });

  test('rent payments CSV dry-run shows preview', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/import');

    await page.getByText('Kira Ödemeleri').click();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, '..', 'test-data', 'rent-payments-sample.csv'));

    await page.getByRole('button', { name: 'Önizleme' }).click();
    await expect(page.locator('table')).toBeVisible();
  });
});
