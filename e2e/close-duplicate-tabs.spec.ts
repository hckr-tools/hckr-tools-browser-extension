import { test, expect } from './fixtures';

test.describe('Close Duplicate Tabs Feature', () => {
  test('detects and closes duplicate tabs in TabsNavigator tool', async ({
    sidepanelPage,
    context,
    serverUrl,
  }) => {
    // Open two duplicate pages
    const page1 = await context.newPage();
    await page1.goto(serverUrl);
    await expect(page1).toHaveTitle('hckr Test Fixture Page');

    const page2 = await context.newPage();
    await page2.goto(serverUrl);
    await expect(page2).toHaveTitle('hckr Test Fixture Page');

    await sidepanelPage.bringToFront();

    // Navigate to Tabs tool
    const tabsTab = sidepanelPage.locator('.tab-item', { hasText: 'Tabs' });
    await tabsTab.click();
    await expect(sidepanelPage.locator('.tabs-navigator')).toBeVisible();

    // Verify duplicate button shows count (at least 1 duplicate for the 2 duplicate pages)
    const closeDupesBtn = sidepanelPage.locator('.tabs-close-duplicates-button');
    await expect(closeDupesBtn).toBeVisible();
    await expect(closeDupesBtn).toBeEnabled();
    await expect(closeDupesBtn).toHaveText(/Close duplicates \(\d+\)/);

    // Verify duplicate badge is visible on the duplicate item
    const duplicateBadge = sidepanelPage.locator('.browser-tab-duplicate');
    await expect(duplicateBadge.first()).toBeVisible();

    // Click Close duplicates button
    await closeDupesBtn.click();

    // Verify success status message appears
    const successMsg = sidepanelPage.locator('.tabs-message.tabs-success');
    await expect(successMsg).toBeVisible();
    await expect(successMsg).toContainText(/Closed \d+ duplicate tab/);

    // Verify duplicate button is now disabled
    await expect(closeDupesBtn).toBeDisabled();

    // Clean up remaining page
    await page1.close().catch(() => undefined);
    await page2.close().catch(() => undefined);
  });

  test('detects and closes duplicate tabs inside tab search (TabSwitcher)', async ({
    sidepanelPage,
    context,
    serverUrl,
  }) => {
    // Open two duplicate pages
    const page1 = await context.newPage();
    await page1.goto(serverUrl);
    await expect(page1).toHaveTitle('hckr Test Fixture Page');

    const page2 = await context.newPage();
    await page2.goto(serverUrl);
    await expect(page2).toHaveTitle('hckr Test Fixture Page');

    await sidepanelPage.bringToFront();

    // Open Tab Switcher using hotkey
    await sidepanelPage.keyboard.press('Control+K');
    const switcher = sidepanelPage.getByRole('dialog', { name: 'hckr-tools tab switcher' });
    await expect(switcher).toBeVisible();

    // Verify button inside tab search wrap is visible
    const switcherDupesBtn = switcher.locator('.tab-switcher-close-duplicates-btn');
    await expect(switcherDupesBtn).toBeVisible();
    await expect(switcherDupesBtn).toHaveText(/Close duplicates \(\d+\)/);

    // Verify duplicate badge is visible on tab switcher items
    const switcherBadge = switcher.locator('.tab-switcher-badge.duplicate');
    await expect(switcherBadge.first()).toBeVisible();

    // Click Close duplicates button
    await switcherDupesBtn.click();

    // Verify status message is shown in tab switcher
    const statusBar = switcher.locator('.tab-switcher-status-bar');
    await expect(statusBar).toBeVisible();
    await expect(statusBar).toContainText(/Closed \d+ duplicate tab/);

    // Button should now be gone because duplicates are 0
    await expect(switcherDupesBtn).toBeHidden();

    // Clean up
    await page1.close().catch(() => undefined);
    await page2.close().catch(() => undefined);
  });
});
