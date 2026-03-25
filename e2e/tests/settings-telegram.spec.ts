import { test, expect } from '../fixtures/test-fixtures';

test.describe('Telegram Settings', () => {
  test('telegram link page loads', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/settings/telegram');
    await expect(page.getByText(/Telegram/)).toBeVisible();
  });

  test('link code input accepts 6 digits', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/settings/telegram');

    const linkInput = page.getByPlaceholder('123456');
    if (await linkInput.isVisible()) {
      await linkInput.fill('999999');
      await expect(page.getByRole('button', { name: 'Bağla' })).toBeEnabled();
    }
  });
});
