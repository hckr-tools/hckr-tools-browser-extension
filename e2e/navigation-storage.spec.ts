import { test, expect } from './fixtures';

test.describe('Navigation & Storage Persistence', () => {
  test('renders all 11 tool tabs in TabBar', async ({ sidepanelPage }) => {
    const tabs = sidepanelPage.locator('.tab-item');
    await expect(tabs).toHaveCount(11);

    const expectedLabels = [
      'JSON',
      'Base64',
      'UUID',
      'Time',
      'URL',
      'JWT',
      'Hash',
      'Regex',
      'Data',
      'Diff',
      'MD',
    ];

    for (let i = 0; i < expectedLabels.length; i++) {
      await expect(tabs.nth(i).locator('.tab-label')).toHaveText(expectedLabels[i]);
    }
  });

  test('switches tools when clicking tabs', async ({ sidepanelPage }) => {
    // Default active tab is JSON
    await expect(sidepanelPage.locator('.tab-item.active .tab-label')).toHaveText('JSON');
    await expect(sidepanelPage.locator('.json-formatter')).toBeVisible();

    // Click Base64 tab
    const base64Tab = sidepanelPage.locator('.tab-item', { hasText: 'Base64' });
    await base64Tab.click();
    await expect(sidepanelPage.locator('.tab-item.active .tab-label')).toHaveText('Base64');
    await expect(sidepanelPage.locator('.base64-tool')).toBeVisible();

    // Click UUID tab
    const uuidTab = sidepanelPage.locator('.tab-item', { hasText: 'UUID' });
    await uuidTab.click();
    await expect(sidepanelPage.locator('.tab-item.active .tab-label')).toHaveText('UUID');
    await expect(sidepanelPage.locator('.uuid-container')).toBeVisible();

    // Click Hash tab
    const hashTab = sidepanelPage.locator('.tab-item', { hasText: 'Hash' });
    await hashTab.click();
    await expect(sidepanelPage.locator('.tab-item.active .tab-label')).toHaveText('Hash');
    await expect(sidepanelPage.locator('.hash-generator')).toBeVisible();
  });

  test('persists active tool preference across side panel reloads', async ({
    sidepanelPage,
    extensionId,
  }) => {
    // Switch to JWT Decoder
    const jwtTab = sidepanelPage.locator('.tab-item', { hasText: 'JWT' });
    await jwtTab.click();
    await expect(sidepanelPage.locator('.tab-item.active .tab-label')).toHaveText('JWT');

    // Reload side panel page
    await sidepanelPage.goto(`chrome-extension://${extensionId}/src/sidepanel/index.html`);
    await sidepanelPage.waitForLoadState('domcontentloaded');

    // Verify JWT remains the active tab
    await expect(sidepanelPage.locator('.tab-item.active .tab-label')).toHaveText('JWT');
    await expect(sidepanelPage.locator('.jwt-decoder')).toBeVisible();
  });

  test('toggles between dark and light themes and persists theme preference', async ({
    sidepanelPage,
    extensionId,
  }) => {
    // Default theme is dark
    const html = sidepanelPage.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');

    const themeToggleBtn = sidepanelPage.locator('button.theme-toggle-btn');
    await expect(themeToggleBtn).toBeVisible();

    // Click toggle to switch to Light mode
    await themeToggleBtn.click();
    await expect(html).toHaveAttribute('data-theme', 'light');

    // Reload page to verify theme persistence
    await sidepanelPage.goto(`chrome-extension://${extensionId}/src/sidepanel/index.html`);
    await sidepanelPage.waitForLoadState('domcontentloaded');
    await expect(html).toHaveAttribute('data-theme', 'light');

    // Click toggle to switch back to Dark mode
    await themeToggleBtn.click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });
});
