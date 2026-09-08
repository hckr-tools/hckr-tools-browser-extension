import { test, expect } from './fixtures';

test.describe('Cloud Sync', () => {
  test('pulls remote workspaces and uploads local dependencies in parent-first order', async ({ context, sidepanelPage }) => {
    const profileButton = sidepanelPage.locator('.profile-avatar-btn');
    await profileButton.click();
    const signInButton = sidepanelPage.getByRole('button', { name: 'Sign in with GitHub' });
    test.skip(await signInButton.isDisabled(), 'Cloud sync is not configured for this build.');
    await sidepanelPage.getByRole('button', { name: 'Close profile menu' }).click();

    const remoteWorkspace = {
      id: 'workspace-remote', name: 'Remote workspace', key: 'REMOTE', archived: false,
      revision: 3, created_at: '2026-09-08T12:00:00.000Z', updated_at: '2026-09-08T12:03:00.000Z',
    };
    const remoteColumn = {
      id: 'column-remote', workspace_id: remoteWorkspace.id, name: 'Inbox', position: 0,
      revision: 1, created_at: '2026-09-08T12:00:00.000Z', updated_at: '2026-09-08T12:00:00.000Z',
    };
    const snapshot = { workspaces: [remoteWorkspace], columns: [remoteColumn], cards: [], items: [], versions: [] };
    const uploads: Array<Array<{ entity: string; operation: string }>> = [];

    await context.route('**/rest/v1/rpc/hckr_sync_snapshot', async (route) => {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(snapshot) });
    });
    await context.route('**/rest/v1/rpc/hckr_apply_sync_batch', async (route) => {
      const body = route.request().postDataJSON() as { p_changes: Array<{ entity: string; operation: string }> };
      uploads.push(body.p_changes);
      await route.fulfill({ status: 204 });
    });

    await sidepanelPage.evaluate(async () => {
      await chrome.storage.local.set({
        hckr_cloud_session: {
          accessToken: 'test-access-token', refreshToken: 'test-refresh-token', userId: '00000000-0000-0000-0000-000000000001',
          email: 'sync-test@example.test', expiresAt: Date.now() + 3_600_000,
        },
      });
    });
    await sidepanelPage.reload();
    await profileButton.click();
    await sidepanelPage.getByRole('button', { name: 'Sync now' }).click();

    await expect.poll(() => uploads.length).toBeGreaterThan(0);
    for (const batch of uploads) {
      const entities = batch.map((change) => change.entity);
      expect(entities).toContain('workspace');
      expect(entities).toContain('board_columns');
      const lastWorkspaceIndex = entities.lastIndexOf('workspace');
      const firstColumnIndex = entities.indexOf('board_columns');
      expect(lastWorkspaceIndex).toBeLessThan(firstColumnIndex);
    }
    await expect(sidepanelPage.locator('#workspace-select')).toContainText('Remote workspace');
  });

  test('renders GitHub profile avatar, link, and relative sync time', async ({ sidepanelPage }) => {
    await sidepanelPage.evaluate(async () => {
      await chrome.storage.local.set({
        hckr_cloud_session: {
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          userId: '00000000-0000-0000-0000-000000000001',
          email: 'octocat@github.com',
          expiresAt: Date.now() + 3_600_000,
          userName: 'octocat',
          displayName: 'The Octocat',
          avatarUrl: 'https://avatars.githubusercontent.com/u/583231?v=4',
        },
      });

      const openReq = indexedDB.open('hckr-workspaces-v1', 3);
      await new Promise<void>((resolve, reject) => {
        openReq.onupgradeneeded = () => {
          const db = openReq.result;
          for (const store of ['workspaces', 'columns', 'cards', 'items', 'versions', 'outbox', 'settings', 'tool_history']) {
            if (!db.objectStoreNames.contains(store)) {
              db.createObjectStore(store, { keyPath: 'id' });
            }
          }
        };
        openReq.onsuccess = () => {
          const db = openReq.result;
          const tx = db.transaction('settings', 'readwrite');
          tx.objectStore('settings').put({
            id: 'cloud-sync',
            value: { lastSyncAt: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
          });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
        openReq.onerror = () => reject(openReq.error);
      });
    });
    await sidepanelPage.reload();

    // Check bottom rail shows relative time and avatar img
    const avatarImg = sidepanelPage.locator('.profile-avatar-img');
    await expect(avatarImg).toBeVisible();
    await expect(avatarImg).toHaveAttribute('src', 'https://avatars.githubusercontent.com/u/583231?v=4');
    await expect(sidepanelPage.locator('.status-indicator')).toContainText('Synced 2m ago');

    // Open profile popover
    await sidepanelPage.locator('.profile-avatar-btn').click();
    await expect(sidepanelPage.locator('.profile-popover-name')).toHaveText('The Octocat');
    const ghLink = sidepanelPage.locator('.profile-github-link');
    await expect(ghLink).toContainText('@octocat');
    await expect(ghLink).toHaveAttribute('href', 'https://github.com/octocat');
    await expect(sidepanelPage.locator('.profile-sync-time')).toContainText('Synced 2m ago');
  });

  test('renders relative time in card details and comments', async ({ sidepanelPage }) => {
    // Create a new card to test timestamps
    await sidepanelPage.getByRole('button', { name: '+ New card' }).click();
    const drawer = sidepanelPage.locator('.workspace-card-drawer');
    await expect(drawer).toBeVisible();

    await drawer.locator('#card-title-input').fill('Test Relative Time');
    await drawer.getByRole('button', { name: 'Create card' }).click();
    await expect(drawer).not.toBeVisible();

    // Open card to view details
    await sidepanelPage.locator('.workspace-card-title-btn', { hasText: 'Test Relative Time' }).click();
    await expect(drawer).toBeVisible();

    // Drawer meta info contains relative time
    const metaInfo = drawer.locator('.drawer-meta-info');
    await expect(metaInfo).toContainText('Created:');
    await expect(metaInfo).toContainText('Updated:');
    await expect(metaInfo).toContainText('just now');

    // Add a comment and verify relative time
    const commentInput = drawer.locator('#card-comment-input');
    await commentInput.fill('Testing relative timestamp');
    await drawer.getByRole('button', { name: 'Comment' }).click();

    const commentTime = drawer.locator('.card-comment-time').first();
    await expect(commentTime).toContainText('just now');

    await drawer.getByRole('button', { name: 'Close card details' }).click();
  });

  test('automatically refreshes expired JWT token and retries sync seamlessly', async ({ context, sidepanelPage }) => {
    let snapshotCalls = 0;
    let refreshCalls = 0;

    await context.route('**/rest/v1/rpc/hckr_sync_snapshot', async (route) => {
      snapshotCalls++;
      if (snapshotCalls === 1) {
        // First attempt fails with 401 JWT expired (PGRST303)
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ code: 'PGRST303', message: 'JWT expired' }),
        });
      } else {
        // After refresh, succeeds with valid snapshot
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ workspaces: [], columns: [], cards: [], items: [], versions: [] }),
        });
      }
    });

    await context.route('**/rest/v1/rpc/hckr_apply_sync_batch', async (route) => {
      await route.fulfill({ status: 204 });
    });

    await context.route('**/auth/v1/token?grant_type=refresh_token', async (route) => {
      refreshCalls++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'refreshed-jwt-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
          user: {
            id: '00000000-0000-0000-0000-000000000001',
            email: 'refreshed-user@example.test',
            user_metadata: {
              avatar_url: 'https://avatars.githubusercontent.com/u/583231?v=4',
              user_name: 'refresheduser',
              full_name: 'Refreshed User',
            },
          },
        }),
      });
    });

    await sidepanelPage.evaluate(async () => {
      await chrome.storage.local.set({
        hckr_cloud_session: {
          accessToken: 'expired-access-token',
          refreshToken: 'valid-refresh-token',
          userId: '00000000-0000-0000-0000-000000000001',
          email: 'refreshed-user@example.test',
          expiresAt: Date.now() - 1000, // expired
        },
      });
    });
    await sidepanelPage.reload();

    const profileButton = sidepanelPage.locator('.profile-avatar-btn');
    await profileButton.click();
    await sidepanelPage.getByRole('button', { name: 'Sync now' }).click();

    // Verify token refresh was invoked and sync succeeded without error
    await expect.poll(() => refreshCalls).toBeGreaterThan(0);
    await expect.poll(() => snapshotCalls).toBeGreaterThanOrEqual(2);

    // No error box should be present
    await expect(sidepanelPage.locator('.profile-popover-error')).not.toBeVisible();
    await expect(sidepanelPage.locator('.profile-sync-time')).toContainText('Synced just now');
  });
});
