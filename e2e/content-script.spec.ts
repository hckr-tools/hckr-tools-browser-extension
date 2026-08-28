import { test, expect } from './fixtures';

test.describe('Content Script & Page Content Detection', () => {
  test('detects JSON, JWT, and Base64 on web pages and injects floating action widgets', async ({
    context,
    serverUrl,
  }) => {
    const page = await context.newPage();
    await page.goto(`${serverUrl}/test-page.html`);
    await page.waitForLoadState('networkidle');

    // Content script runs at document_idle, wait for widgets to appear
    const widgets = page.locator('.hckr-widget');
    await expect(widgets.first()).toBeVisible({ timeout: 5000 });

    // Should detect JSON, JWT, and Base64 samples
    await expect(widgets).toHaveCount(3);

    for (let i = 0; i < 3; i++) {
      await expect(widgets.nth(i)).toContainText('Open in hckr');
    }

    await page.close();
  });

  test('clicking widget dispatches message to open full tab with payload', async ({
    context,
    serverUrl,
  }) => {
    const page = await context.newPage();
    await page.goto(`${serverUrl}/test-page.html`);
    await page.waitForLoadState('networkidle');

    const jsonWidget = page.locator('#json-sample .hckr-widget');
    await expect(jsonWidget).toBeVisible({ timeout: 5000 });

    // Clicking the widget triggers service worker to open the hckr tab
    const [appPage] = await Promise.all([
      context.waitForEvent('page'),
      jsonWidget.click(),
    ]);

    await appPage.waitForLoadState('domcontentloaded');

    await expect(appPage.locator('.tab-item.active .tab-label')).toHaveText('JSON');
    const textarea = appPage.locator('textarea.json-textarea');
    await expect(textarea).toHaveValue(/hckr/);

    await page.close();
    await appPage.close();
  });

  test('clicking JWT widget opens JWT tool with token payload', async ({
    context,
    serverUrl,
  }) => {
    const page = await context.newPage();
    await page.goto(`${serverUrl}/test-page.html`);
    await page.waitForLoadState('networkidle');

    const jwtWidget = page.locator('#jwt-sample .hckr-widget');
    await expect(jwtWidget).toBeVisible({ timeout: 5000 });

    const [appPage] = await Promise.all([
      context.waitForEvent('page'),
      jwtWidget.click(),
    ]);

    await appPage.waitForLoadState('domcontentloaded');
    await expect(appPage.locator('.tab-item.active .tab-label')).toHaveText('JWT');
    await expect(appPage.locator('textarea.jwt-textarea')).toHaveValue(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/);

    await page.close();
    await appPage.close();
  });

  test('clicking Base64 widget opens Base64 tool with encoded payload', async ({
    context,
    serverUrl,
  }) => {
    const page = await context.newPage();
    await page.goto(`${serverUrl}/test-page.html`);
    await page.waitForLoadState('networkidle');

    const base64Widget = page.locator('#base64-sample .hckr-widget');
    await expect(base64Widget).toBeVisible({ timeout: 5000 });

    const [appPage] = await Promise.all([
      context.waitForEvent('page'),
      base64Widget.click(),
    ]);

    await appPage.waitForLoadState('domcontentloaded');
    await expect(appPage.locator('.tab-item.active .tab-label')).toHaveText('Base64');
    await expect(appPage.locator('textarea.base64-textarea')).toHaveValue(
      /SGVsbG8sIHRoaXMgaXMgYSB0ZXN0IG1lc3NhZ2UgZm9yIGhja3IgZGV2IHRvb2xraXQh/
    );

    await page.close();
    await appPage.close();
  });
});
