import { test, expect } from './fixtures';

test.describe('Navigation & Storage Persistence', () => {
  test('renders all 15 tool tabs in TabBar', async ({ sidepanelPage }) => {
    const tabs = sidepanelPage.locator('.tab-item');
    await expect(tabs).toHaveCount(15);
    await expect(sidepanelPage.locator('.app')).toHaveCSS('flex-direction', 'row');
    await expect(sidepanelPage.locator('aside.tab-bar')).toHaveCSS('flex-direction', 'column');

    const expectedLabels = [
      'JSON',
      'YAML',
      'Base64',
      'URL',
      'JWT',
      'Hash',
      'UUID',
      'Time',
      'Cron',
      'Data',
      'Read files',
      'Regex',
      'Diff',
      'MD',
      'Tabs',
    ];

    for (let i = 0; i < expectedLabels.length; i++) {
      await expect(tabs.nth(i).locator('.tab-label')).toHaveText(expectedLabels[i]);
    }

    await expect(sidepanelPage.locator('.status-indicator')).toContainText('Local only');
    await expect(sidepanelPage.locator('button.theme-toggle-btn')).toBeVisible();
    await expect(sidepanelPage.locator('.tool-nav-heading')).toHaveText(['Transform', 'Create', 'View', 'Inspect', 'Browser']);
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

    const tabsTab = sidepanelPage.locator('.tab-item', { hasText: 'Tabs' });
    await tabsTab.click();
    await expect(sidepanelPage.locator('.tab-item.active .tab-label')).toHaveText('Tabs');
    await expect(sidepanelPage.locator('.tabs-navigator')).toBeVisible();
    await expect(sidepanelPage.locator('.tabs-navigator')).toContainText('Jump between tabs');
    await expect(sidepanelPage.locator('.tabs-navigator')).toContainText('Alt + Q');
    await expect(sidepanelPage.locator('.tabs-navigator')).toContainText('Ctrl');
  });

  test('opens the tool command palette with Control+Shift+K and switches tools', async ({ sidepanelPage }) => {
    await sidepanelPage.keyboard.press('Control+Shift+k');
    const palette = sidepanelPage.getByRole('dialog', { name: 'Search developer tools' });
    await expect(palette).toBeVisible();

    const search = palette.getByRole('searchbox', { name: 'Search tools' });
    await search.fill('regex');
    await expect(palette.getByRole('option')).toHaveCount(1);
    await sidepanelPage.keyboard.press('Enter');

    await expect(palette).toHaveCount(0);
    await expect(sidepanelPage.locator('.tab-item.active .tab-label')).toHaveText('Regex');
    await expect(sidepanelPage.locator('.regex-tester')).toBeVisible();
  });

  test('uses an accessible compact rail below the responsive breakpoint', async ({ sidepanelPage }) => {
    await sidepanelPage.setViewportSize({ width: 860, height: 700 });
    await expect(sidepanelPage.getByRole('button', { name: 'Search tools' })).toBeVisible();
    await expect(sidepanelPage.locator('.tab-label').first()).toBeHidden();
    await expect(sidepanelPage.locator('.tab-item').first()).toHaveAttribute('title', /JSON/);
  });

  test('opens the tab switcher with Control+K, filters tabs, and closes with Escape', async ({
    sidepanelPage,
    context,
    serverUrl,
  }) => {
    const fixturePage = await context.newPage();
    await fixturePage.goto(serverUrl);
    await expect(fixturePage).toHaveTitle('hckr Test Fixture Page');
    await sidepanelPage.bringToFront();

    await sidepanelPage.keyboard.press('Control+K');
    const switcher = sidepanelPage.getByRole('dialog', { name: 'hckr-tools tab switcher' });
    await expect(switcher).toBeVisible();

    await expect(switcher.locator('.tab-switcher-item').first().locator('.tab-switcher-shortcut')).toHaveText('1');

    const fixtureRow = switcher.locator('.tab-switcher-item', { hasText: 'hckr Test Fixture Page' });
    const shortcut = (await fixtureRow.locator('.tab-switcher-shortcut').innerText()).trim();
    await sidepanelPage.keyboard.press(shortcut);
    await expect.poll(async () => fixturePage.evaluate(() => document.visibilityState)).toBe('visible');

    await sidepanelPage.bringToFront();
    await sidepanelPage.keyboard.press('Control+K');
    await expect(switcher).toBeVisible();

    const search = sidepanelPage.getByRole('searchbox', { name: 'Search open tabs' });
    await search.fill('hckr Test Fixture Page');
    await expect(switcher.locator('.tab-switcher-item')).toHaveCount(1);
    await expect(switcher.locator('.tab-switcher-title')).toHaveText('hckr Test Fixture Page');

    await sidepanelPage.keyboard.press('Escape');
    await expect(switcher).toHaveCount(0);

    await fixturePage.close();
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

  test('persists JSON tool input across side panel reloads', async ({
    sidepanelPage,
  }) => {
    await sidepanelPage.locator('.tab-item', { hasText: 'JSON', exact: true }).click();
    const marker = '{"persistProbe":true,"source":"e2e-reload"}';
    await sidepanelPage.locator('textarea.json-textarea').fill(marker);
    await expect(sidepanelPage.locator('textarea.json-textarea')).toHaveValue(marker);
    await sidepanelPage.waitForTimeout(400);

    await sidepanelPage.reload();
    await sidepanelPage.waitForLoadState('domcontentloaded');
    await expect(sidepanelPage.locator('.tab-item.active .tab-label')).toHaveText('JSON');
    await expect(sidepanelPage.locator('textarea.json-textarea')).toHaveValue(marker);
  });

  test('standalone ?switcher=1 page lists open tabs', async ({
    context,
    extensionId,
    serverUrl,
  }) => {
    const fixturePage = await context.newPage();
    await fixturePage.goto(serverUrl);
    await expect(fixturePage).toHaveTitle('hckr Test Fixture Page');

    const switcherPage = await context.newPage();
    await switcherPage.goto(
      `chrome-extension://${extensionId}/src/sidepanel/index.html?switcher=1`
    );
    await switcherPage.waitForLoadState('domcontentloaded');

    const switcher = switcherPage.getByRole('dialog', { name: 'hckr-tools tab switcher' });
    await expect(switcher).toBeVisible();
    await expect(switcher.locator('.tab-switcher-item', { hasText: 'hckr Test Fixture Page' })).toBeVisible();

    await switcherPage.close();
    await fixturePage.close();
  });
});
