import { test, expect } from './fixtures';

test('does not inject hckr controls into ordinary pages', async ({ context, serverUrl }) => {
  const page = await context.newPage();
  await page.goto(`${serverUrl}/test-page.html`);
  await page.waitForLoadState('networkidle');

  await expect(page.locator('.hckr-widget')).toHaveCount(0);

  await page.close();
});
