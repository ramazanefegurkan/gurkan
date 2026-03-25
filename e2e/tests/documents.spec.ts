import { test, expect } from '../fixtures/test-fixtures';
import { type APIRequestContext } from '@playwright/test';
import { createProperty, createGroup, createAdminApiContext, deleteProperty, deleteGroup } from '../helpers/api-setup';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe('Documents', () => {
  let apiCtx: APIRequestContext;
  let groupId: string;
  let propertyId: string;
  const testFilePath = path.join(__dirname, '..', 'test-data', 'test-doc.pdf');
  const invalidFilePath = path.join(__dirname, '..', 'test-data', 'invalid.exe');

  test.beforeAll(async () => {
    apiCtx = await createAdminApiContext();
    const group = await createGroup(apiCtx);
    groupId = group.id;
    const prop = await createProperty(apiCtx, groupId);
    propertyId = prop.id;

    const fixturesDir = path.dirname(testFilePath);
    if (!fs.existsSync(fixturesDir)) fs.mkdirSync(fixturesDir, { recursive: true });
    fs.writeFileSync(testFilePath, 'dummy pdf content for testing');
    fs.writeFileSync(invalidFilePath, 'dummy exe content');
  });

  test.afterAll(async () => {
    await deleteProperty(apiCtx, propertyId).catch(() => {});
    await deleteGroup(apiCtx, groupId).catch(() => {});
    await apiCtx.dispose();
    if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
    if (fs.existsSync(invalidFilePath)) fs.unlinkSync(invalidFilePath);
  });

  test('upload document', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto(`/properties/${propertyId}/documents`);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);
    await page.locator('select').selectOption('Contract');
    await page.getByRole('button', { name: 'Yükle' }).click();

    await expect(page.getByText('test-doc.pdf')).toBeVisible();
  });

  test('download document', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto(`/properties/${propertyId}/documents`);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'İndir' }).first().click(),
    ]);

    expect(download.suggestedFilename()).toBeTruthy();
  });

  test('delete document', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto(`/properties/${propertyId}/documents`);

    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('.action-btn--danger, [title="Sil"]').first().click();

    await expect(page.getByText('test-doc.pdf')).not.toBeVisible();
  });

  test('invalid file extension shows error', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto(`/properties/${propertyId}/documents`);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(invalidFilePath);
    await page.locator('select').selectOption('Contract');
    await page.getByRole('button', { name: 'Yükle' }).click();

    await expect(page.locator('.doc-upload-error, .error-banner, [role="alert"]')).toBeVisible();
  });
});
