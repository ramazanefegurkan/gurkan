import { test, expect } from '../fixtures/test-fixtures';

test.describe('Dashboard', () => {
  test('dashboard shows stat cards', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/dashboard');
    await expect(page.locator('.stat-card')).toHaveCount(3);
  });

  test('dashboard shows financial summary', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/dashboard');
    await expect(page.getByText('Kâr / Zarar').first()).toBeVisible();
  });

  test('year filter changes data', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/dashboard');
    const yearSelect = page.locator('.filter-select').first();
    await yearSelect.selectOption(String(new Date().getFullYear() - 1));
    await expect(page.locator('.stat-card')).toHaveCount(3);
  });
});
