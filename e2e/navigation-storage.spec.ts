import { test, expect } from './fixtures';

test.describe('Navigation & Storage Persistence', () => {
  test('renders all 16 tool tabs in TabBar', async ({ sidepanelPage }) => {
    const tabs = sidepanelPage.locator('.tab-item');
    await expect(tabs).toHaveCount(16);
    await expect(sidepanelPage.locator('.app')).toHaveCSS('flex-direction', 'row');
    await expect(sidepanelPage.locator('aside.tab-bar')).toHaveCSS('flex-direction', 'column');

    const expectedLabels = [
      'Workspace',
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
    await expect(sidepanelPage.locator('.tool-nav-heading')).toHaveText(['Workspace', 'Transform', 'Create', 'View', 'Inspect', 'Browser']);
    await expect(sidepanelPage.locator('.workspace-header')).toContainText('Workspace');
  });

  test('switches tools when clicking tabs', async ({ sidepanelPage }) => {
    // New profiles start in Workspace; existing active tool preferences are retained.
    await expect(sidepanelPage.locator('.tab-item.active .tab-label')).toHaveText('Workspace');
    await expect(sidepanelPage.locator('.workspace-tool')).toBeVisible();

    await sidepanelPage.locator('.tab-item', { hasText: 'JSON', exact: true }).click();
    await expect(sidepanelPage.locator('.json-formatter')).toBeVisible();

    // Click Base64 tab
    const base64Tab = sidepanelPage.locator('.tab-item', { hasText: 'Base64' });
    await base64Tab.click();
    await expect(sidepanelPage.locator('.tab-item.active .tab-label')).toHaveText('Base64');
    await expect(sidepanelPage.locator('.base64-tool')).toBeVisible();
    await expect(sidepanelPage.locator('.workspace-header h1')).toHaveText('Base64');

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

  test('creates, moves, and saves explicit workspace context', async ({ sidepanelPage }) => {
    await expect(sidepanelPage.locator('.workspace-tool')).toBeVisible();
    await sidepanelPage.getByRole('button', { name: '+ New card' }).click();
    const drawer = sidepanelPage.locator('.workspace-card-drawer');
    await expect(drawer).toBeVisible();
    await drawer.locator('#card-title-input').fill('Investigate callback');
    await drawer.locator('#card-url-input').fill('https://example.test/callback');
    await drawer.getByRole('button', { name: 'Create card' }).click();
    await expect(drawer).not.toBeVisible();

    const inbox = sidepanelPage.locator('.workspace-column', { hasText: 'Inbox' });
    await expect(inbox.getByText('Investigate callback')).toBeVisible();
    await expect(inbox.locator('.workspace-card-key')).toHaveText(/^[A-Z0-9]+-1$/);

    // Open card to move status to Working (sleek cards have no direct ← → buttons)
    await inbox.locator('.workspace-card-title-btn').click();
    await expect(drawer).toBeVisible();
    await drawer.locator('.drawer-status-select').selectOption({ label: 'Working' });
    await drawer.getByRole('button', { name: 'Close card details' }).click();
    await expect(drawer).not.toBeVisible();

    const working = sidepanelPage.locator('.workspace-column', { hasText: 'Working' });
    await expect(working.getByText('Investigate callback')).toBeVisible();

    // Click card to open drawer/modal and edit details + add comments
    await working.locator('.workspace-card-title-btn').click();
    await expect(drawer).toBeVisible();
    await drawer.locator('#card-note-input').fill('Callback details in drawer');
    await drawer.locator('#card-comment-input').fill('Investigating token refresh behavior');
    await drawer.getByRole('button', { name: 'Comment' }).click();
    await expect(drawer.locator('.card-comment-item')).toContainText('Investigating token refresh behavior');
    await drawer.getByRole('button', { name: 'Save changes' }).click();
    await expect(drawer).not.toBeVisible();

    // Verify card displays comment count badge on board
    await expect(working.locator('.workspace-card-comment-indicator')).toContainText('💬 1');

    // Re-open card to verify comment persisted
    await working.locator('.workspace-card-title-btn').click();
    await expect(drawer).toBeVisible();
    await expect(drawer.locator('.card-comment-item')).toContainText('Investigating token refresh behavior');
    await drawer.getByRole('button', { name: 'Close card details' }).click();
    await expect(drawer).not.toBeVisible();

    // Switch to Saved Context view
    await sidepanelPage.getByRole('tab', { name: /Saved Context/ }).click();
    const contextView = sidepanelPage.locator('.workspace-saved-context-view');
    await expect(contextView).toBeVisible();
    await contextView.locator('input').fill('Callback notes');
    await contextView.locator('textarea').fill('Only manually saved text belongs in Cloud Sync.');
    await contextView.getByRole('button', { name: 'Save context' }).click();
    await expect(contextView.getByText('Callback notes')).toBeVisible();
  });

  test('switches workspaces from header dropdown and updates details accordingly', async ({ sidepanelPage }) => {
    await expect(sidepanelPage.locator('.workspace-tool')).toBeVisible();
    const headerSelect = sidepanelPage.locator('.workspace-header #workspace-select');
    await expect(headerSelect).toBeVisible();

    // Create Alpha workspace via toolbar
    await sidepanelPage.getByRole('button', { name: 'New workspace' }).click();
    let nameInput = sidepanelPage.getByRole('textbox', { name: 'Workspace name' });
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Alpha Project');
    await sidepanelPage.getByRole('button', { name: 'Create' }).click();

    // Heading and header select should now reflect Alpha Project
    await expect(sidepanelPage.locator('#workspace-heading')).toHaveText('Alpha Project');

    // Create Beta workspace via toolbar
    await sidepanelPage.getByRole('button', { name: 'New workspace' }).click();
    nameInput = sidepanelPage.getByRole('textbox', { name: 'Workspace name' });
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Beta Project');
    await sidepanelPage.getByRole('button', { name: 'Create' }).click();

    // Heading should now be Beta Project
    await expect(sidepanelPage.locator('#workspace-heading')).toHaveText('Beta Project');

    // Switch back to Alpha Project using the header select
    const alphaOption = await headerSelect.locator('option', { hasText: 'Alpha Project' }).getAttribute('value');
    await headerSelect.selectOption(alphaOption!);

    // Details and heading update back to Alpha Project
    await expect(sidepanelPage.locator('#workspace-heading')).toHaveText('Alpha Project');

    // Switch back to Beta Project and archive it
    const betaOption = await headerSelect.locator('option', { hasText: 'Beta Project' }).getAttribute('value');
    await headerSelect.selectOption(betaOption!);
    await expect(sidepanelPage.locator('#workspace-heading')).toHaveText('Beta Project');

    const archiveBtn = sidepanelPage.getByRole('button', { name: 'Archive workspace' });
    await expect(archiveBtn).toBeVisible();
    await archiveBtn.click();

    // Automatically transitions away from archived Beta Project
    await expect(sidepanelPage.locator('#workspace-heading')).not.toHaveText('Beta Project');
  });

  test('opens workspace settings dialog to inspect overview and rename workspace', async ({ sidepanelPage }) => {
    await expect(sidepanelPage.locator('.workspace-tool')).toBeVisible();
    const settingsBtn = sidepanelPage.locator('.workspace-settings-btn');
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    const dialog = sidepanelPage.getByRole('dialog', { name: 'Workspace Settings' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Active Cards')).toBeVisible();
    await expect(dialog.getByText('Danger Zone')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Export JSON' })).toBeVisible();

    await dialog.getByRole('button', { name: 'Done' }).click();
    await expect(dialog).not.toBeVisible();
  });

  test('views archived workspaces in settings dialog and restores them back to active', async ({ sidepanelPage }) => {
    // 1. Create a workspace to archive
    await sidepanelPage.getByRole('button', { name: 'New workspace' }).click();
    const nameInput = sidepanelPage.getByRole('textbox', { name: 'Workspace name' });
    await nameInput.fill('Temporary Project');
    await sidepanelPage.getByRole('button', { name: 'Create' }).click();
    await expect(sidepanelPage.locator('#workspace-heading')).toHaveText('Temporary Project');

    // 2. Archive this workspace via the toolbar button
    await sidepanelPage.getByRole('button', { name: 'Archive workspace' }).click();
    await expect(sidepanelPage.locator('#workspace-heading')).not.toHaveText('Temporary Project');

    // 3. Verify toolbar shows Archived button
    const archivedBtn = sidepanelPage.locator('.btn-archived-workspaces');
    await expect(archivedBtn).toBeVisible();
    await expect(archivedBtn).toContainText('Archived (1)');

    // 4. Click Archived button to open settings dialog
    await archivedBtn.click();
    const dialog = sidepanelPage.getByRole('dialog', { name: 'Workspace Settings' });
    await expect(dialog).toBeVisible();

    // 5. Verify Archived Workspaces section lists Temporary Project
    const archivedItem = dialog.locator('.archived-workspace-item');
    await expect(archivedItem).toContainText('Temporary Project');

    // 6. Click Restore to active
    const restoreBtn = archivedItem.getByRole('button', { name: /Restore to active/ });
    await restoreBtn.click();

    // 7. Close dialog and verify Temporary Project is restored and active
    await dialog.getByRole('button', { name: 'Done' }).click();
    await expect(sidepanelPage.locator('#workspace-heading')).toHaveText('Temporary Project');
    await expect(sidepanelPage.locator('#workspace-select')).toContainText('Temporary Project');
  });

  test('profile popover displays GitHub auth button with icon and last cloud sync status', async ({ sidepanelPage }) => {
    const profileBtn = sidepanelPage.locator('.profile-avatar-btn');
    await profileBtn.click();

    const popover = sidepanelPage.locator('.profile-popover');
    await expect(popover).toBeVisible();
    await expect(popover.locator('.btn-github')).toBeVisible();
    await expect(popover.locator('.btn-github svg')).toBeVisible();
    await expect(popover.locator('.profile-sync-card')).toContainText('Last cloud sync:');

    await popover.locator('.profile-popover-close').click();
    await expect(popover).not.toBeVisible();
  });

  test('saves formatted JSON only after an explicit workspace action', async ({ sidepanelPage }) => {
    await sidepanelPage.locator('.tab-item', { hasText: 'JSON', exact: true }).click();
    await sidepanelPage.locator('textarea.json-textarea').fill('{"workspace":true}');
    const saveButton = sidepanelPage.getByRole('button', { name: 'Save to workspace' });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await sidepanelPage.locator('.tab-item', { hasText: 'Workspace', exact: true }).click();
    await sidepanelPage.getByRole('tab', { name: /Saved Context/ }).click();
    await expect(sidepanelPage.locator('.workspace-items')).toContainText('JSON snippet');
    await expect(sidepanelPage.locator('.workspace-items')).toContainText('"workspace": true');
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
    await expect(sidepanelPage.locator('.tool-search-trigger')).toBeVisible();
    await expect(sidepanelPage.locator('.tab-label').first()).toBeHidden();
    await expect(sidepanelPage.locator('.tab-item').first()).toHaveAttribute('title', /Workspace/);
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
    await expect(switcher.locator('.tab-switcher-item').first().locator('.tab-switcher-details')).toBeVisible();
    await expect(switcher.locator('.tab-switcher-item').first().locator('.tab-switcher-actions')).toBeVisible();

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

  test('suggests a recently closed tab from browser history and reopens it', async ({
    context,
    extensionId,
    serverUrl,
  }) => {
    const historyPage = await context.newPage();
    await historyPage.goto(`${serverUrl}/history-search-fixture.html`);
    await expect(historyPage).toHaveTitle('hckr Closed History Search Fixture');
    const historyUrl = historyPage.url();
    await historyPage.close();

    const switcherPage = await context.newPage();
    await switcherPage.goto(
      `chrome-extension://${extensionId}/src/sidepanel/index.html?switcher=1`
    );
    await switcherPage.waitForLoadState('domcontentloaded');

    const search = switcherPage.getByRole('searchbox', { name: 'Search open tabs' });
    await search.fill('Closed History Search Fixture');
    const historySection = switcherPage.locator('.tab-switcher-section', { hasText: 'History' });
    await expect(historySection).toBeVisible();

    const historyRow = switcherPage.locator('.tab-switcher-item.history', {
      hasText: 'hckr Closed History Search Fixture',
    });
    await expect(historyRow).toBeVisible();
    await expect(historyRow.locator('.tab-switcher-url')).toContainText('127.0.0.1');
    await expect(historyRow.locator('.tab-switcher-visit-time')).toHaveText(/Visited/);

    const [reopenedPage] = await Promise.all([
      context.waitForEvent('page'),
      historyRow.click(),
    ]);
    await reopenedPage.waitForLoadState('domcontentloaded');
    await expect(reopenedPage).toHaveURL(historyUrl);

    await switcherPage.close();
    await reopenedPage.close();
  });
});
