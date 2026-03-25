import { test, expect } from '../fixtures/test-fixtures';

test.describe('Reports', () => {
  test('profit-loss report data displays', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/dashboard');
    await expect(page.getByText('Kâr / Zarar').first()).toBeVisible();
    await expect(page.locator('.summary-card').first()).toBeVisible();
  });

  test('export excel', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/dashboard');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Excel' }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
  });

  test('export pdf', async ({ authenticatedPage }) => {
    const page = authenticatedPage;
    await page.goto('/dashboard');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'PDF' }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });
});
