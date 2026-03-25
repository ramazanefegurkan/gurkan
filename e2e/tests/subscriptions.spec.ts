import { test, expect } from '../fixtures/test-fixtures';
import { type APIRequestContext } from '@playwright/test';
import { createProperty, createGroup, createAdminApiContext, deleteProperty, deleteGroup } from '../helpers/api-setup';

test.describe('Subscriptions', () => {
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

  test('subscriptions page loads', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/subscriptions');
    await expect(page.getByText(/Abonelik/)).toBeVisible();
  });

  test('edit subscriptions via property form', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto(`/properties/${propertyId}/edit`);

    const waterSection = page.locator('.subscription-card, .form-section').filter({ hasText: 'Su' });
    if (await waterSection.isVisible()) {
      const subscriptionInput = waterSection.locator('input[type="text"]').first();
      await subscriptionInput.fill('12345678');
      await page.getByRole('button', { name: 'Kaydet' }).click();
      await expect(page).toHaveURL(`/properties/${propertyId}`);
    }
  });
});
