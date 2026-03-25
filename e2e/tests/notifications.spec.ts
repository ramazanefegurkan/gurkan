import { test, expect } from '../fixtures/test-fixtures';

test.describe('Notifications', () => {
  test('notifications page loads', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/notifications');
    await expect(page.locator('h1.page-title')).toBeVisible();
  });

  test('dismiss single notification', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/notifications');

    const closeBtn = page.locator('.notification-card button, [aria-label="Kapat"]').first();
    if (await closeBtn.isVisible()) {
      const countBefore = await page.locator('.notification-card').count();
      await closeBtn.click();
      await expect(page.locator('.notification-card')).toHaveCount(countBefore - 1);
    }
  });

  test('dismiss all notifications', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/notifications');

    const dismissAllBtn = page.getByRole('button', { name: /Tümünü Okundu/ });
    if (await dismissAllBtn.isVisible()) {
      await dismissAllBtn.click();
      await expect(page.getByText(/Bildirim bulunmuyor/)).toBeVisible();
    }
  });
});
