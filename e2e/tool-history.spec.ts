import { test, expect } from './fixtures';

test.describe('Tool Usage History & Cloud Sync', () => {
  test('records JSON formatting in history and restores it into editor via All History modal', async ({ sidepanelPage }) => {
    // Navigate to JSON formatter
    const jsonTab = sidepanelPage.locator('.tab-item', { hasText: 'JSON' });
    await jsonTab.click();

    // Click Sample button to load and format JSON
    await sidepanelPage.getByRole('button', { name: 'Sample' }).click();
    await expect(sidepanelPage.locator('.json-status-badge.valid')).toBeVisible();

    // Click Format button
    await sidepanelPage.getByRole('button', { name: 'Format', exact: true }).click();

    // Verify All History shortcut button in header
    const allHistoryBtn = sidepanelPage.getByRole('button', { name: 'All tools history' });
    await expect(allHistoryBtn).toBeVisible();

    // Open All History modal
    await allHistoryBtn.click();
    const modal = sidepanelPage.locator('.tool-history-modal');
    await expect(modal).toBeVisible();

    // History card should be displayed
    const historyCard = modal.locator('.tool-history-card').first();
    await expect(historyCard).toBeVisible();
    await expect(historyCard).toContainText('Format JSON');

    // Test search filter
    const searchInput = modal.locator('.tool-history-search-input');
    await searchInput.fill('hckr extension');
    await expect(historyCard).toBeVisible();

    // Test restore button
    const restoreBtn = historyCard.locator('.tool-history-restore-btn');
    await restoreBtn.click();

    // Should close modal and populate JSON editor
    await expect(modal).not.toBeVisible();
    await expect(sidepanelPage.locator('.json-textarea')).toHaveValue(/hckr extension/);
  });

  test('records YAML/JSON conversion history and allows reusing output in editor', async ({ sidepanelPage }) => {
    // Navigate to YAML tool
    await sidepanelPage.locator('.tab-item', { hasText: 'YAML' }).click();

    // Load sample YAML
    await sidepanelPage.getByRole('button', { name: 'Sample' }).click();

    // Wait briefly for debounced recordToolUsage
    await sidepanelPage.waitForTimeout(400);

    // Open All History modal
    const allHistoryBtn = sidepanelPage.getByRole('button', { name: 'All tools history' });
    await allHistoryBtn.click();

    const modal = sidepanelPage.locator('.tool-history-modal');
    await expect(modal).toBeVisible();

    const historyCard = modal.locator('.tool-history-card').first();
    await expect(historyCard).toBeVisible();
    await expect(historyCard).toContainText('YAML → JSON');
    await expect(historyCard).toContainText('hckr-api');

    // Test reuse output button
    const reuseOutputBtn = historyCard.locator('.tool-history-restore-output-btn');
    await expect(reuseOutputBtn).toBeVisible();
    await reuseOutputBtn.click();

    // Should close modal upon restore
    await expect(modal).not.toBeVisible();
  });

  test('opens All History modal, filters by tool, and supports saving to workspace and copying', async ({ sidepanelPage }) => {
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
    const firstCard = modal.locator('.tool-history-card').first();
    await expect(firstCard).toBeVisible();

    // Test Save to Workspace button
    const saveWsBtn = firstCard.locator('.tool-history-workspace-btn');
    await expect(saveWsBtn).toBeVisible();
    await saveWsBtn.click();

    // Toast notification should appear
    await expect(modal.locator('.tool-history-toast')).toBeVisible();
    await expect(modal.locator('.tool-history-toast')).toContainText(/Saved snippet to Workspace/i);

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

    // Open All History modal
    const allHistoryBtn = sidepanelPage.getByRole('button', { name: 'All tools history' });
    await allHistoryBtn.click();

    const modal = sidepanelPage.locator('.tool-history-modal');
    await expect(modal).toBeVisible();

    // The remote history entry should have merged into the local history!
    const historyCard = modal.locator('.tool-history-card', { hasText: 'cloud' });
    await expect(historyCard).toBeVisible();
    await expect(historyCard).toContainText('remote');
  });
});
