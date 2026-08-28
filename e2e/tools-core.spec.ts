import { test, expect } from './fixtures';

test.describe('Core Tools Suite (JSON, Base64, UUID, Time, URL)', () => {
  test('JSON Formatter: formats valid JSON, shows errors on invalid JSON, and minifies', async ({
    sidepanelPage,
  }) => {
    await sidepanelPage.locator('.tab-item', { hasText: 'JSON' }).click();
    await expect(sidepanelPage.locator('.json-formatter')).toBeVisible();
    await expect(sidepanelPage.locator('.json-formatter .tool-split')).toBeVisible();

    const textarea = sidepanelPage.locator('textarea.json-textarea');

    // 1. Clear and enter invalid JSON
    await textarea.fill('{"invalid": json}');
    await expect(sidepanelPage.locator('.json-error-banner')).toBeVisible();

    // 2. Enter valid unformatted JSON
    await textarea.fill('{"foo":"bar","num":42,"list":[1,2,3]}');
    await expect(sidepanelPage.locator('.json-error-banner')).not.toBeVisible();

    // 3. Check syntax highlighted view or tree view
    const codeViewBtn = sidepanelPage.locator('button', { hasText: 'Code View' });
    if (await codeViewBtn.isVisible()) {
      await codeViewBtn.click();
    }
    await expect(sidepanelPage.locator('.json-output-content')).toContainText('foo');
    await expect(sidepanelPage.locator('.json-output-content')).toContainText('bar');
    await expect(sidepanelPage.locator('.json-output-content')).toContainText('42');

    // 4. Click Minify
    const minifyBtn = sidepanelPage.locator('button', { hasText: 'Minify' });
    await minifyBtn.click();
    await expect(sidepanelPage.locator('.json-output-content')).toContainText('{"foo":"bar","num":42,"list":[1,2,3]}');
  });

  test('Base64: encodes plain text and decodes base64 string', async ({ sidepanelPage }) => {
    await sidepanelPage.locator('.tab-item', { hasText: 'Base64' }).click();
    await expect(sidepanelPage.locator('.base64-tool')).toBeVisible();

    const textarea = sidepanelPage.locator('textarea.base64-textarea');

    // 1. Encode text
    const encodeTab = sidepanelPage.locator('button.toggle-btn', { hasText: 'Encode' });
    await encodeTab.click();
    await textarea.fill('Hello World!');

    // Output should be SGVsbG8gV29ybGQh
    await expect(sidepanelPage.locator('.base64-output-body')).toContainText('SGVsbG8gV29ybGQh');

    // 2. Decode text
    const decodeTab = sidepanelPage.locator('button.toggle-btn', { hasText: 'Decode' });
    await decodeTab.click();
    await textarea.fill('SGVsbG8gV29ybGQh');
    await expect(sidepanelPage.locator('.base64-output-body')).toContainText('Hello World!');
  });

  test('UUID / ULID Generator: generates valid UUID v4 and ULID batches', async ({
    sidepanelPage,
  }) => {
    await sidepanelPage.locator('.tab-item', { hasText: 'UUID' }).click();
    await expect(sidepanelPage.locator('.uuid-container')).toBeVisible();

    // Clear existing
    const clearBtn = sidepanelPage.locator('button[title="Clear all generated IDs"]');
    if (await clearBtn.isVisible() && await clearBtn.isEnabled()) {
      await clearBtn.click();
    }

    // 1. Generate 5 UUIDs
    const gen5Btn = sidepanelPage.getByRole('button', { name: '+ 5', exact: true });
    await gen5Btn.click();

    const uuidItems = sidepanelPage.locator('.uuid-item');
    await expect(uuidItems).toHaveCount(5);

    // Verify format of first UUID (8-4-4-4-12 hex)
    const firstUuid = await uuidItems.first().locator('.uuid-item-value').innerText();
    expect(firstUuid.trim()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    // 2. Switch to ULID mode
    const ulidModeBtn = sidepanelPage.locator('button.toggle-btn', { hasText: 'ULID' });
    await ulidModeBtn.click();

    if (await clearBtn.isVisible() && await clearBtn.isEnabled()) {
      await clearBtn.click();
    }
    const gen1Btn = sidepanelPage.getByRole('button', { name: '+ 1', exact: true });
    await gen1Btn.click();

    const ulidItems = sidepanelPage.locator('.uuid-item');
    const firstUlid = await ulidItems.first().locator('.uuid-item-value').innerText();
    expect(firstUlid.trim()).toHaveLength(26);
  });

  test('Timestamp Converter: auto-converts timestamp and displays multiple formats', async ({
    sidepanelPage,
  }) => {
    await sidepanelPage.locator('.tab-item', { hasText: 'Time' }).click();
    await expect(sidepanelPage.locator('.timestamp-container')).toBeVisible();

    // 1. Click Now button
    const nowBtn = sidepanelPage.locator('button', { hasText: 'Now' }).first();
    await nowBtn.click();

    // Verify timestamp rows exist
    await expect(sidepanelPage.locator('.timestamp-row')).toHaveCount(8);

    // 2. Enter specific epoch timestamp: 1700000000 (Nov 14, 2023)
    const input = sidepanelPage.locator('input.timestamp-input');
    await input.fill('1700000000');

    // Verify UTC output
    await expect(sidepanelPage.locator('.timestamp-container')).toContainText('2023-11-14T22:13:20.000Z');
    await expect(sidepanelPage.locator('.timestamp-container')).toContainText('1700000000000');
  });

  test('URL Encoder / Decoder: encodes and decodes query parameters and full URLs', async ({
    sidepanelPage,
  }) => {
    await sidepanelPage.locator('.tab-item', { hasText: 'URL' }).click();
    await expect(sidepanelPage.locator('.url-encoder')).toBeVisible();

    const textarea = sidepanelPage.locator('textarea.url-textarea');

    // 1. Encode mode
    const encodeBtn = sidepanelPage.locator('button.url-mode-btn', { hasText: 'Encode' });
    await encodeBtn.click();
    await textarea.fill('hello world & welcome = true');

    await expect(sidepanelPage.locator('.url-output-container')).toContainText('hello%20world%20%26%20welcome%20%3D%20true');

    // 2. Decode mode with full URL
    const decodeBtn = sidepanelPage.locator('button.url-mode-btn', { hasText: 'Decode' });
    await decodeBtn.click();
    await textarea.fill('https://example.com/search?q=developer+tools&category=extension#results');

    // Click Components view tab
    const componentsTab = sidepanelPage.locator('button.url-view-tab', { hasText: 'Components' });
    await componentsTab.click();

    // Check parsed table / breakdown
    await expect(sidepanelPage.locator('input.url-component-input').first()).toHaveValue('https:');
  });
});
