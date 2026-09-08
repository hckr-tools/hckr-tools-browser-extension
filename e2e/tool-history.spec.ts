import { test, expect } from './fixtures';

test.describe('Tool Usage History & Cloud Sync', () => {
  test('records JSON formatting in tool history tab and restores it into editor', async ({ sidepanelPage }) => {
    // Navigate to JSON formatter
    const jsonTab = sidepanelPage.locator('.tab-item', { hasText: 'JSON' });
    await jsonTab.click();

    // Verify view toggle is visible in header: [JSON] and [History]
    const toolTab = sidepanelPage.getByRole('tab', { name: 'JSON', exact: true });
    const historyTab = sidepanelPage.getByRole('tab', { name: /History/ });
    await expect(toolTab).toBeVisible();
    await expect(historyTab).toBeVisible();

    // Click Sample button to load and format JSON
    await sidepanelPage.getByRole('button', { name: 'Sample' }).click();
    await expect(sidepanelPage.locator('.json-status-badge.valid')).toBeVisible();

    // Click Format button
    await sidepanelPage.getByRole('button', { name: 'Format', exact: true }).click();

    // Verify history tab now displays count
    await expect(historyTab).toContainText('History');

    // Click on the History tab
    await historyTab.click();
    await expect(historyTab).toHaveAttribute('aria-selected', 'true');

    // History content should be displayed
    const historyView = sidepanelPage.locator('.tool-history-tab');
    await expect(historyView).toBeVisible();

    const historyCard = historyView.locator('.tool-history-tab-card').first();
    await expect(historyCard).toBeVisible();
    await expect(historyCard).toContainText('Format JSON');
    await expect(historyCard).toContainText('just now');

    // Test search filter
    const searchInput = historyView.locator('.tool-history-tab-search-input');
    await searchInput.fill('hckr extension');
    await expect(historyCard).toBeVisible();

    // Test restore button
    const restoreBtn = historyCard.locator('.tab-card-restore-btn');
    await restoreBtn.click();

    // Should switch back to tool editor tab
    await expect(toolTab).toHaveAttribute('aria-selected', 'true');
    await expect(sidepanelPage.locator('.json-textarea')).toHaveValue(/hckr extension/);
  });

  test('records YAML/JSON conversion history in its dedicated history tab', async ({ sidepanelPage }) => {
    // Navigate to YAML tool
    await sidepanelPage.locator('.tab-item', { hasText: 'YAML' }).click();

    const historyTab = sidepanelPage.getByRole('tab', { name: /History/ });
    await expect(historyTab).toBeVisible();

    // Load sample YAML
    await sidepanelPage.getByRole('button', { name: 'Sample' }).click();

    // Wait briefly for debounced recordToolUsage
    await sidepanelPage.waitForTimeout(400);

    // Switch to History tab
    await historyTab.click();
    const historyCard = sidepanelPage.locator('.tool-history-tab-card').first();
    await expect(historyCard).toBeVisible();
    await expect(historyCard).toContainText('YAML → JSON');
    await expect(historyCard).toContainText('hckr-api');
  });

  test('opens global All History modal and filters by tool', async ({ sidepanelPage }) => {
    // Navigate to JSON and format sample
    await sidepanelPage.locator('.tab-item', { hasText: 'JSON' }).click();
    await sidepanelPage.getByRole('button', { name: 'Sample' }).click();
    await sidepanelPage.getByRole('button', { name: 'Format', exact: true }).click();

    // Open global All History modal from header
    const allHistoryBtn = sidepanelPage.getByRole('button', { name: 'All tools history' });
    await expect(allHistoryBtn).toBeVisible();
    await allHistoryBtn.click();

    const modal = sidepanelPage.locator('.tool-history-modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.tool-history-title')).toContainText('Tool Usage History');

    // Check filter pills
    const allPill = modal.locator('.tool-history-filter-pill', { hasText: 'All' });
    await expect(allPill).toBeVisible();

    // Search in modal
    const modalSearch = modal.locator('.tool-history-search-input');
    await modalSearch.fill('hckr');
    await expect(modal.locator('.tool-history-card').first()).toBeVisible();

    // Close modal via Close button
    await modal.locator('.tool-history-close-btn').click();
    await expect(modal).not.toBeVisible();
  });

  test('syncs tool history bidirectionally via cloud sync outbox and snapshots', async ({ context, sidepanelPage }) => {
    const uploads: Array<Array<{ entity: string; operation: string; payload?: Record<string, unknown> }>> = [];

    const remoteHistoryEntry = {
      id: 'th-remote-12345',
      tool_id: 'json-formatter',
      tool_title: 'JSON Formatter',
      action: 'Format JSON',
      input: '{"remote": true, "cloud": "synced"}',
      output: '{\n  "remote": true,\n  "cloud": "synced"\n}',
      summary: '2 lines formatted',
      revision: 2,
      created_at: '2026-09-08T14:00:00.000Z',
      updated_at: '2026-09-08T14:00:00.000Z',
    };

    await context.route('**/rest/v1/rpc/hckr_sync_snapshot', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          workspaces: [],
          columns: [],
          cards: [],
          items: [],
          versions: [],
          tool_history: [remoteHistoryEntry],
        }),
      });
    });

    await context.route('**/rest/v1/rpc/hckr_apply_sync_batch', async (route) => {
      const body = route.request().postDataJSON() as { p_changes: Array<{ entity: string; operation: string }> };
      uploads.push(body.p_changes);
      await route.fulfill({ status: 204 });
    });

    await sidepanelPage.evaluate(async () => {
      await chrome.storage.local.set({
        hckr_cloud_session: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          userId: '00000000-0000-0000-0000-000000000001',
          email: 'cloud-history@example.test',
          expiresAt: Date.now() + 3_600_000,
        },
      });
    });

    await sidepanelPage.reload();

    // Trigger cloud sync
    const profileButton = sidepanelPage.locator('.profile-avatar-btn');
    await profileButton.click();
    await sidepanelPage.getByRole('button', { name: 'Sync now' }).click();

    // Go to JSON tool and inspect History tab
    await sidepanelPage.locator('.tab-item', { hasText: 'JSON' }).click();
    const historyTab = sidepanelPage.getByRole('tab', { name: /History/ });
    await historyTab.click();

    // The remote history entry should have merged into the local history tab!
    const historyCard = sidepanelPage.locator('.tool-history-tab-card', { hasText: 'cloud' });
    await expect(historyCard).toBeVisible();
    await expect(historyCard).toContainText('remote');
  });
});
