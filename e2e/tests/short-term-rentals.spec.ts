import { test, expect } from '../fixtures/test-fixtures';
import { type APIRequestContext } from '@playwright/test';
import { createProperty, createGroup, createShortTermRental, createAdminApiContext, deleteProperty, deleteGroup } from '../helpers/api-setup';

test.describe('Short-Term Rentals', () => {
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

  test('create short-term rental via form', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const guestName = `E2E Guest ${Date.now()}`;
    const checkIn = new Date();
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 3);

    await page.goto(`/properties/${propertyId}/short-term-rentals/new`);
    await page.locator('.form-field').filter({ hasText: 'Misafir Adı' }).locator('input').fill(guestName);
    await page.locator('.form-field').filter({ hasText: 'Giriş Tarihi' }).locator('input').fill(checkIn.toISOString().split('T')[0]);
    await page.locator('.form-field').filter({ hasText: 'Çıkış Tarihi' }).locator('input').fill(checkOut.toISOString().split('T')[0]);
    await page.locator('.form-field').filter({ hasText: 'Platform' }).locator('select').selectOption('Airbnb');
    await page.locator('.form-field').filter({ hasText: 'Para Birimi' }).locator('select').selectOption('TRY');
    await page.locator('.form-field').filter({ hasText: 'Gecelik Ücret' }).locator('input').fill('500');
    await page.locator('.form-field').filter({ hasText: 'Toplam Tutar' }).locator('input').fill('1500');
    await page.locator('.form-field').filter({ hasText: 'Platform Komisyonu' }).locator('input').fill('150');
    await page.locator('.form-field').filter({ hasText: 'Net Tutar' }).locator('input').fill('1350');
    await page.getByRole('button', { name: 'Rezervasyon Ekle' }).click();

    await expect(page).toHaveURL(new RegExp(`/properties/${propertyId}/short-term-rentals`));
    await expect(page.getByText(guestName)).toBeVisible();
  });

  test('edit short-term rental', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await createShortTermRental(apiCtx, propertyId);

    await page.goto(`/properties/${propertyId}/short-term-rentals`);
    await page.locator('[title="Düzenle"], .action-btn').first().click();

    const newGuest = `Edited Guest ${Date.now()}`;
    await page.locator('.form-field').filter({ hasText: 'Misafir Adı' }).locator('input').clear();
    await page.locator('.form-field').filter({ hasText: 'Misafir Adı' }).locator('input').fill(newGuest);
    await page.getByRole('button', { name: 'Güncelle' }).click();

    await expect(page.getByText(newGuest)).toBeVisible();
  });

  test('delete short-term rental', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await createShortTermRental(apiCtx, propertyId);

    await page.goto(`/properties/${propertyId}/short-term-rentals`);
    await expect(page.locator('.action-btn--danger, [title="Sil"]').first()).toBeVisible();
    const rowCount = await page.locator('tbody tr').count();

    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('.action-btn--danger, [title="Sil"]').first().click();

    await expect(page.locator('tbody tr')).toHaveCount(rowCount - 1);
  });
});
