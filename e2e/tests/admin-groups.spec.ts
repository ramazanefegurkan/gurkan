import { test, expect } from '../fixtures/test-fixtures';

test.describe('Admin Groups', () => {
  test('create group', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const groupName = `E2E Group ${Date.now()}`;

    await page.goto('/admin/groups');
    await page.getByRole('button', { name: /Yeni Grup/ }).click();
    await page.locator('.modal-dialog .form-field').filter({ hasText: 'Grup Adı' }).locator('input').fill(groupName);
    await page.getByRole('button', { name: 'Oluştur' }).click();

    await expect(page.getByText(groupName)).toBeVisible();
  });

  test('group detail shows members and properties sections', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const groupName = `E2E Detail Group ${Date.now()}`;

    await page.goto('/admin/groups');
    await page.getByRole('button', { name: /Yeni Grup/ }).click();
    await page.locator('.modal-dialog .form-field').filter({ hasText: 'Grup Adı' }).locator('input').fill(groupName);
    await page.getByRole('button', { name: 'Oluştur' }).click();

    await page.getByText(groupName).click();
    await expect(page.locator('.group-section-title').filter({ hasText: /Üyeler/ })).toBeVisible();
    await expect(page.locator('.group-section-title').filter({ hasText: /Mülkler/ })).toBeVisible();
  });

  test('add member to group', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const groupName = `E2E Member Group ${Date.now()}`;

    await page.goto('/admin/groups');
    await page.getByRole('button', { name: /Yeni Grup/ }).click();
    await page.locator('.modal-dialog .form-field').filter({ hasText: 'Grup Adı' }).locator('input').fill(groupName);
    await page.getByRole('button', { name: 'Oluştur' }).click();
    await page.getByText(groupName).click();

    await page.getByRole('button', { name: /Üye Ekle/ }).click();
    await page.locator('.modal-dialog select').first().selectOption({ index: 1 });
    await page.locator('.modal-dialog').getByRole('button', { name: 'Ekle' }).click();

    await expect(page.locator('.member-row').first()).toBeVisible();
  });

  test('assign property to group', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/admin/groups');
    await page.locator('.group-card, tr').first().click();

    await page.getByRole('button', { name: /Mülk Ata/ }).click();
    const propertySelect = page.locator('.modal-dialog select').first();
    const optionCount = await propertySelect.locator('option').count();
    if (optionCount > 1) {
      await propertySelect.selectOption({ index: 1 });
      await page.getByRole('button', { name: 'Ata' }).click();
    }
  });

  test('remove member from group', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/admin/groups');
    await page.locator('.group-card, tr').first().click();

    const removeBtn = page.getByRole('button', { name: /Çıkar/ }).first();
    if (await removeBtn.isVisible()) {
      await removeBtn.click();
    }
  });

  test('delete group', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    const groupName = `E2E Delete Group ${Date.now()}`;

    await page.goto('/admin/groups');
    await page.getByRole('button', { name: /Yeni Grup/ }).click();
    await page.locator('.modal-dialog .form-field').filter({ hasText: 'Grup Adı' }).locator('input').fill(groupName);
    await page.getByRole('button', { name: 'Oluştur' }).click();

    await page.getByText(groupName).click();
    await page.getByRole('button', { name: 'Sil' }).first().click();
    await page.locator('.confirm-dialog').getByRole('button', { name: 'Sil' }).click();

    await expect(page).toHaveURL('/admin/groups');
  });
});
