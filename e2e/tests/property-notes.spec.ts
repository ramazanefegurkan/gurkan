import { test, expect } from '../fixtures/test-fixtures';
import { type APIRequestContext } from '@playwright/test';
import { createProperty, createGroup, createAdminApiContext, deleteProperty, deleteGroup } from '../helpers/api-setup';

test.describe('Property Notes', () => {
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

  test('add note to property', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto(`/properties/${propertyId}`);

    const noteText = `E2E note ${Date.now()}`;
    await page.getByPlaceholder('Yeni bir not ekleyin').fill(noteText);
    await page.getByRole('button', { name: 'Ekle' }).click();

    await expect(page.getByText(noteText)).toBeVisible();
  });

  test('edit own note', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto(`/properties/${propertyId}`);

    const noteText = `Edit me ${Date.now()}`;
    await page.getByPlaceholder('Yeni bir not ekleyin').fill(noteText);
    await page.getByRole('button', { name: 'Ekle' }).click();
    await expect(page.getByText(noteText)).toBeVisible();

    const noteItem = page.locator('.note-item', { hasText: noteText });
    await noteItem.hover();
    await noteItem.locator('.note-action-btn').first().click();

    const editedText = `Edited ${noteText}`;
    await page.locator('.note-edit-input').fill(editedText);
    await page.getByRole('button', { name: 'Kaydet' }).click();

    await expect(page.getByText(editedText)).toBeVisible();
  });

  test('delete note', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto(`/properties/${propertyId}`);

    const noteText = `Delete me ${Date.now()}`;
    await page.getByPlaceholder('Yeni bir not ekleyin').fill(noteText);
    await page.getByRole('button', { name: 'Ekle' }).click();
    await expect(page.getByText(noteText)).toBeVisible();

    const noteItem = page.locator('.note-item', { hasText: noteText });
    await noteItem.hover();
    await noteItem.locator('.note-action-btn--danger').click();

    await expect(page.getByText(noteText)).not.toBeVisible();
  });
});
