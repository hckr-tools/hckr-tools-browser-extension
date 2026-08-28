import { test, expect } from './fixtures';
import { readFileSync } from 'node:fs';

test.describe('Advanced Tools Suite (JWT, Hash, Regex, Data, Diff, Markdown)', () => {
  test('JWT Decoder: decodes valid and expired JWT tokens and shows claims', async ({
    sidepanelPage,
  }) => {
    await sidepanelPage.locator('.tab-item', { hasText: 'JWT' }).click();
    await expect(sidepanelPage.locator('.jwt-decoder')).toBeVisible();

    // Sample valid JWT
    const sampleJwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE5MTYyMzkwMjJ9.4pcPyMD09olUV_AlzA51NN4jGsacEzppmQ85TBRRF60';

    const textarea = sidepanelPage.locator('textarea.jwt-textarea');
    await textarea.fill(sampleJwt);

    // Check payload content and status badge
    await expect(sidepanelPage.locator('.payload-section')).toContainText('John Doe');
    await expect(sidepanelPage.locator('.jwt-status-badge')).toBeVisible();
  });

  test('Hash Generator: computes multiple cryptographic hashes simultaneously', async ({
    sidepanelPage,
  }) => {
    await sidepanelPage.locator('.tab-item', { hasText: 'Hash' }).click();
    await expect(sidepanelPage.locator('.hash-generator')).toBeVisible();

    const textarea = sidepanelPage.locator('textarea.hash-input-textarea');
    await textarea.fill('hello');

    // SHA-256 for "hello" is 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
    const sha256Card = sidepanelPage.locator('.hash-card', { hasText: 'SHA-256' });
    await expect(sha256Card.locator('.hash-value-display')).toContainText(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
      { timeout: 5000 }
    );

    // SHA-1 for "hello" is aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d
    const sha1Card = sidepanelPage.locator('.hash-card', { hasText: 'SHA-1' });
    await expect(sha1Card.locator('.hash-value-display')).toContainText(
      'aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d'
    );

    // Toggle Uppercase
    const upperToggle = sidepanelPage.locator('button.toggle-btn', { hasText: 'UPPERCASE' });
    if (await upperToggle.isVisible()) {
      await upperToggle.click();
      await expect(sha256Card.locator('.hash-value-display')).toContainText(
        '2CF24DBA5FB0A30E26E83B2AC5B9E29E1B161E5C1FA7425E73043362938B9824'
      );
    }
  });

  test('Regex Tester: highlights matches, captures groups, and displays counts', async ({
    sidepanelPage,
  }) => {
    await sidepanelPage.locator('.tab-item', { hasText: 'Regex' }).click();
    await expect(sidepanelPage.locator('.regex-tester')).toBeVisible();

    const patternInput = sidepanelPage.locator('input#regex-pattern-field');
    const testStringTextarea = sidepanelPage.locator('textarea.regex-textarea');

    await patternInput.fill('[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}');
    await testStringTextarea.fill('Send emails to test@example.com or dev@hckr.dev please.');

    // Expect matches found status
    await expect(sidepanelPage.locator('.regex-match-status')).toContainText('2 matches found');
  });

  test('Data workspace generates an editable tabular email dataset', async ({
    sidepanelPage,
  }) => {
    await sidepanelPage.locator('.tab-item', { hasText: 'Data' }).click();
    await expect(sidepanelPage.locator('.dummy-data-tool')).toBeVisible();

    const emailsBtn = sidepanelPage.locator('button.dummy-type-btn', { hasText: 'Emails' });
    await emailsBtn.click();

    await sidepanelPage.locator('input.data-count-input').fill('5');

    const generateBtn = sidepanelPage.getByRole('button', { name: 'Generate 5 rows' });
    await generateBtn.click();

    const items = sidepanelPage.locator('.data-table tbody tr');
    await expect(items).toHaveCount(5);
    const firstEmail = await items.first().locator('td').innerText();
    expect(firstEmail).toContain('@');
  });

  test('Data workspace exports and reads back an Avro dataset', async ({ sidepanelPage }) => {
    await sidepanelPage.locator('.tab-item', { hasText: 'Data' }).click();
    await sidepanelPage.locator('input.data-count-input').fill('2');
    await sidepanelPage.getByRole('button', { name: 'Generate 2 rows' }).click();

    const avroDownloadPromise = sidepanelPage.waitForEvent('download');
    await sidepanelPage.getByRole('button', { name: '↓ AVRO' }).click();
    const avroDownload = await avroDownloadPromise;
    expect(avroDownload.suggestedFilename()).toBe('generated-data.avro');

    await sidepanelPage.getByRole('button', { name: 'Read files' }).click();
    const avroPath = await avroDownload.path();
    expect(avroPath).not.toBeNull();
    await sidepanelPage.locator('input.data-file-input').setInputFiles({
      name: 'generated-data.avro',
      mimeType: 'application/avro',
      buffer: readFileSync(avroPath!),
    });
    await expect(sidepanelPage.locator('.data-file-summary')).toContainText('Avro');
    await expect(sidepanelPage.locator('.data-table tbody tr')).toHaveCount(2);

  });

  test('Diff Checker: computes line-by-line diff between original and modified text', async ({
    sidepanelPage,
  }) => {
    await sidepanelPage.locator('.tab-item', { hasText: 'Diff' }).click();
    await expect(sidepanelPage.locator('.diff-checker-tool')).toBeVisible();

    const textareas = sidepanelPage.locator('textarea.diff-textarea');
    await textareas.nth(0).fill('line 1\nline 2\nline 3');
    await textareas.nth(1).fill('line 1\nline 2 modified\nline 3\nline 4 added');

    // Click Compare Diff button if available
    const compareBtn = sidepanelPage.locator('button', { hasText: 'Compare Diff' });
    if (await compareBtn.isVisible()) {
      await compareBtn.click();
    }

    // Verify added and removed diff lines exist
    await expect(sidepanelPage.locator('.diff-row-added').first()).toBeVisible();
    await expect(sidepanelPage.locator('.diff-row-removed').first()).toBeVisible();
  });

  test('Markdown Preview: parses markdown formatting and toggles preview views', async ({
    sidepanelPage,
  }) => {
    await sidepanelPage.locator('.tab-item', { hasText: 'MD' }).click();
    await expect(sidepanelPage.locator('.md-tool-root')).toBeVisible();
    await expect(sidepanelPage.locator('.md-workspace-split')).toHaveCSS('flex-direction', 'row');

    const editor = sidepanelPage.locator('textarea.md-textarea');
    await editor.fill('# Hello HCKR\n\nThis is **bold** and *italic* text with `code`.');

    // Check preview rendering
    const previewPane = sidepanelPage.locator('.md-rendered-content');
    await expect(previewPane.locator('h1')).toHaveText('Hello HCKR');
    await expect(previewPane.locator('strong').first()).toHaveText('bold');
    await expect(previewPane.locator('em').first()).toHaveText('italic');
    await expect(previewPane.locator('code').first()).toHaveText('code');
  });

  test('Tabs navigator: lists open tabs and filters by title', async ({
    sidepanelPage,
    context,
    serverUrl,
  }) => {
    const fixturePage = await context.newPage();
    await fixturePage.goto(serverUrl);
    await expect(fixturePage).toHaveTitle('hckr Test Fixture Page');

    await sidepanelPage.locator('.tab-item', { hasText: 'Tabs' }).click();
    await expect(sidepanelPage.locator('.tabs-navigator')).toBeVisible();

    const filter = sidepanelPage.getByRole('searchbox', { name: 'Filter open tabs' });
    await expect(filter).toBeVisible();
    await expect(sidepanelPage.locator('.browser-tab', { hasText: 'hckr Test Fixture Page' })).toBeVisible();

    await filter.fill('hckr Test Fixture Page');
    await expect(sidepanelPage.locator('.browser-tab')).toHaveCount(1);
    await expect(sidepanelPage.locator('.browser-tab-title')).toHaveText('hckr Test Fixture Page');
    await expect(sidepanelPage.locator('.browser-tab-url')).toContainText('127.0.0.1');

    await sidepanelPage.locator('.browser-tab', { hasText: 'hckr Test Fixture Page' }).click();
    await expect.poll(async () => fixturePage.evaluate(() => document.visibilityState)).toBe('visible');
    await sidepanelPage.bringToFront();

    await filter.fill('zzzz-no-such-tab');
    await expect(sidepanelPage.locator('.browser-tab')).toHaveCount(0);
    await expect(sidepanelPage.locator('.tabs-message')).toContainText('No tabs match');

    await fixturePage.close();
  });

  test('Tabs navigator: lists tabs in last-used order', async ({
    sidepanelPage,
    context,
    serverUrl,
  }) => {
    const firstPage = await context.newPage();
    await firstPage.goto(serverUrl);
    await firstPage.evaluate(() => {
      document.title = 'MRU First Tab';
    });
    await expect(firstPage).toHaveTitle('MRU First Tab');

    const secondPage = await context.newPage();
    await secondPage.goto(serverUrl);
    await secondPage.evaluate(() => {
      document.title = 'MRU Second Tab';
    });
    await expect(secondPage).toHaveTitle('MRU Second Tab');

    await firstPage.bringToFront();
    await secondPage.bringToFront();
    await sidepanelPage.bringToFront();

    await sidepanelPage.locator('.tab-item', { hasText: 'Tabs' }).click();
    const titles = sidepanelPage.locator('.browser-tab-title');
    await expect.poll(async () => titles.allTextContents()).toEqual(
      expect.arrayContaining(['MRU Second Tab', 'MRU First Tab'])
    );
    const listed = await titles.allTextContents();
    expect(listed.indexOf('MRU Second Tab')).toBeLessThan(listed.indexOf('MRU First Tab'));

    await firstPage.close();
    await secondPage.close();
  });
});
